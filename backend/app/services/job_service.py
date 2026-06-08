from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.enums import JobSource, JobStatus
from app.models.job import Job
from app.models.user import User
from app.schemas.job import JobCreate
from workers.download_tasks import download_video
from workers.search_tasks import search_videos


async def create_job(db: AsyncSession, payload: JobCreate, user: User | None) -> Job:
    job = Job(
        user_id=user.id if user else None,
        source_type=payload.source_type,
        source_url=payload.source_url,
        keyword=payload.keyword,
        status=JobStatus.PENDING,
        progress=0.0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    if not get_settings().worker_enqueue_enabled:
        job.status = JobStatus.FAILED
        job.progress = 1.0
        job.error_code = "WORKER_DISABLED"
        job.error_message = "本地未启用 Celery worker 入队；已创建任务记录，但自动解析流水线未运行。"
        job.result = {"message": "设置 WORKER_ENQUEUE_ENABLED=true 并启动 Redis/Celery worker 后可启用自动解析。"}
        await db.commit()
        await db.refresh(job)
        return job

    try:
        if payload.source_type == JobSource.KEYWORD:
            async_result = search_videos.delay(job.id, payload.keyword)
            job.result = {"celery_task_id": async_result.id, "message": "关键词搜索任务已入队"}
        else:
            async_result = download_video.delay(job.id, payload.source_url)
            job.status = JobStatus.DOWNLOADING
            job.progress = 0.05
            job.result = {"celery_task_id": async_result.id, "message": "视频下载任务已入队"}
    except Exception as exc:
        job.status = JobStatus.FAILED
        job.progress = 1.0
        job.error_code = "TASK_ENQUEUE_FAILED"
        job.error_message = str(exc)

    await db.commit()
    await db.refresh(job)
    return job
