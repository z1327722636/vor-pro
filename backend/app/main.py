from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import admin, auth, lineups, manual, proxy, social, videos
from app.config import get_settings
from app.logging import configure_logging
from app.services.admin_seed import ensure_admin_account

configure_logging()
settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    await ensure_admin_account()
    yield


app = FastAPI(title="Valorant Lineup Hunter API", version="0.1.0", lifespan=lifespan)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPLOAD_ROOT = PROJECT_ROOT / "storage" / "uploads"
FRAME_ROOT = PROJECT_ROOT / "storage" / "frames"
MAPS_ROOT = PROJECT_ROOT / "frontend" / "public" / "assets" / "valorant" / "maps"
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
FRAME_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT), name="uploads")
app.mount("/frames", StaticFiles(directory=FRAME_ROOT), name="frames")
if MAPS_ROOT.is_dir():
    app.mount("/maps", StaticFiles(directory=MAPS_ROOT), name="maps")

allowed_origins = [
    origin.strip()
    for origin in settings.frontend_origin.split(",")
    if origin.strip()
]
allowed_origins.extend(
    [
        "http://localhost:2367",
        "http://127.0.0.1:2367",
        "http://0.0.0.0:2367",
    ]
)
allowed_origins = list(dict.fromkeys(allowed_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$|^https://vor-pro-web-[0-9-]+\.sh\.run\.tcloudbase\.com$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(lineups.router, prefix="/api/lineups", tags=["lineups"])
app.include_router(manual.router, prefix="/api", tags=["manual"])
app.include_router(social.router, prefix="/api/lineups", tags=["social"])
app.include_router(videos.router, prefix="/api/videos", tags=["videos"])
app.include_router(proxy.router, prefix="/api", tags=["proxy"])


@app.get("/healthz")
async def healthz() -> dict[str, str]:
    return {"status": "ok"}
