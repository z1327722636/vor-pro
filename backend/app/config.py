from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    frontend_origin: str = "http://localhost:2367"
    secret_key: str = Field(default="change-me-in-production", min_length=16)
    access_token_expire_minutes: int = 60 * 24 * 7
    admin_email: str | None = None
    admin_password: str | None = None
    wechat_appid: str | None = None
    wechat_secret: str | None = None
    wechat_login_mock: bool = True

    database_url: str = "postgresql+asyncpg://vor:vor_password@localhost:5432/vor"
    redis_url: str = "redis://localhost:6379/0"

    minio_endpoint: str = "localhost:9000"
    minio_public_endpoint: str = "localhost:9000"
    minio_access_key: str = "vor_minio"
    minio_secret_key: str = "vor_minio_password"
    minio_bucket: str = "lineup-assets"
    minio_secure: bool = False

    bilibili_sessdata: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
