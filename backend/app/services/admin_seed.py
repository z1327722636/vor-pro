from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import AsyncSessionLocal
from app.models.user import User
from app.models.user_identity import (
    EMAIL_PROVIDER,
    WECHAT_MINIPROGRAM_PROVIDER,
    WECHAT_UNIONID_PROVIDER,
    UserIdentity,
    is_reserved_email,
)
from app.services.auth_service import hash_password


async def _ensure_identity(
    session: AsyncSession,
    user: User,
    provider: str,
    provider_user_id: str | None,
) -> None:
    value = (provider_user_id or "").strip()
    if provider == EMAIL_PROVIDER:
        value = value.lower()
    if not value:
        return

    result = await session.execute(
        select(UserIdentity).where(
            UserIdentity.provider == provider,
            UserIdentity.provider_user_id == value,
        )
    )
    identity = result.scalar_one_or_none()
    if identity is None:
        session.add(UserIdentity(user=user, provider=provider, provider_user_id=value))
        return
    if identity.user_id != user.id:
        raise RuntimeError(f"Configured {provider} identity is already linked to another user")


async def ensure_admin_account() -> None:
    settings = get_settings()
    if not settings.admin_email and not settings.admin_password:
        return
    if not settings.admin_email or not settings.admin_password:
        logger.warning("ADMIN_EMAIL and ADMIN_PASSWORD must be set together; admin account skipped")
        return
    if len(settings.admin_password) < 8 or len(settings.admin_password) > 72:
        logger.warning("ADMIN_PASSWORD must be 8-72 characters; admin account skipped")
        return

    email = settings.admin_email.lower()
    if is_reserved_email(email):
        raise RuntimeError("ADMIN_EMAIL must not use a reserved system email domain")

    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        password_hash = hash_password(settings.admin_password)
        if user is None:
            user = User(email=email, password_hash=password_hash, is_admin=True)
            session.add(user)
            logger.info("Admin account created")
        else:
            user.password_hash = password_hash
            user.is_admin = True
            logger.info("Admin account synchronized")

        await session.flush()
        await _ensure_identity(session, user, EMAIL_PROVIDER, email)
        await _ensure_identity(
            session,
            user,
            WECHAT_MINIPROGRAM_PROVIDER,
            settings.admin_wechat_openid,
        )
        await _ensure_identity(
            session,
            user,
            WECHAT_UNIONID_PROVIDER,
            settings.admin_wechat_unionid,
        )
        await session.commit()
