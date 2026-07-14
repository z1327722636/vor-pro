from pydantic import BaseModel, Field

from app.enums import MapName, Side, ThrowType


class VideoSessionCreate(BaseModel):
    source_url: str | None = Field(default=None, max_length=2000)


class ExternalVideoResolveRequest(BaseModel):
    source_url: str = Field(min_length=1, max_length=2000)


class ExternalVideoResolveResponse(BaseModel):
    playable_url: str
    title: str | None = None
    duration_seconds: float | None = None


class FrameTimestamps(BaseModel):
    standing: int = Field(ge=0)
    aim: int = Field(ge=0)
    landing: int = Field(ge=0)


class FrameNodeSubmit(BaseModel):
    timestamp_ms: int = Field(ge=0)
    note: str = ""
    order_index: int = Field(ge=0)


class ManualLineupForm(BaseModel):
    map: MapName
    agent: str
    side: Side
    ability: str
    throw_type: ThrowType
    site: str = "a"
    standing_description: str = ""
    aim_description: str = ""
    landing_description: str = ""
    minimap_x: float | None = Field(default=None, ge=0.0, le=1.0)
    minimap_y: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_x: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_y: float | None = Field(default=None, ge=0.0, le=1.0)


class ManualImageSubmit(BaseModel):
    image_base64: str = Field(min_length=1)
    filename: str | None = Field(default=None, max_length=255)
    note: str = Field(default="", max_length=1200)


class ManualJsonUploadRequest(BaseModel):
    form: ManualLineupForm
    images: list[ManualImageSubmit] = Field(min_length=1, max_length=20)


class VideoFrameSubmit(BaseModel):
    source_url: str | None = Field(default=None, max_length=2000)
    timestamps: FrameTimestamps
    form: ManualLineupForm
    frame_nodes: list[FrameNodeSubmit] = Field(default_factory=list, max_length=20)


class CorrectionSessionResponse(BaseModel):
    video_url: str | None
    original_timestamps: FrameTimestamps
    original_form: ManualLineupForm
