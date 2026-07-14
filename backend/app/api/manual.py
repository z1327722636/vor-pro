import base64
import binascii
import hashlib
import shutil
import subprocess
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status

from app.crud.lineups import get_lineup
from app.deps import CurrentUser, DbSession
from app.enums import LineupSource, MapName, Side, ThrowType
from app.models.lineup import Lineup
from app.schemas.lineup import LineupResponse, lineup_response
from app.schemas.manual import (
    CorrectionSessionResponse,
    ExternalVideoResolveRequest,
    ExternalVideoResolveResponse,
    FrameTimestamps,
    ManualJsonUploadRequest,
    ManualLineupForm,
    VideoFrameSubmit,
)
from app.services.manual_service import (
    UPLOAD_ROOT,
    create_manual_lineup_with_steps,
    create_manual_lineup,
    save_upload,
)
from app.services.video_resolver import find_local_video, resolve_external_video

FRAMES_ROOT = UPLOAD_ROOT / "video_frames"
FRAMES_ROOT.mkdir(parents=True, exist_ok=True)

MAX_MANUAL_IMAGE_BYTES = 8 * 1024 * 1024
_IMAGE_SIGNATURES: tuple[tuple[bytes, str], ...] = (
    (b"\xff\xd8\xff", ".jpg"),
    (b"\x89PNG\r\n\x1a\n", ".png"),
    (b"RIFF", ".webp"),
)

router = APIRouter()


def _ffmpeg_extract_frame(video_path: Path, timestamp_ms: int, output_path: Path) -> None:
    """同步抽 1 帧到 output_path。失败抛 RuntimeError。"""
    seconds = max(timestamp_ms, 0) / 1000.0
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-ss", f"{seconds:.3f}", "-i", str(video_path),
        "-frames:v", "1", "-q:v", "2", "-loglevel", "error", str(output_path),
    ]
    completed = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if completed.returncode != 0 or not output_path.exists() or output_path.stat().st_size == 0:
        raise RuntimeError(
            f"ffmpeg 抽帧失败 ts={timestamp_ms}ms rc={completed.returncode}: "
            f"{completed.stderr.strip()[:300]}"
        )


def _optional_coordinate(value: object) -> float | None:
    if value is None or value == "":
        return None
    return float(value)


def _normalize_form(raw_form: dict) -> ManualLineupForm:
    return ManualLineupForm(
        map=MapName(raw_form["map"]) if not isinstance(raw_form.get("map"), MapName) else raw_form["map"],
        agent=str(raw_form.get("agent", "")).lower(),
        side=Side(raw_form["side"]) if not isinstance(raw_form.get("side"), Side) else raw_form["side"],
        ability=str(raw_form.get("ability", "")).lower(),
        throw_type=ThrowType(raw_form["throw_type"])
        if not isinstance(raw_form.get("throw_type"), ThrowType)
        else raw_form["throw_type"],
        site=str(raw_form.get("site", "a")).lower(),
        standing_description=str(raw_form.get("standing_description", "")),
        aim_description=str(raw_form.get("aim_description", "")),
        landing_description=str(raw_form.get("landing_description", "")),
        minimap_x=_optional_coordinate(raw_form.get("minimap_x")),
        minimap_y=_optional_coordinate(raw_form.get("minimap_y")),
        landing_x=_optional_coordinate(raw_form.get("landing_x")),
        landing_y=_optional_coordinate(raw_form.get("landing_y")),
    )


def _detect_image_extension(data: bytes) -> str:
    for signature, suffix in _IMAGE_SIGNATURES:
        if data.startswith(signature):
            if suffix == ".webp" and data[8:12] != b"WEBP":
                continue
            return suffix
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只支持 JPG、PNG 或 WebP 图片")


def _save_base64_image(image_base64: str, prefix: str) -> str:
    encoded = image_base64.split(",", 1)[1] if image_base64.startswith("data:") else image_base64
    try:
        data = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="图片内容不是合法 base64") from exc
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="图片内容为空")
    if len(data) > MAX_MANUAL_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="单张图片不能超过 8MB")
    suffix = _detect_image_extension(data)
    digest = hashlib.sha256(data).hexdigest()[:16]
    path = UPLOAD_ROOT / f"{prefix}_{digest}{suffix}"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path.as_posix()


async def _extract_and_create_lineup(
    db: DbSession,
    user_id: int,
    source_url: str,
    payload: VideoFrameSubmit,
    source_type: LineupSource,
    corrected_from_id: int | None = None,
) -> Lineup:
    """同步：找视频 → ffmpeg 抽帧 → 写 Lineup → 返回。"""
    if shutil.which("ffmpeg") is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="服务器未安装 ffmpeg，无法抽帧",
        )

    video_path = find_local_video(source_url)
    if video_path is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="未找到已解析的视频文件，请先在前端调用解析接口",
        )

    nodes = payload.frame_nodes
    if not nodes:
        from app.schemas.manual import FrameNodeSubmit
        ts = payload.timestamps
        nodes = [
            FrameNodeSubmit(timestamp_ms=ts.standing, note=payload.form.standing_description, order_index=0),
            FrameNodeSubmit(timestamp_ms=ts.aim, note=payload.form.aim_description, order_index=1),
            FrameNodeSubmit(timestamp_ms=ts.landing, note=payload.form.landing_description, order_index=2),
        ]
    nodes = sorted(nodes, key=lambda n: n.order_index)
    timestamps_ms = [node.timestamp_ms for node in nodes]
    if len(timestamps_ms) > 1 and len(set(timestamps_ms)) != len(timestamps_ms):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="多个帧节点时间相同，请在不同画面重新标记后再保存",
        )

    url_hash = hashlib.sha1(source_url.encode("utf-8")).hexdigest()[:10]
    uid_hash = hashlib.sha1(str(user_id).encode()).hexdigest()[:8]
    steps: list[tuple[str, str]] = []
    for idx, node in enumerate(nodes):
        out_file = FRAMES_ROOT / f"vid_{url_hash}_u{uid_hash}_{idx}_{node.timestamp_ms}.jpg"
        _ffmpeg_extract_frame(video_path, node.timestamp_ms, out_file)
        steps.append((out_file.as_posix(), node.note))

    form = _normalize_form(
        payload.form.model_dump() if hasattr(payload.form, "model_dump") else dict(payload.form)
    )
    lineup = await create_manual_lineup_with_steps(
        db,
        user_id=user_id,
        form=form,
        steps=steps,
        source_type=source_type,
        original_video_url=source_url,
        original_video_timestamp_ms=nodes[0].timestamp_ms if nodes else None,
        corrected_from_id=corrected_from_id,
        correction_version=2 if corrected_from_id else 1,
    )
    return lineup


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
    minimap_x: float | None = None,
    minimap_y: float | None = None,
    landing_x: float | None = None,
    landing_y: float | None = None,
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
        minimap_x=minimap_x,
        minimap_y=minimap_y,
        landing_x=landing_x,
        landing_y=landing_y,
    )


# ─── 手动上传步骤图 ─────────────────────────────────────────

@router.post(
    "/lineups/manual-upload-json",
    response_model=LineupResponse,
    status_code=status.HTTP_201_CREATED,
)
async def manual_upload_json(
    payload: ManualJsonUploadRequest,
    db: DbSession,
    current_user: CurrentUser,
) -> LineupResponse:
    saved_steps = [
        (_save_base64_image(item.image_base64, f"lineup_step_{index + 1}"), item.note)
        for index, item in enumerate(payload.images)
    ]
    form = _normalize_form(payload.form.model_dump(mode="json"))
    lineup = await create_manual_lineup_with_steps(
        db,
        current_user.id,
        form,
        saved_steps,
        LineupSource.USER_MANUAL_UPLOAD,
    )
    return lineup_response(lineup)


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
    minimap_x: float | None = Form(default=None),
    minimap_y: float | None = Form(default=None),
    landing_x: float | None = Form(default=None),
    landing_y: float | None = Form(default=None),
) -> LineupResponse:
    form = build_form(
        map, agent, side, ability, throw_type, site,
        standing_description, aim_description, landing_description,
        minimap_x, minimap_y, landing_x, landing_y,
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
            db, current_user.id, form, saved_steps, LineupSource.USER_MANUAL_UPLOAD,
        )
        return lineup_response(lineup)

    if not standing or not aim or not landing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="请至少上传一张步骤图")

    standing_path = await save_upload(standing, "standing")
    aim_path = await save_upload(aim, "aim")
    landing_path = await save_upload(landing, "landing")
    lineup = await create_manual_lineup(
        db, current_user.id, form,
        standing_path, aim_path, landing_path,
        LineupSource.USER_MANUAL_UPLOAD,
    )
    return lineup_response(lineup)


# ─── 视频解析（手动选帧）─────────────────────────────────────

@router.post("/manual/external-video/resolve", response_model=ExternalVideoResolveResponse)
async def resolve_external_video_endpoint(
    payload: ExternalVideoResolveRequest,
    current_user: CurrentUser,
) -> ExternalVideoResolveResponse:
    """把 B 站 / 抖音等视频页 URL 解析成站内可播放的本地直链。"""
    _ = current_user
    try:
        resolved = await resolve_external_video(payload.source_url)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return ExternalVideoResolveResponse(
        playable_url=resolved.url,
        title=resolved.title,
        duration_seconds=resolved.duration_seconds,
    )


@router.post("/manual/video/submit", status_code=status.HTTP_201_CREATED, response_model=LineupResponse)
async def submit_video_frames(
    payload: VideoFrameSubmit,
    db: DbSession,
    current_user: CurrentUser,
) -> LineupResponse:
    """同步：根据用户选定的时间点从已解析视频中抽帧并创建 Lineup。"""
    if not payload.source_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="缺少视频 source_url")
    lineup = await _extract_and_create_lineup(
        db, current_user.id, payload.source_url, payload, LineupSource.USER_MANUAL_VIDEO,
    )
    return lineup_response(lineup)


# ─── 矫正 ──────────────────────────────────────────────────

@router.post("/lineups/{lineup_id}/correction-session", response_model=CorrectionSessionResponse)
async def create_correction_session(
    lineup_id: int,
    db: DbSession,
    current_user: CurrentUser,
) -> CorrectionSessionResponse:
    lineup = await get_lineup(db, lineup_id)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    fallback_timestamp = lineup.original_video_timestamp_ms or 0
    return CorrectionSessionResponse(
        video_url=lineup.original_video_url,
        original_timestamps=FrameTimestamps(
            standing=lineup.standing_frame.timestamp_ms if lineup.standing_frame else fallback_timestamp,
            aim=lineup.aim_frame.timestamp_ms if lineup.aim_frame else fallback_timestamp,
            landing=lineup.landing_frame.timestamp_ms if lineup.landing_frame else fallback_timestamp,
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
            minimap_x=lineup.minimap_x,
            minimap_y=lineup.minimap_y,
            landing_x=lineup.landing_x,
            landing_y=lineup.landing_y,
        ),
    )


@router.post("/lineups/{lineup_id}/corrections", status_code=status.HTTP_201_CREATED, response_model=LineupResponse)
async def submit_correction(
    lineup_id: int,
    payload: VideoFrameSubmit,
    db: DbSession,
    current_user: CurrentUser,
) -> LineupResponse:
    lineup = await get_lineup(db, lineup_id)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")

    source_url = payload.source_url or lineup.original_video_url
    if not source_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="该 Lineup 没有关联视频")

    corrected = await _extract_and_create_lineup(
        db, current_user.id, source_url, payload,
        LineupSource.USER_CORRECTED, corrected_from_id=lineup_id,
    )

    correction_version = (lineup.correction_version or 1) + 1
    lineup.correction_version = correction_version
    await db.commit()
    return lineup_response(corrected)
