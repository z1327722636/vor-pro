from datetime import datetime
from pathlib import Path

from pydantic import BaseModel, Field

from app.enums import LineupSource, MapName, Side, ThrowType
from app.models.lineup import Lineup


PROJECT_ROOT = Path(__file__).resolve().parents[3]
STORAGE_ROOT = PROJECT_ROOT / "storage"
UPLOAD_ROOT = STORAGE_ROOT / "uploads"
FRAME_ROOT = STORAGE_ROOT / "frames"


class LineupCreate(BaseModel):
    map: MapName
    agent: str
    side: Side
    ability: str
    throw_type: ThrowType
    site: str = "a"
    standing_frame_id: int | None = None
    aim_frame_id: int | None = None
    landing_frame_id: int | None = None
    standing_description: str = ""
    aim_description: str = ""
    landing_description: str = ""
    minimap_x: float | None = Field(default=None, ge=0.0, le=1.0)
    minimap_y: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_x: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_y: float | None = Field(default=None, ge=0.0, le=1.0)
    source_type: LineupSource = LineupSource.AI_AUTO
    dedup_hash: str


class AdminLineupCreate(BaseModel):
    map: MapName
    agent: str
    side: Side
    ability: str
    throw_type: ThrowType
    site: str = "a"
    standing_frame_id: int | None = None
    aim_frame_id: int | None = None
    landing_frame_id: int | None = None
    standing_description: str = ""
    aim_description: str = ""
    landing_description: str = ""
    source_type: LineupSource = LineupSource.USER_MANUAL_UPLOAD
    dedup_hash: str | None = None
    original_video_url: str | None = None
    original_video_timestamp_ms: int | None = None
    minimap_x: float | None = Field(default=None, ge=0.0, le=1.0)
    minimap_y: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_x: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_y: float | None = Field(default=None, ge=0.0, le=1.0)
    is_hidden: bool = False


class AdminLineupUpdate(BaseModel):
    map: MapName | None = None
    agent: str | None = None
    side: Side | None = None
    ability: str | None = None
    throw_type: ThrowType | None = None
    site: str | None = None
    standing_frame_id: int | None = None
    aim_frame_id: int | None = None
    landing_frame_id: int | None = None
    standing_description: str | None = None
    aim_description: str | None = None
    landing_description: str | None = None
    source_type: LineupSource | None = None
    dedup_hash: str | None = None
    original_video_url: str | None = None
    original_video_timestamp_ms: int | None = None
    minimap_x: float | None = Field(default=None, ge=0.0, le=1.0)
    minimap_y: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_x: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_y: float | None = Field(default=None, ge=0.0, le=1.0)
    is_hidden: bool | None = None


class AdminLineupBulkUpdate(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)
    is_hidden: bool


class AdminLineupBulkDelete(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


class UserLineupUpdate(BaseModel):
    map: MapName | None = None
    agent: str | None = None
    side: Side | None = None
    ability: str | None = None
    throw_type: ThrowType | None = None
    site: str | None = None
    standing_description: str | None = None
    aim_description: str | None = None
    landing_description: str | None = None
    original_video_url: str | None = None
    original_video_timestamp_ms: int | None = None
    minimap_x: float | None = Field(default=None, ge=0.0, le=1.0)
    minimap_y: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_x: float | None = Field(default=None, ge=0.0, le=1.0)
    landing_y: float | None = Field(default=None, ge=0.0, le=1.0)
    is_hidden: bool | None = None


class UserLineupBulkUpdate(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)
    is_hidden: bool


class UserLineupBulkDelete(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=500)


class LineupStepResponse(BaseModel):
    id: int | None = None
    title: str
    image_path: str | None = None
    note: str = ""
    order_index: int


class LineupResponse(BaseModel):
    id: int
    map: MapName
    agent: str
    side: Side
    ability: str
    throw_type: ThrowType
    site: str = "a"
    source_type: LineupSource
    standing_description: str
    aim_description: str
    landing_description: str
    standing_image_path: str | None = None
    aim_image_path: str | None = None
    landing_image_path: str | None = None
    steps: list[LineupStepResponse] = Field(default_factory=list)
    corrected_from_id: int | None = None
    original_video_url: str | None = None
    original_video_timestamp_ms: int | None = None
    minimap_x: float | None = None
    minimap_y: float | None = None
    landing_x: float | None = None
    landing_y: float | None = None
    likes_count: int
    reports_count: int
    is_hidden: bool
    created_at: datetime

    model_config = {"from_attributes": True}


def _public_upload_path(image_path: str | None) -> str | None:
    if not image_path:
        return None

    normalized = image_path.replace("\\", "/")
    if normalized.startswith("/uploads/"):
        return normalized

    path = Path(image_path)
    for root, prefix in ((UPLOAD_ROOT, "/uploads"), (FRAME_ROOT, "/frames")):
        try:
            relative = path.resolve().relative_to(root.resolve())
            return f"{prefix}/{relative.as_posix()}"
        except ValueError:
            continue

    parts = path.parts
    if "uploads" in parts:
        relative = Path(*parts[parts.index("uploads") + 1 :])
        return f"/uploads/{relative.as_posix()}"
    if "frames" in parts:
        relative = Path(*parts[parts.index("frames") + 1 :])
        return f"/frames/{relative.as_posix()}"

    return f"/uploads/{path.name}"


def _legacy_steps(
    lineup: Lineup,
    standing_path: str | None,
    aim_path: str | None,
    landing_path: str | None,
) -> list[LineupStepResponse]:
    candidates = [
        ("站位", standing_path, lineup.standing_description),
        ("瞄准", aim_path, lineup.aim_description),
        ("落点", landing_path, lineup.landing_description),
    ]
    return [
        LineupStepResponse(title=title, image_path=image_path, note=note or "", order_index=index)
        for index, (title, image_path, note) in enumerate(candidates)
        if image_path or note
    ]


def lineup_response(lineup: Lineup) -> LineupResponse:
    standing_frame = lineup.__dict__.get("standing_frame")
    aim_frame = lineup.__dict__.get("aim_frame")
    landing_frame = lineup.__dict__.get("landing_frame")
    standing_path = _public_upload_path(standing_frame.image_path if standing_frame else None)
    aim_path = _public_upload_path(aim_frame.image_path if aim_frame else None)
    landing_path = _public_upload_path(landing_frame.image_path if landing_frame else None)
    step_models = lineup.__dict__.get("steps") or []
    steps = [
        LineupStepResponse(
            id=step.id,
            title=f"步骤 {step.order_index + 1}",
            image_path=_public_upload_path(step.image_path),
            note=step.note or "",
            order_index=step.order_index,
        )
        for step in step_models
    ] or _legacy_steps(lineup, standing_path, aim_path, landing_path)
    return LineupResponse(
        id=lineup.id,
        map=lineup.map,
        agent=lineup.agent,
        side=lineup.side,
        ability=lineup.ability,
        throw_type=lineup.throw_type,
        site=lineup.site,
        source_type=lineup.source_type,
        standing_description=lineup.standing_description,
        aim_description=lineup.aim_description,
        landing_description=lineup.landing_description,
        standing_image_path=standing_path,
        aim_image_path=aim_path,
        landing_image_path=landing_path,
        steps=steps,
        corrected_from_id=lineup.corrected_from_id,
        original_video_url=lineup.original_video_url,
        original_video_timestamp_ms=lineup.original_video_timestamp_ms,
        minimap_x=lineup.minimap_x,
        minimap_y=lineup.minimap_y,
        landing_x=lineup.landing_x,
        landing_y=lineup.landing_y,
        likes_count=lineup.likes_count,
        reports_count=lineup.reports_count,
        is_hidden=lineup.is_hidden,
        created_at=lineup.created_at,
    )
