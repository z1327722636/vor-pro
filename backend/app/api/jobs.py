from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.models.job import Job
from app.schemas.job import JobCreate, JobResponse, VideoSearchRequest, VideoSearchResponse
from app.services.external_video import search_external_videos
from app.services.job_service import create_job

router = APIRouter()


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def submit_job(payload: JobCreate, db: DbSession, current_user: CurrentUser) -> JobResponse:
    job = await create_job(db, payload, current_user)
    return JobResponse.model_validate(job)


@router.post("/search-videos", response_model=VideoSearchResponse)
async def search_videos(payload: VideoSearchRequest, _current_user: CurrentUser) -> VideoSearchResponse:
    keyword = payload.keyword.strip()
    if not keyword:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Keyword is required",
        )
    results = await search_external_videos(keyword, limit=payload.limit)
    return VideoSearchResponse(keyword=keyword, results=results)


@router.get("", response_model=list[JobResponse])
async def list_jobs(
    db: DbSession,
    current_user: CurrentUser,
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[JobResponse]:
    result = await db.execute(
        select(Job).where(Job.user_id == current_user.id).order_by(Job.created_at.desc()).limit(limit).offset(offset)
    )
    return [JobResponse.model_validate(job) for job in result.scalars().all()]


@router.get("/{job_id}", response_model=JobResponse)
async def read_job(job_id: int, db: DbSession, current_user: CurrentUser) -> JobResponse:
    result = await db.execute(select(Job).where(Job.id == job_id, Job.user_id == current_user.id))
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return JobResponse.model_validate(job)
