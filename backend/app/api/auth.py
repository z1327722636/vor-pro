from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.deps import CurrentUser, DbSession
from app.models.user import User
from app.models.user_identity import (
    EMAIL_PROVIDER,
    WECHAT_MINIPROGRAM_PROVIDER,
    WECHAT_UNIONID_PROVIDER,
    UserIdentity,
    is_reserved_email,
)
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    WechatLoginRequest,
)
from app.services.auth_service import create_access_token, hash_password, verify_password
from app.services.wechat_client import WechatClient, WechatLoginError

router = APIRouter()

IdentityKey = tuple[str, str]


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _wechat_identity_keys(openid: str, unionid: str | None) -> list[IdentityKey]:
    keys = [(WECHAT_MINIPROGRAM_PROVIDER, openid.strip())]
    if unionid and unionid.strip():
        keys.append((WECHAT_UNIONID_PROVIDER, unionid.strip()))
    return keys


async def _find_user_by_identity(
    db: AsyncSession,
    identity_keys: list[IdentityKey],
) -> User | None:
    conditions = [
        and_(UserIdentity.provider == provider, UserIdentity.provider_user_id == provider_user_id)
        for provider, provider_user_id in identity_keys
        if provider_user_id
    ]
    if not conditions:
        return None

    result = await db.execute(
        select(User)
        .join(UserIdentity, UserIdentity.user_id == User.id)
        .where(or_(*conditions))
    )
    users = {user.id: user for user in result.scalars().all()}
    if len(users) > 1:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Identity is linked to multiple users",
        )
    return next(iter(users.values()), None)


async def _find_user_by_email(db: AsyncSession, email: str) -> User | None:
    normalized_email = _normalize_email(email)
    result = await db.execute(select(User).where(User.email == normalized_email))
    user = result.scalar_one_or_none()
    if user is not None:
        return user
    return await _find_user_by_identity(db, [(EMAIL_PROVIDER, normalized_email)])


async def _attach_identity(
    db: AsyncSession,
    user: User,
    provider: str,
    provider_user_id: str,
) -> None:
    value = provider_user_id.strip()
    if not value:
        return

    result = await db.execute(
        select(UserIdentity).where(
            UserIdentity.provider == provider,
            UserIdentity.provider_user_id == value,
        )
    )
    identity = result.scalar_one_or_none()
    if identity is None:
        db.add(UserIdentity(user=user, provider=provider, provider_user_id=value))
        return
    if identity.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Identity already linked to another user",
        )


async def _attach_identities(
    db: AsyncSession,
    user: User,
    identity_keys: list[IdentityKey],
) -> None:
    for provider, provider_user_id in identity_keys:
        await _attach_identity(db, user, provider, provider_user_id)


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    email = _normalize_email(payload.email)
    if is_reserved_email(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email domain is reserved",
        )
    if await _find_user_by_email(db, email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(email=email, password_hash=hash_password(payload.password))
    db.add(user)
    try:
        await db.flush()
        await _attach_identity(db, user, EMAIL_PROVIDER, email)
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        ) from exc

    await db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    user = await _find_user_by_email(db, payload.email)
    invalid_credentials = (
        user is None
        or user.password_hash is None
        or not verify_password(payload.password, user.password_hash)
    )
    if invalid_credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/wechat-login", response_model=TokenResponse)
async def wechat_login(payload: WechatLoginRequest, db: DbSession) -> TokenResponse:
    settings = get_settings()
    client = WechatClient(settings)
    try:
        wechat_session = await client.exchange_code(payload.code)
    except WechatLoginError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    identity_keys = _wechat_identity_keys(wechat_session.openid, wechat_session.unionid)
    linked_user: User | None = None
    linked_user_id: int | None = None
    has_link_credentials = payload.link_email is not None or payload.link_password is not None

    if has_link_credentials:
        link_email = payload.link_email
        link_password = payload.link_password
        if link_email is None or link_password is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email and password are both required to link WeChat",
            )
        linked_user = await _find_user_by_email(db, link_email)
        if linked_user is None or linked_user.password_hash is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        if not verify_password(link_password, linked_user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
        linked_user_id = linked_user.id

    user = await _find_user_by_identity(db, identity_keys)
    if linked_user is not None:
        if user is not None and user.id != linked_user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="WeChat identity already linked to another user",
            )
        user = linked_user

    if user is None:
        user = User(email=None, password_hash=None)
        db.add(user)
        await db.flush()

    try:
        await _attach_identities(db, user, identity_keys)
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing_user = await _find_user_by_identity(db, identity_keys)
        if existing_user is None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Could not create WeChat user",
            )
        if linked_user_id is not None and existing_user.id != linked_user_id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="WeChat identity already linked to another user",
            )
        user = existing_user

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        is_admin=current_user.is_admin,
    )
