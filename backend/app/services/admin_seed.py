from loguru import logger
from sqlalchemy import select

from app.config import get_settings
from app.db import AsyncSessionLocal
from app.models.user import User
from app.services.auth_service import hash_password


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
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        password_hash = hash_password(settings.admin_password)
        if user is None:
            session.add(User(email=email, password_hash=password_hash, is_admin=True))
            logger.info("Admin account created")
        else:
            user.password_hash = password_hash
            user.is_admin = True
            logger.info("Admin account synchronized")
        await session.commit()
