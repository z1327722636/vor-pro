from datetime import datetime

from pydantic import BaseModel, Field

from app.enums import JobSource, JobStatus


class JobCreate(BaseModel):
    source_type: JobSource
    source_url: str | None = Field(default=None, max_length=2000)
    keyword: str | None = Field(default=None, max_length=255)


class VideoSearchRequest(BaseModel):
    keyword: str = Field(min_length=1, max_length=255)
    limit: int = Field(default=20, ge=1, le=50)


class VideoSearchItem(BaseModel):
    platform: str
    url: str
    title: str | None = None
    uploader: str | None = None


class VideoSearchResponse(BaseModel):
    keyword: str
    results: list[VideoSearchItem]


class JobResponse(BaseModel):
    id: int
    source_type: JobSource
    source_url: str | None
    keyword: str | None
    status: JobStatus
    progress: float
    error_code: str | None
    error_message: str | None
    result: dict | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
