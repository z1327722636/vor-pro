import asyncio
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.db import AsyncSessionLocal
from app.enums import JobStatus
from app.models.job import Job
from app.models.video import Video
from workers.celery_app import celery_app
from workers.cv_tasks import extract_triplets

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VIDEO_ROOT = PROJECT_ROOT / "storage" / "videos"


def _platform_from_url(url: str) -> str:
    lowered = url.lower()
    if "bilibili.com" in lowered or "b23.tv" in lowered:
        return "bilibili"
    if "douyin.com" in lowered:
        return "douyin"
    if "tiktok.com" in lowered:
        return "tiktok"
    return "unknown"


def _download_with_ytdlp(source_url: str, output_dir: Path) -> tuple[dict[str, Any], Path]:
    from yt_dlp import YoutubeDL

    settings = get_settings()
    output_dir.mkdir(parents=True, exist_ok=True)
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://www.bilibili.com/",
    }
    if settings.bilibili_sessdata and _platform_from_url(source_url) == "bilibili":
        headers["Cookie"] = f"SESSDATA={settings.bilibili_sessdata}"

    options: dict[str, Any] = {
        "format": "bv*+ba/best[ext=mp4]/best",
        "merge_output_format": "mp4",
        "noplaylist": True,
        "outtmpl": str(output_dir / "%(id)s.%(ext)s"),
        "quiet": True,
        "no_warnings": True,
        "http_headers": headers,
    }
    with YoutubeDL(options) as ydl:
        info = ydl.extract_info(source_url, download=True)

    candidates: list[Path] = []
    for item in info.get("requested_downloads") or []:
        path = item.get("filepath") or item.get("_filename")
        if path:
            candidates.append(Path(path))
    if info.get("filepath"):
        candidates.append(Path(info["filepath"]))
    if info.get("_filename"):
        candidates.append(Path(info["_filename"]))
    candidates.extend(sorted(output_dir.glob("*"), key=lambda item: item.stat().st_mtime, reverse=True))

    for candidate in candidates:
        if candidate.is_file() and candidate.stat().st_size > 0:
            return info, candidate
    raise FileNotFoundError("视频下载完成但没有找到本地视频文件")


async def _mark_job_failed(job_id: int, error_code: str, error_message: str) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return
        job.status = JobStatus.FAILED
        job.progress = 1.0
        job.error_code = error_code
        job.error_message = error_message
        await db.commit()


async def _mark_job_downloaded(
    job_id: int,
    source_url: str,
    info: dict[str, Any],
    video_path: Path,
) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return
        video = Video(
            platform=_platform_from_url(source_url),
            url=source_url,
            uploader=info.get("uploader") or info.get("channel") or info.get("creator"),
            title=info.get("title"),
            duration_ms=int(float(info["duration"]) * 1000) if info.get("duration") else None,
            raw_path=video_path.as_posix(),
        )
        db.add(video)
        await db.flush()
        job.video_id = video.id
        job.status = JobStatus.CV_FILTER
        job.progress = 0.25
        job.error_code = None
        job.error_message = None
        job.result = {
            "video_id": video.id,
            "video_path": video_path.as_posix(),
            "title": video.title,
            "message": "视频已下载，已进入视觉关键帧抽取。",
        }
        await db.commit()


@celery_app.task(name="workers.download_tasks.download_video")
def download_video(job_id: int, source_url: str | None = None) -> dict[str, object]:
    if source_url is None:
        asyncio.run(_mark_job_failed(job_id, "MISSING_SOURCE_URL", "缺少视频链接"))
        return {"job_id": job_id, "status": "missing_source_url"}

    output_dir = VIDEO_ROOT / str(job_id)
    try:
        info, video_path = _download_with_ytdlp(source_url, output_dir)
        asyncio.run(_mark_job_downloaded(job_id, source_url, info, video_path))
        async_result = extract_triplets.delay(job_id, video_path.as_posix())
        return {
            "job_id": job_id,
            "status": "downloaded",
            "source_url": source_url,
            "video_path": video_path.as_posix(),
            "cv_task_id": async_result.id,
        }
    except Exception as exc:
        asyncio.run(_mark_job_failed(job_id, "VIDEO_DOWNLOAD_FAILED", str(exc)))
        return {"job_id": job_id, "status": "failed", "source_url": source_url, "error": str(exc)}
