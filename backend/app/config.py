from functools import lru_cache
from pathlib import Path

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SECRET_KEY = "change-me-in-production"


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
    secret_key: str = Field(default=DEFAULT_SECRET_KEY, min_length=16)
    access_token_expire_minutes: int = 60 * 24 * 7
    admin_email: str | None = None
    admin_password: str | None = None
    admin_wechat_openid: str | None = None
    admin_wechat_unionid: str | None = None
    wechat_appid: str | None = None
    wechat_secret: str | None = None
    wechat_login_mock: bool = False
    wechat_mock_openid: str | None = None
    wechat_mock_unionid: str | None = None

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.app_env.lower() not in {"production", "prod"}:
            return self
        if self.secret_key == DEFAULT_SECRET_KEY:
            raise ValueError("SECRET_KEY must be changed in production")
        if self.wechat_login_mock:
            raise ValueError("WECHAT_LOGIN_MOCK must be false in production")
        if self.wechat_mock_openid or self.wechat_mock_unionid:
            raise ValueError("WeChat mock identity must not be configured in production")
        if not (self.wechat_appid and self.wechat_secret):
            raise ValueError("WECHAT_APPID and WECHAT_SECRET are required in production")
        return self

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
