from datetime import timedelta
from pathlib import Path

from minio import Minio
from minio.error import S3Error

from app.config import get_settings


def get_minio_client() -> Minio:
    settings = get_settings()
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=settings.minio_secure,
    )


def ensure_bucket() -> None:
    settings = get_settings()
    client = get_minio_client()
    if not client.bucket_exists(settings.minio_bucket):
        client.make_bucket(settings.minio_bucket)


def upload_file(object_name: str, file_path: str, content_type: str | None = None) -> str:
    settings = get_settings()
    ensure_bucket()
    client = get_minio_client()
    client.fput_object(
        settings.minio_bucket,
        object_name,
        file_path,
        content_type=content_type or "application/octet-stream",
    )
    return object_name


def presigned_get_url(object_name: str, expires_minutes: int = 60) -> str:
    settings = get_settings()
    client = get_minio_client()
    try:
        return client.presigned_get_object(
            settings.minio_bucket,
            object_name,
            expires=timedelta(minutes=expires_minutes),
        )
    except S3Error:
        local = Path(object_name)
        return local.as_posix()
