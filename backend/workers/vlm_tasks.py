import asyncio
from typing import Any

from sqlalchemy import select

from app.config import get_settings
from app.db import AsyncSessionLocal
from app.enums import FrameRole, FrameSource, JobStatus, LineupSource, MapName, Side, ThrowType
from app.models.frame import Frame
from app.models.job import Job
from app.models.lineup import Lineup
from app.models.video import Video
from app.services.lineup_dedup import build_lineup_dedup_hash
from valorant_vlm.client import VLMClient
from valorant_vlm.lineup_parser import parse_triplet_lineup
from workers.celery_app import celery_app


def _normalise(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("/", "_")


def _infer_title_hints(context: str) -> tuple[str | None, str | None]:
    lowered = context.lower()
    compact = lowered.replace(" ", "")
    map_hint = "haven" if "隐世修所" in context or "haven" in lowered else None
    agent_hint = "kayo" if any(token in compact for token in ("k/o", "kay/o", "kayo", "ko")) else None
    return map_hint, agent_hint


def _api_key() -> str | None:
    settings = get_settings()
    return settings.dashscope_api_key or settings.openai_api_key


async def _mark_job(
    job_id: int,
    status: JobStatus,
    progress: float,
    result: dict | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return
        job.status = status
        job.progress = progress
        if result is not None:
            job.result = result
        job.error_code = error_code
        job.error_message = error_message
        await db.commit()


async def _job_context(job_id: int) -> str:
    async with AsyncSessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return ""
        title = (job.result or {}).get("title") if isinstance(job.result, dict) else None
        if not title and job.video_id:
            video = await db.get(Video, job.video_id)
            title = video.title if video else None
        parts = []
        if title:
            parts.append(f"Video title: {title}")
        if job.source_url:
            parts.append(f"Source URL: {job.source_url}")
        return "\n".join(parts)


async def _persist_lineup(job_id: int, triplet: dict[str, Any], parsed: Any, index: int) -> int | None:
    async with AsyncSessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return None

        standing = Frame(
            video_id=job.video_id,
            timestamp_ms=max(int(triplet.get("throw_timestamp_ms", 0)) - 1800, 0),
            role=FrameRole.STANDING,
            source=FrameSource.AUTO,
            image_path=str(triplet["standing_path"]),
        )
        aim = Frame(
            video_id=job.video_id,
            timestamp_ms=int(triplet.get("throw_timestamp_ms", 0)),
            role=FrameRole.AIM,
            source=FrameSource.AUTO,
            image_path=str(triplet["aim_path"]),
        )
        landing = Frame(
            video_id=job.video_id,
            timestamp_ms=int(triplet.get("throw_timestamp_ms", 0)) + 2500,
            role=FrameRole.LANDING,
            source=FrameSource.AUTO,
            image_path=str(triplet["landing_path"]),
        )
        db.add_all([standing, aim, landing])
        await db.flush()

        map_name = MapName(parsed.map)
        side = Side(parsed.side)
        throw_type = ThrowType(parsed.throw_type)
        agent = _normalise(parsed.agent)
        ability = _normalise(parsed.ability)
        dedup_hash = build_lineup_dedup_hash(
            map_name.value,
            agent,
            side.value,
            ability,
            str(triplet["standing_path"]),
        )
        exists = await db.execute(select(Lineup.id).where(Lineup.dedup_hash == dedup_hash))
        existing_id = exists.scalar_one_or_none()
        if existing_id is not None:
            await db.rollback()
            return existing_id

        lineup = Lineup(
            video_id=job.video_id,
            map=map_name,
            agent=agent,
            side=side,
            ability=ability,
            throw_type=throw_type,
            site="a",
            standing_frame_id=standing.id,
            aim_frame_id=aim.id,
            landing_frame_id=landing.id,
            standing_description=parsed.standing_description,
            aim_description=parsed.aim_description,
            landing_description=parsed.landing_description,
            source_type=LineupSource.AI_AUTO,
            dedup_hash=dedup_hash,
            confidence=float(parsed.confidence) * float(triplet.get("confidence", 1.0)),
            original_video_timestamp_ms=int(triplet.get("throw_timestamp_ms", 0)),
            original_video_url=job.source_url,
        )
        db.add(lineup)
        await db.commit()
        await db.refresh(lineup)
        return lineup.id


async def _update_done(job_id: int, lineup_ids: list[int], errors: list[dict[str, str]]) -> None:
    status = JobStatus.DONE if lineup_ids else JobStatus.FAILED
    error_code = None if lineup_ids else "VLM_PARSE_FAILED"
    error_message = None if lineup_ids else "VLM 没有成功解析出 Lineup。"
    await _mark_job(
        job_id,
        status,
        1.0,
        {
            "lineup_ids": lineup_ids,
            "errors": errors,
            "message": f"已生成 {len(lineup_ids)} 条 AI Lineup。" if lineup_ids else "未生成 AI Lineup。",
        },
        error_code,
        error_message,
    )


@celery_app.task(name="workers.vlm_tasks.parse_lineup")
def parse_lineup(job_id: int, triplets: list[dict[str, Any]] | None = None) -> dict[str, object]:
    if not triplets:
        asyncio.run(_mark_job(job_id, JobStatus.FAILED, 1.0, error_code="MISSING_TRIPLETS", error_message="缺少待识别的三联帧"))
        return {"job_id": job_id, "status": "missing_triplets"}

    key = _api_key()
    if not key:
        asyncio.run(_mark_job(job_id, JobStatus.FAILED, 1.0, error_code="MISSING_VLM_API_KEY", error_message="缺少 VLM API Key"))
        return {"job_id": job_id, "status": "missing_vlm_api_key"}

    settings = get_settings()
    client = VLMClient(model=settings.litellm_model, api_key=key)
    job_context = asyncio.run(_job_context(job_id))
    map_hint, agent_hint = _infer_title_hints(job_context)
    if map_hint or agent_hint:
        job_context = f"{job_context}\nKnown title hints: map={map_hint or 'unknown'}, agent={agent_hint or 'unknown'}. Prefer these hints unless the frames clearly contradict them."
    lineup_ids: list[int] = []
    errors: list[dict[str, str]] = []

    for index, triplet in enumerate(triplets):
        try:
            progress = 0.55 + (0.4 * index / max(len(triplets), 1))
            asyncio.run(_mark_job(job_id, JobStatus.VLM_PARSE, progress, {"message": f"正在识别第 {index + 1}/{len(triplets)} 组三联帧"}))
            parsed = parse_triplet_lineup(
                str(triplet["standing_path"]),
                str(triplet["aim_path"]),
                str(triplet["landing_path"]),
                client,
                context=job_context,
            )
            updates = {}
            if map_hint:
                updates["map"] = map_hint
            if agent_hint:
                updates["agent"] = agent_hint
            if updates:
                parsed = parsed.model_copy(update=updates)
            lineup_id = asyncio.run(_persist_lineup(job_id, triplet, parsed, index))
            if lineup_id is not None:
                lineup_ids.append(lineup_id)
        except Exception as exc:
            detail = str(exc)
            last_attempt = getattr(exc, "last_attempt", None)
            if last_attempt is not None:
                last_error = last_attempt.exception()
                if last_error is not None:
                    detail = f"{type(last_error).__name__}: {last_error}"
            errors.append({"index": str(index), "error": detail})

    unique_lineup_ids = list(dict.fromkeys(lineup_ids))
    asyncio.run(_update_done(job_id, unique_lineup_ids, errors))
    return {"job_id": job_id, "status": "done" if unique_lineup_ids else "failed", "lineup_ids": unique_lineup_ids, "errors": errors}
