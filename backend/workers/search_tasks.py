import asyncio

from app.db import AsyncSessionLocal
from app.enums import JobStatus
from app.models.job import Job
from app.services.external_video import search_external_videos
from workers.celery_app import celery_app


async def _update_job(
    job_id: int,
    status: JobStatus,
    progress: float,
    result: dict | None = None,
    error_message: str | None = None,
) -> None:
    async with AsyncSessionLocal() as db:
        job = await db.get(Job, job_id)
        if job is None:
            return
        job.status = status
        job.progress = progress
        job.result = result
        job.error_message = error_message
        job.error_code = "KEYWORD_SEARCH_FAILED" if error_message else None
        await db.commit()


@celery_app.task(name="workers.search_tasks.search_videos")
def search_videos(job_id: int, keyword: str | None = None, limit: int = 20) -> dict[str, object]:
    if not keyword:
        asyncio.run(_update_job(job_id, JobStatus.FAILED, 1.0, error_message="缺少关键词"))
        return {"job_id": job_id, "status": "missing_keyword", "results": []}

    try:
        results = asyncio.run(search_external_videos(keyword, limit))
    except Exception as exc:
        asyncio.run(_update_job(job_id, JobStatus.FAILED, 1.0, error_message=str(exc)))
        return {"job_id": job_id, "status": "failed", "results": [], "error": str(exc)}

    result = {"results": results, "message": "关键词搜索完成；批量下载解析尚未接入。"}
    asyncio.run(_update_job(job_id, JobStatus.DONE, 1.0, result=result))
    return {"job_id": job_id, "status": "done", "results": results}
