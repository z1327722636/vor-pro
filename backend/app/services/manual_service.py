import hashlib
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import set_committed_value

from app.enums import FrameRole, FrameSource, LineupSource
from app.models.frame import Frame
from app.models.lineup import Lineup
from app.models.lineup_step import LineupStep
from app.schemas.manual import ManualLineupForm

PROJECT_ROOT = Path(__file__).resolve().parents[3]
UPLOAD_ROOT = PROJECT_ROOT / "storage" / "uploads"


async def save_upload(file: UploadFile, prefix: str) -> str:
    suffix = Path(file.filename or "frame.jpg").suffix or ".jpg"
    data = await file.read()
    digest = hashlib.sha256(data).hexdigest()[:16]
    path = UPLOAD_ROOT / f"{prefix}_{digest}{suffix}"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path.as_posix()


async def create_manual_lineup(
    db: AsyncSession,
    user_id: int,
    form: ManualLineupForm,
    standing_path: str,
    aim_path: str,
    landing_path: str,
    source_type: LineupSource,
    corrected_from_id: int | None = None,
    correction_version: int = 1,
) -> Lineup:
    standing = Frame(
        role=FrameRole.STANDING,
        source=FrameSource.USER_UPLOADED,
        image_path=standing_path,
    )
    aim = Frame(role=FrameRole.AIM, source=FrameSource.USER_UPLOADED, image_path=aim_path)
    landing = Frame(
        role=FrameRole.LANDING,
        source=FrameSource.USER_UPLOADED,
        image_path=landing_path,
    )
    db.add_all([standing, aim, landing])
    await db.flush()
    dedup_raw = "|".join(
        [str(form.map), form.agent.lower(), str(form.side), form.ability.lower(), standing_path]
    )
    lineup = Lineup(
        map=form.map,
        agent=form.agent.lower(),
        side=form.side,
        ability=form.ability.lower(),
        throw_type=form.throw_type,
        site=form.site,
        standing_frame_id=standing.id,
        aim_frame_id=aim.id,
        landing_frame_id=landing.id,
        standing_description=form.standing_description,
        aim_description=form.aim_description,
        landing_description=form.landing_description,
        minimap_x=form.minimap_x,
        minimap_y=form.minimap_y,
        landing_x=form.landing_x,
        landing_y=form.landing_y,
        source_type=source_type,
        author_user_id=user_id,
        corrected_from_id=corrected_from_id,
        correction_version=correction_version,
        dedup_hash=hashlib.sha256(dedup_raw.encode("utf-8")).hexdigest(),
    )
    lineup.standing_frame = standing
    lineup.aim_frame = aim
    lineup.landing_frame = landing
    db.add(lineup)
    await db.commit()
    await db.refresh(lineup)
    lineup.standing_frame = standing
    lineup.aim_frame = aim
    lineup.landing_frame = landing
    return lineup


async def create_manual_lineup_with_steps(
    db: AsyncSession,
    user_id: int,
    form: ManualLineupForm,
    steps: list[tuple[str, str]],
    source_type: LineupSource,
    original_video_url: str | None = None,
    original_video_timestamp_ms: int | None = None,
) -> Lineup:
    first_path = steps[0][0]
    dedup_raw = "|".join(
        [
            str(form.map),
            form.site,
            form.agent.lower(),
            str(form.side),
            form.ability.lower(),
            first_path,
        ]
    )
    lineup = Lineup(
        map=form.map,
        agent=form.agent.lower(),
        side=form.side,
        ability=form.ability.lower(),
        throw_type=form.throw_type,
        site=form.site,
        standing_description=steps[0][1] if len(steps) > 0 else "",
        aim_description=steps[1][1] if len(steps) > 1 else "",
        landing_description=steps[2][1] if len(steps) > 2 else "",
        minimap_x=form.minimap_x,
        minimap_y=form.minimap_y,
        landing_x=form.landing_x,
        landing_y=form.landing_y,
        source_type=source_type,
        author_user_id=user_id,
        original_video_url=original_video_url,
        original_video_timestamp_ms=original_video_timestamp_ms,
        corrected_from_id=corrected_from_id,
        correction_version=correction_version,
        dedup_hash=hashlib.sha256(dedup_raw.encode("utf-8")).hexdigest(),
    )
    db.add(lineup)
    await db.flush()

    lineup_steps = [
        LineupStep(lineup_id=lineup.id, image_path=image_path, note=note, order_index=index)
        for index, (image_path, note) in enumerate(steps)
    ]
    db.add_all(lineup_steps)
    await db.commit()
    await db.refresh(lineup)
    set_committed_value(lineup, "steps", lineup_steps)
    return lineup
