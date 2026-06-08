from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from kombu.exceptions import OperationalError
from loguru import logger
from sqlalchemy import select

from app.config import get_settings
from app.crud.lineups import get_lineup
from app.deps import CurrentUser, DbSession
from app.enums import JobSource, JobStatus, LineupSource, MapName, Side, ThrowType
from app.models.job import Job
from app.schemas.lineup import LineupResponse, lineup_response
from app.schemas.manual import (
    CorrectionSessionResponse,
    ExternalVideoResolveRequest,
    ExternalVideoResolveResponse,
    FrameTimestamps,
    ManualLineupForm,
    VideoFrameSubmit,
    VideoSessionCreate,
)
from app.services.manual_service import (
    create_manual_lineup,
    create_manual_lineup_with_steps,
    save_upload,
)
from app.services.video_resolver import resolve_external_video
from workers.frame_pick_tasks import grab_user_frames, grab_user_frames_inline


async def _enqueue_frame_grab(session_id: int) -> None:
    """根据配置同步执行或 Celery 入队。"""
    settings = get_settings()
    if not settings.worker_enqueue_enabled:
        await grab_user_frames_inline(session_id)
        return

    try:
        grab_user_frames.delay(session_id)
    except OperationalError as exc:
        if settings.app_env != "development":
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Frame grab queue unavailable",
            ) from exc
        logger.warning("Celery unavailable in development, running frame grab inline: {}", exc)
        await grab_user_frames_inline(session_id)

router = APIRouter()


def build_form(
    map: MapName,
    agent: str,
    side: Side,
    ability: str,
    throw_type: ThrowType,
    site: str,
    standing_description: str,
    aim_description: str,
    landing_description: str,
) -> ManualLineupForm:
    return ManualLineupForm(
        map=map,
        agent=agent,
        side=side,
        ability=ability,
        throw_type=throw_type,
        site=site,
        standing_description=standing_description,
        aim_description=aim_description,
        landing_description=landing_description,
    )


@router.post(
    "/lineups/manual-upload",
    response_model=LineupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def manual_upload(
    db: DbSession,
    current_user: CurrentUser,
    images: list[UploadFile] | None = File(default=None),
    notes: list[str] | None = Form(default=None),
    standing: UploadFile | None = File(default=None),
    aim: UploadFile | None = File(default=None),
    landing: UploadFile | None = File(default=None),
    map: MapName = Form(...),
    agent: str = Form(...),
    side: Side = Form(...),
    ability: str = Form(...),
    throw_type: ThrowType = Form(...),
    site: str = Form("a"),
    standing_description: str = Form(""),
    aim_description: str = Form(""),
    landing_description: str = Form(""),
) -> LineupResponse:
    form = build_form(
        map,
        agent,
        side,
        ability,
        throw_type,
        site,
        standing_description,
        aim_description,
        landing_description,
    )

    if images:
        if len(images) > 20:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="最多上传 20 张步骤图")
        step_notes = notes or []
        saved_steps = []
        for index, image in enumerate(images):
            note = step_notes[index] if index < len(step_notes) else ""
            image_path = await save_upload(image, f"lineup_step_{index + 1}")
            saved_steps.append((image_path, note))
        lineup = await create_manual_lineup_with_steps(
            db,
            current_user.id,
            form,
            saved_steps,
            LineupSource.USER_MANUAL_UPLOAD,
        )
        return lineup_response(lineup)

    if not standing or not aim or not landing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请至少上传一张步骤图")

    standing_path = await save_upload(standing, "standing")
    aim_path = await save_upload(aim, "aim")
    landing_path = await save_upload(landing, "landing")
    lineup = await create_manual_lineup(
        db,
        current_user.id,
        form,
        standing_path,
        aim_path,
        landing_path,
        LineupSource.USER_MANUAL_UPLOAD,
    )
    return lineup_response(lineup)


@router.post("/manual/video-sessions", status_code=status.HTTP_201_CREATED)
async def create_video_session(
    payload: VideoSessionCreate,
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, int | str | None]:
    job = Job(
        user_id=current_user.id,
        source_type=JobSource.VIDEO_FRAME_PICK,
        source_url=payload.source_url,
        status=JobStatus.AWAIT_USER_PICK,
        progress=0.0,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return {"session_id": job.id, "video_url": payload.source_url}


@router.post("/manual/external-video/resolve", response_model=ExternalVideoResolveResponse)
async def resolve_external_video_endpoint(
    payload: ExternalVideoResolveRequest,
    current_user: CurrentUser,  # 仅用于鉴权，登录态由 deps 强制
) -> ExternalVideoResolveResponse:
    """把 B 站 / 抖音等视频页 URL 解析成站内可播放的本地直链。

    解析是同步的（视频通常几十~几百 MB），客户端应展示 loading。
    同一 BVID 已下载过会直接命中缓存，第二次毫秒级返回。
    """
    _ = current_user  # 强制登录
    try:
        resolved = await resolve_external_video(payload.source_url)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    return ExternalVideoResolveResponse(
        playable_url=resolved.url,
        title=resolved.title,
        duration_seconds=resolved.duration_seconds,
    )


@router.post("/manual/video-sessions/{session_id}/submit", status_code=status.HTTP_202_ACCEPTED)
async def submit_video_session(
    session_id: int,
    payload: VideoFrameSubmit,
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, int | str]:
    result = await db.execute(
        select(Job).where(Job.id == session_id, Job.user_id == current_user.id)
    )
    job = result.scalar_one_or_none()
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Video session not found")
    job.status = JobStatus.FRAME_GRAB
    job.result = payload.model_dump(mode="json")
    await db.commit()
    await _enqueue_frame_grab(session_id)
    return {"session_id": session_id, "status": "frame_grab_queued"}


@router.post("/lineups/{lineup_id}/correction-session", response_model=CorrectionSessionResponse)
async def create_correction_session(
    lineup_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> CorrectionSessionResponse:
    lineup = await get_lineup(db, lineup_id)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    if not lineup.standing_frame or not lineup.aim_frame or not lineup.landing_frame:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该 Lineup 没有可修正的视频关键帧",
        )
    return CorrectionSessionResponse(
        video_url=lineup.original_video_url,
        original_timestamps=FrameTimestamps(
            standing=lineup.standing_frame.timestamp_ms or 0,
            aim=lineup.aim_frame.timestamp_ms or 0,
            landing=lineup.landing_frame.timestamp_ms or 0,
        ),
        original_form=ManualLineupForm(
            map=lineup.map,
            agent=lineup.agent,
            side=lineup.side,
            ability=lineup.ability,
            throw_type=lineup.throw_type,
            site=lineup.site,
            standing_description=lineup.standing_description,
            aim_description=lineup.aim_description,
            landing_description=lineup.landing_description,
        ),
    )


@router.post("/lineups/{lineup_id}/corrections", status_code=status.HTTP_202_ACCEPTED)
async def submit_correction(
    lineup_id: int,
    payload: VideoFrameSubmit,
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, int | str]:
    lineup = await get_lineup(db, lineup_id)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    job = Job(
        user_id=current_user.id,
        video_id=lineup.video_id,
        source_type=JobSource.VIDEO_FRAME_PICK,
        source_url=lineup.original_video_url,
        status=JobStatus.FRAME_GRAB,
        progress=0.0,
        result={"corrected_from_id": lineup_id, **payload.model_dump(mode="json")},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    await _enqueue_frame_grab(job.id)
    return {"session_id": job.id, "status": "correction_queued"}
