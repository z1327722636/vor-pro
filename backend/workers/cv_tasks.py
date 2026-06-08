import asyncio
from pathlib import Path

from app.config import get_settings
from app.db import AsyncSessionLocal
from app.enums import JobStatus
from app.models.job import Job
from valorant_cv.triplet_extractor import extract_triplets as extract_video_triplets
from workers.celery_app import celery_app
from workers.vlm_tasks import parse_lineup

PROJECT_ROOT = Path(__file__).resolve().parents[2]
FRAME_ROOT = PROJECT_ROOT / "storage" / "frames"


async def _update_job(
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


@celery_app.task(name="workers.cv_tasks.extract_triplets")
def extract_triplets(job_id: int, video_path: str | None = None) -> dict[str, object]:
    if video_path is None:
        asyncio.run(_update_job(job_id, JobStatus.FAILED, 1.0, error_code="MISSING_VIDEO_PATH", error_message="缺少本地视频文件"))
        return {"job_id": job_id, "status": "missing_video_path"}

    settings = get_settings()
    output_dir = FRAME_ROOT / str(job_id)
    try:
        asyncio.run(_update_job(job_id, JobStatus.CV_FILTER, 0.35, {"message": "正在抽取投掷三联帧"}))
        triplets = extract_video_triplets(video_path, output_dir=output_dir.as_posix())
        limited_triplets = triplets
        if settings.max_auto_triplets_per_job > 0:
            limited_triplets = triplets[: settings.max_auto_triplets_per_job]
        serialized = [triplet.__dict__ for triplet in limited_triplets]
        if not serialized:
            asyncio.run(_update_job(
                job_id,
                JobStatus.FAILED,
                1.0,
                {"message": "未检测到可解析的投掷瞬间"},
                "NO_TRIPLETS_DETECTED",
                "没有从视频中检测到可解析的站位/瞄准/落点三联帧。",
            ))
            return {"job_id": job_id, "status": "no_triplets", "triplets": []}

        asyncio.run(_update_job(
            job_id,
            JobStatus.VLM_PARSE,
            0.55,
            {
                "triplets": serialized,
                "detected_count": len(triplets),
                "used_count": len(serialized),
                "message": "三联帧抽取完成，已进入 VLM 识别。",
            },
        ))
        async_result = parse_lineup.delay(job_id, serialized)
        return {
            "job_id": job_id,
            "status": "done",
            "detected_count": len(triplets),
            "used_count": len(serialized),
            "vlm_task_id": async_result.id,
        }
    except Exception as exc:
        asyncio.run(_update_job(job_id, JobStatus.FAILED, 1.0, error_code="CV_EXTRACT_FAILED", error_message=str(exc)))
        return {"job_id": job_id, "status": "failed", "error": str(exc)}
