"""
用户视频解析关键帧任务。

入口：grab_user_frames(session_id)
流程：
1. 从 Job.result 读出用户提交的 VideoFrameSubmit（form + frame_nodes/timestamps）。
2. 根据 Job.source_url 反查已经被 resolve 下载到本地的 mp4 文件。
3. 对每个 frame_node 的 timestamp_ms 调 ffmpeg 抽出 1 张 jpg。
4. 通过 create_manual_lineup_with_steps 写入数据库。
5. 更新 Job 状态。

第一性原理选择：
- 抽帧直接 subprocess 调 ffmpeg，是业界最稳的做法；Python 库（imageio/opencv）
  在容器/ARM 上经常踩 codec 坑，没必要。
- 用 -ss INPUT 模式（在 -i 前面）做关键帧粗定位，再用 -ss OUTPUT 模式精确到毫秒。
  对单帧抽图来说，单 -ss INPUT 已经足够准（容器内 ffmpeg 通常会做精确 seek）。
- 一次 ffmpeg 调用抽一帧。多个节点串行调用，简单。如果未来节点多到要性能优化，
  再换成单次复杂 filter_complex；现在不优化。
"""
from __future__ import annotations

import asyncio
import hashlib
import shutil
import subprocess
from pathlib import Path

from loguru import logger
from sqlalchemy import select

from app.db import AsyncSessionLocal
from app.enums import JobStatus, LineupSource, MapName, Side, ThrowType
from app.models.job import Job
from app.schemas.manual import ManualLineupForm, VideoFrameSubmit
from app.services.manual_service import (
    UPLOAD_ROOT,
    create_manual_lineup_with_steps,
)
from app.services.video_resolver import find_local_video
from workers.celery_app import celery_app


FRAMES_ROOT = UPLOAD_ROOT / "video_frames"
FRAMES_ROOT.mkdir(parents=True, exist_ok=True)


async def _set_failed(session_id: int, code: str, message: str) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(Job, session_id)
        if job is None:
            return
        job.status = JobStatus.FAILED
        job.progress = 1.0
        job.error_code = code
        job.error_message = message
        await db.commit()
    logger.error("frame_pick session={} failed code={} msg={}", session_id, code, message)


def _ffmpeg_extract_frame(video_path: Path, timestamp_ms: int, output_path: Path) -> None:
    """抽 1 帧到 output_path。失败抛 RuntimeError，调用方负责写 Job.error。"""
    seconds = max(timestamp_ms, 0) / 1000.0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg",
        "-y",
        "-ss",
        f"{seconds:.3f}",
        "-i",
        str(video_path),
        "-frames:v",
        "1",
        "-q:v",
        "2",  # JPEG 质量，2 是高质量
        "-loglevel",
        "error",
        str(output_path),
    ]
    completed = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if completed.returncode != 0 or not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError(
            f"ffmpeg 抽帧失败 ts={timestamp_ms}ms rc={completed.returncode}: "
            f"{completed.stderr.strip()[:300]}"
        )


def _normalize_form(raw_form: dict) -> ManualLineupForm:
    """前端表单字段是字符串，统一转成枚举/规范化大小写。"""
    return ManualLineupForm(
        map=MapName(raw_form["map"]) if not isinstance(raw_form.get("map"), MapName) else raw_form["map"],
        agent=str(raw_form.get("agent", "")).lower(),
        side=Side(raw_form["side"]) if not isinstance(raw_form.get("side"), Side) else raw_form["side"],
        ability=str(raw_form.get("ability", "")).lower(),
        throw_type=ThrowType(raw_form["throw_type"])
        if not isinstance(raw_form.get("throw_type"), ThrowType)
        else raw_form["throw_type"],
        site=str(raw_form.get("site", "a")).lower(),
        standing_description=str(raw_form.get("standing_description", "")),
        aim_description=str(raw_form.get("aim_description", "")),
        landing_description=str(raw_form.get("landing_description", "")),
    )


async def _process(session_id: int) -> dict[str, int | str]:
    if shutil.which("ffmpeg") is None:
        await _set_failed(
            session_id,
            "FFMPEG_NOT_FOUND",
            "服务器未安装 ffmpeg，无法抽帧",
        )
        return {"session_id": session_id, "status": "failed"}

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Job).where(Job.id == session_id))
        job = result.scalar_one_or_none()
        if job is None:
            logger.error("frame_pick job not found: {}", session_id)
            return {"session_id": session_id, "status": "not_found"}

        if not job.result:
            await _set_failed(session_id, "EMPTY_PAYLOAD", "提交内容为空")
            return {"session_id": session_id, "status": "failed"}
        if not job.source_url:
            await _set_failed(session_id, "NO_SOURCE_URL", "未提供视频源 URL")
            return {"session_id": session_id, "status": "failed"}

        try:
            submit = VideoFrameSubmit.model_validate(job.result)
        except Exception as exc:
            await _set_failed(session_id, "INVALID_PAYLOAD", f"提交内容格式错误：{exc}")
            return {"session_id": session_id, "status": "failed"}

        video_path = find_local_video(job.source_url)
        if video_path is None:
            await _set_failed(
                session_id,
                "VIDEO_NOT_RESOLVED",
                "未找到已解析的视频文件，请先在前端调用解析接口",
            )
            return {"session_id": session_id, "status": "failed"}

        # 节点优先用 frame_nodes，没有就退化用旧的三段式 timestamps
        nodes = submit.frame_nodes
        if not nodes:
            ts = submit.timestamps
            from app.schemas.manual import FrameNodeSubmit

            nodes = [
                FrameNodeSubmit(timestamp_ms=ts.standing, note=submit.form.standing_description, order_index=0),
                FrameNodeSubmit(timestamp_ms=ts.aim, note=submit.form.aim_description, order_index=1),
                FrameNodeSubmit(timestamp_ms=ts.landing, note=submit.form.landing_description, order_index=2),
            ]
        nodes = sorted(nodes, key=lambda n: n.order_index)
        timestamps = [node.timestamp_ms for node in nodes]
        if len(timestamps) > 1 and len(set(timestamps)) != len(timestamps):
            await _set_failed(
                session_id,
                "DUPLICATE_FRAME_TIMESTAMPS",
                "多个帧节点时间相同，请在不同画面重新标记后再保存",
            )
            return {"session_id": session_id, "status": "failed"}

        # 抽帧
        steps: list[tuple[str, str]] = []
        url_hash = hashlib.sha1(job.source_url.encode("utf-8")).hexdigest()[:10]
        try:
            for idx, node in enumerate(nodes):
                out_file = FRAMES_ROOT / f"session_{session_id}_{url_hash}_{idx}_{node.timestamp_ms}.jpg"
                _ffmpeg_extract_frame(video_path, node.timestamp_ms, out_file)
                steps.append((out_file.as_posix(), node.note))
        except RuntimeError as exc:
            await _set_failed(session_id, "FFMPEG_FAILED", str(exc))
            return {"session_id": session_id, "status": "failed"}

        # 写 Lineup
        try:
            form = _normalize_form(
                submit.form.model_dump() if hasattr(submit.form, "model_dump") else dict(submit.form)
            )
            lineup = await create_manual_lineup_with_steps(
                db,
                user_id=job.user_id,
                form=form,
                steps=steps,
                source_type=LineupSource.USER_MANUAL_VIDEO,
                original_video_url=job.source_url,
                original_video_timestamp_ms=nodes[0].timestamp_ms if nodes else None,
            )
        except Exception as exc:
            logger.exception("create_manual_lineup_with_steps failed")
            await _set_failed(session_id, "DB_WRITE_FAILED", f"写入 Lineup 失败：{exc}")
            return {"session_id": session_id, "status": "failed"}

        # 标记 Job 成功
        job.status = JobStatus.DONE
        job.progress = 1.0
        job.error_code = None
        job.error_message = None
        merged_result = dict(job.result or {})
        merged_result["lineup_id"] = lineup.id
        merged_result["frame_paths"] = [path for path, _ in steps]
        job.result = merged_result
        await db.commit()

    logger.info("frame_pick session={} done lineup_id={}", session_id, lineup.id)
    return {"session_id": session_id, "status": "done", "lineup_id": lineup.id}


@celery_app.task(name="workers.frame_pick_tasks.grab_user_frames")
def grab_user_frames(session_id: int) -> dict[str, int | str]:
    return asyncio.run(_process(session_id))


async def grab_user_frames_inline(session_id: int) -> dict[str, int | str]:
    """供 dev 环境同步直跑用，绕开 Celery。"""
    return await _process(session_id)
