from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha256

import httpx
from loguru import logger

from app.config import Settings

WECHAT_CODE2SESSION_URL = "https://api.weixin.qq.com/sns/jscode2session"


class WechatLoginError(Exception):
    """Raised when WeChat login code exchange fails."""


@dataclass(frozen=True)
class WechatSession:
    """Normalized WeChat login session returned by code exchange."""

    openid: str
    session_key: str | None = None
    unionid: str | None = None


class WechatClient:
    """Small client for exchanging WeChat Mini Program login codes."""

    def __init__(self, settings: Settings, timeout_seconds: float = 5.0) -> None:
        self._settings = settings
        self._timeout_seconds = timeout_seconds

    async def exchange_code(self, code: str) -> WechatSession:
        """Exchange a Mini Program login code for a stable openid.

        Local development falls back to deterministic mock sessions when mock mode is enabled or
        real WeChat credentials are not configured. This keeps the API usable without storing or
        reading any real secrets from the repository.
        """

        normalized_code = code.strip()
        if not normalized_code:
            raise WechatLoginError("WeChat login code is required")

        appid = (self._settings.wechat_appid or "").strip()
        secret = (self._settings.wechat_secret or "").strip()
        if self._settings.wechat_login_mock:
            if self._settings.app_env.lower() != "development":
                raise WechatLoginError("WeChat mock login is only available in development")
            return self._mock_session(normalized_code)
        if not appid or not secret:
            raise WechatLoginError("WeChat login credentials are not configured")

        params = {
            "appid": appid,
            "secret": secret,
            "js_code": normalized_code,
            "grant_type": "authorization_code",
        }
        try:
            async with httpx.AsyncClient(timeout=self._timeout_seconds) as client:
                response = await client.get(WECHAT_CODE2SESSION_URL, params=params)
                response.raise_for_status()
                data = response.json()
        except httpx.HTTPError as exc:
            logger.warning("WeChat code exchange HTTP error: {}", exc.__class__.__name__)
            raise WechatLoginError("WeChat code exchange request failed") from exc
        except ValueError as exc:
            logger.warning("WeChat code exchange returned invalid JSON")
            raise WechatLoginError("WeChat code exchange returned invalid response") from exc

        errcode = int(data.get("errcode", 0) or 0)
        if errcode != 0:
            errmsg = str(data.get("errmsg", "unknown error"))
            logger.warning(
                "WeChat code exchange rejected code: errcode={}, errmsg={}",
                errcode,
                errmsg,
            )
            raise WechatLoginError("WeChat rejected the login code")

        openid = str(data.get("openid") or "").strip()
        if not openid:
            raise WechatLoginError("WeChat response did not include openid")

        session_key = data.get("session_key")
        unionid = data.get("unionid")
        return WechatSession(
            openid=openid,
            session_key=str(session_key) if session_key else None,
            unionid=str(unionid) if unionid else None,
        )

    def _mock_session(self, code: str) -> WechatSession:
        configured_openid = (self._settings.wechat_mock_openid or "").strip()
        configured_unionid = (self._settings.wechat_mock_unionid or "").strip()
        if configured_openid:
            return WechatSession(
                openid=configured_openid,
                session_key=None,
                unionid=configured_unionid or None,
            )

        digest = sha256(code.encode("utf-8")).hexdigest()
        return WechatSession(openid=f"mock_{digest[:32]}", session_key=None, unionid=None)
