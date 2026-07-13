from __future__ import annotations

from hashlib import sha256
from secrets import token_urlsafe

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.deps import CurrentUser, DbSession
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse, WechatLoginRequest
from app.services.auth_service import create_access_token, hash_password, verify_password
from app.services.wechat_client import WechatClient, WechatLoginError

router = APIRouter()


def _wechat_user_email(openid: str) -> str:
    """Build a deterministic placeholder email for a WeChat-only user."""

    digest = sha256(openid.encode("utf-8")).hexdigest()
    return f"wx-{digest[:32]}@wechat.example.com"


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: DbSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DbSession) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/wechat-login", response_model=TokenResponse)
async def wechat_login(payload: WechatLoginRequest, db: DbSession) -> TokenResponse:
    settings = get_settings()
    client = WechatClient(settings)
    try:
        wechat_session = await client.exchange_code(payload.code)
    except WechatLoginError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    email = _wechat_user_email(wechat_session.openid)
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(email=email, password_hash=hash_password(token_urlsafe(32)))
        db.add(user)
        try:
            await db.commit()
        except IntegrityError:
            await db.rollback()
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Could not create WeChat user",
                )
        else:
            await db.refresh(user)

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse(id=current_user.id, email=current_user.email, is_admin=current_user.is_admin)
