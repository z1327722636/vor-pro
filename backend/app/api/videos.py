from fastapi import APIRouter, Query

from app.services.storage import presigned_get_url

router = APIRouter()


@router.get("/assets/presign")
async def presign_asset(
    object_name: str = Query(min_length=1, max_length=500),
    expires_minutes: int = Query(default=60, ge=1, le=1440),
) -> dict[str, str]:
    safe_name = object_name.lstrip("/")
    return {"url": presigned_get_url(safe_name, expires_minutes=expires_minutes)}
