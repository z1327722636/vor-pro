"""
External video resolver.

把 B 站之类的视频页 URL 解析为可在前端 <video> 直接播放的本地直链 mp4。
策略：用 yt-dlp 把视频拉到 storage/uploads/external_videos/，对外通过
FastAPI 已挂载的 /uploads 静态路由暴露。

设计要点（第一性原理）：
- 必须有源文件落地，因为后续要 ffmpeg 抽帧。反向代理省不了多少事，反而复杂。
- 同一个 BVID（或 URL hash）解析过就复用，避免重复几十 MB 下载。
- yt-dlp 用 Python API 调用，不 shell out，错误信息更可控。
- B 站 cookie（SESSDATA）从 .env 读，用于高清流；没有也能跑 360P。
"""
from __future__ import annotations

import asyncio
import ipaddress
import re
import socket
from dataclasses import dataclass
from hashlib import sha1
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from loguru import logger

from app.config import get_settings

PROJECT_ROOT = Path(__file__).resolve().parents[3]
RESOLVED_ROOT = PROJECT_ROOT / "storage" / "uploads" / "external_videos"
RESOLVED_ROOT.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class ResolvedVideo:
    """解析结果。url 是站内可播放的相对路径（/uploads/...），local_path 是磁盘绝对路径。"""

    url: str
    local_path: Path
    title: str | None
    duration_seconds: float | None


_BVID_RE = re.compile(r"(BV[0-9A-Za-z]{10})")
_PLAYABLE_SUFFIXES = {".mp4", ".webm", ".mkv", ".m4v", ".mov"}
_BLOCKED_FIRST_OCTETS = {9, 10, 11, 21, 30}

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _is_blocked_ip(address: str) -> bool:
    ip = ipaddress.ip_address(address)
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return True
    if ip.version == 4 and int(str(ip).split(".", 1)[0]) in _BLOCKED_FIRST_OCTETS:
        return True
    return False


def _validate_public_video_url(source_url: str) -> None:
    parsed = urlparse(source_url)
    if parsed.scheme not in {"http", "https"}:
        raise ValueError("只支持 http/https 视频链接")
    if not parsed.hostname:
        raise ValueError("视频链接缺少域名")
    hostname = parsed.hostname.strip().lower().rstrip(".")
    if hostname in {"localhost", "localhost.localdomain"}:
        raise ValueError("不允许解析本机或内网地址")
    try:
        if _is_blocked_ip(hostname):
            raise ValueError("不允许解析本机或内网地址")
    except ValueError:
        if re.fullmatch(r"[0-9a-fA-F:.]+", hostname):
            raise
    try:
        addresses = socket.getaddrinfo(hostname, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ValueError("视频链接域名无法解析") from exc
    for item in addresses:
        if _is_blocked_ip(item[4][0]):
            raise ValueError("不允许解析本机或内网地址")


def _cache_key(source_url: str) -> str:
    """同一个 BVID 视为同一个视频；其他平台退化为 URL 哈希。"""
    bvid_match = _BVID_RE.search(source_url)
    if bvid_match:
        return bvid_match.group(1)
    return "u_" + sha1(source_url.encode("utf-8")).hexdigest()[:16]


def _existing_file(cache_key: str) -> Path | None:
    for candidate in RESOLVED_ROOT.glob(f"{cache_key}.*"):
        if (
            candidate.is_file()
            and candidate.suffix.lower() in _PLAYABLE_SUFFIXES
            and candidate.stat().st_size > 0
        ):
            return candidate
    return None


def _cleanup_partial_files(cache_key: str) -> None:
    for candidate in RESOLVED_ROOT.glob(f"{cache_key}.*"):
        if candidate.is_file() and candidate.suffix.lower() not in _PLAYABLE_SUFFIXES:
            candidate.unlink(missing_ok=True)
    for candidate in RESOLVED_ROOT.glob(f"{cache_key}.*.part"):
        if candidate.is_file():
            candidate.unlink(missing_ok=True)


def _build_cookie_file(cache_key: str) -> Path | None:
    """把 .env 里的 BILIBILI_SESSDATA 写成 yt-dlp 能吃的 Netscape cookies 文件。"""
    settings = get_settings()
    if not settings.bilibili_sessdata:
        return None
    cookies_path = RESOLVED_ROOT / f".cookies_{cache_key}.txt"
    cookies_path.write_text(
        "# Netscape HTTP Cookie File\n"
        f".bilibili.com\tTRUE\t/\tFALSE\t0\tSESSDATA\t{settings.bilibili_sessdata}\n",
        encoding="utf-8",
    )
    return cookies_path


def _platform_headers(source_url: str) -> dict[str, str]:
    """按来源域名动态设置 Referer。"""
    parsed = urlparse(source_url)
    host = (parsed.hostname or "").strip().lower().rstrip(".")
    if host in {"bilibili.com", "www.bilibili.com", "m.bilibili.com", "b23.tv"} or host.endswith(".bilibili.com"):
        referer = "https://www.bilibili.com"
    else:
        referer = f"https://{host}/" if host else "https://www.bilibili.com"
    return {"Referer": referer, "User-Agent": _UA}


def _resolve_blocking(source_url: str) -> ResolvedVideo:
    """yt-dlp 是同步阻塞库，调用方用 to_thread 包一层。"""
    try:
        from yt_dlp import YoutubeDL
    except ImportError as exc:  # pragma: no cover - 依赖已在 pyproject
        raise RuntimeError("yt-dlp 未安装") from exc

    cache_key = _cache_key(source_url)
    existing = _existing_file(cache_key)
    if existing is not None:
        logger.info("video_resolver cache hit: {} -> {}", source_url, existing.name)
        return ResolvedVideo(
            url=f"/uploads/external_videos/{existing.name}",
            local_path=existing,
            title=None,
            duration_seconds=None,
        )

    output_template = str(RESOLVED_ROOT / f"{cache_key}.%(ext)s")
    cookie_file = _build_cookie_file(cache_key)

    ydl_opts: dict[str, Any] = {
        "outtmpl": output_template,
        # B 站多数清晰度是 DASH：视频流和音频流分离，没有 best 单文件。
        # 必须显式选 video+audio 组合，再让 yt-dlp 调 ffmpeg 合并为 mp4。
        "format": "bv*[vcodec^=avc]+ba[ext=m4a]/bv*+ba/bestvideo+bestaudio/best",
        "merge_output_format": "mp4",
        "quiet": True,
        "no_warnings": True,
        "noprogress": True,
        "noplaylist": True,
        "concurrent_fragment_downloads": 4,
        "http_headers": _platform_headers(source_url),
    }
    if cookie_file is not None:
        ydl_opts["cookiefile"] = str(cookie_file)

    logger.info("video_resolver downloading: {}", source_url)
    try:
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(source_url, download=True)
    except Exception as exc:
        _cleanup_partial_files(cache_key)
        logger.error("yt-dlp failed for {}: {}", source_url, exc)
        raise RuntimeError(f"视频解析失败：{exc}") from exc
    finally:
        if cookie_file is not None and cookie_file.exists():
            cookie_file.unlink(missing_ok=True)

    # 解析后真实文件名 = cache_key + 实际扩展名
    resolved_file = _existing_file(cache_key)
    if resolved_file is None:
        raise RuntimeError("视频解析成功但未找到落地文件")

    return ResolvedVideo(
        url=f"/uploads/external_videos/{resolved_file.name}",
        local_path=resolved_file,
        title=info.get("title") if isinstance(info, dict) else None,
        duration_seconds=float(info["duration"]) if isinstance(info, dict) and info.get("duration") else None,
    )


async def resolve_external_video(source_url: str) -> ResolvedVideo:
    """异步入口。阻塞下载放到线程池，避免堵塞事件循环。"""
    source_url = source_url.strip()
    if not source_url:
        raise ValueError("source_url is empty")
    await asyncio.to_thread(_validate_public_video_url, source_url)
    return await asyncio.to_thread(_resolve_blocking, source_url)


def find_local_video(source_url: str) -> Path | None:
    """worker 抽帧时根据 URL 反查本地文件；不下载。"""
    cache_key = _cache_key(source_url)
    return _existing_file(cache_key)
