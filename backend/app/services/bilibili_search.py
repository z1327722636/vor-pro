"""
Bilibili video search via WBI-signed API.

B 站搜索接口强制 wbi 签名，否则返回 -412 风控。
本模块封装 wbi 签名 + 关键词搜索，返回精简后的视频列表供前端展示和选择。

SSRF 安全：只请求 bilibili 官方固定域名，用户输入仅作为 keyword 参数，
不参与 URL 拼接，由 httpx params 传递。
"""
from __future__ import annotations

import hashlib
import re
import time
from dataclasses import dataclass
from urllib.parse import quote

import httpx
from loguru import logger

from app.config import get_settings

_SEARCH_URL = "https://api.bilibili.com/x/web-interface/search/type"
_NAV_URL = "https://api.bilibili.com/x/web-interface/nav"

# wbi mixin_key 重排表（B 站固定）
_WBI_REARRANGE = [
    46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
    27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
    37, 36, 25, 24, 30, 48, 26, 55, 57, 34, 52, 4, 44, 40, 51, 6,
    16, 7, 20, 54, 21, 0, 1, 56, 22, 11, 17, 59, 61, 63, 60, 62,
]

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

_mixin_key_cache: dict[str, object] = {"key": None, "ts": 0.0}
_MIXIN_KEY_TTL = 600.0  # nav 结果缓存 10 分钟，避免每次搜索都请求 nav


@dataclass(frozen=True)
class BiliSearchItem:
    bvid: str
    title: str
    cover: str
    author: str
    duration_seconds: int
    play: int
    pubdate: int
    url: str


def _extract_mixin_key(img_url: str, sub_url: str) -> str:
    img_key = img_url.rsplit("/", 1)[-1].split(".")[0]
    sub_key = sub_url.rsplit("/", 1)[-1].split(".")[0]
    raw = img_key + sub_key
    return "".join(raw[i] for i in _WBI_REARRANGE)[:32]


async def _get_mixin_key(client: httpx.AsyncClient) -> str:
    now = time.time()
    cached_key = _mixin_key_cache.get("key")
    cached_ts = _mixin_key_cache.get("ts", 0.0)
    if isinstance(cached_key, str) and cached_key and now - float(cached_ts) < _MIXIN_KEY_TTL:
        return cached_key

    settings = get_settings()
    headers = {"User-Agent": _UA, "Referer": "https://www.bilibili.com"}
    cookies: dict[str, str] = {}
    if settings.bilibili_sessdata:
        cookies["SESSDATA"] = settings.bilibili_sessdata

    resp = await client.get(_NAV_URL, headers=headers, cookies=cookies, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    wbi_img = data.get("data", {}).get("wbi_img", {})
    img_url = wbi_img.get("img_url", "")
    sub_url = wbi_img.get("sub_url", "")
    if not img_url or not sub_url:
        raise RuntimeError("B 站 nav 接口未返回 wbi_img，无法签名")
    key = _extract_mixin_key(img_url, sub_url)
    _mixin_key_cache["key"] = key
    _mixin_key_cache["ts"] = now
    logger.debug("bilibili wbi mixin_key refreshed: {}...", key[:8])
    return key


def _sign_params(params: dict[str, str], mixin_key: str) -> str:
    """对参数做 wbi 签名，返回可直接拼到 URL 后的 query string。"""
    params["wts"] = str(int(time.time()))
    # 按 key 字典序排序，value 做 URL 编码（safe="" 全编码），保证签名与请求一致
    encoded = "&".join(
        f"{k}={quote(str(v), safe='')}"
        for k, v in sorted(params.items())
        if str(v) != ""
    )
    w_rid = hashlib.md5(f"{encoded}{mixin_key}".encode()).hexdigest()
    return f"{encoded}&w_rid={w_rid}"


def _strip_tags(text: str) -> str:
    return re.sub(r"<[^>]+>", "", text)


def _parse_duration(duration_str: str) -> int:
    parts = duration_str.split(":")
    if len(parts) == 2:
        try:
            return int(parts[0]) * 60 + int(parts[1])
        except ValueError:
            return 0
    if len(parts) == 3:
        try:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        except ValueError:
            return 0
    return 0


async def search_bilibili_videos(keyword: str, page: int = 1) -> list[BiliSearchItem]:
    keyword = keyword.strip()
    if not keyword:
        return []

    settings = get_settings()
    headers = {"User-Agent": _UA, "Referer": "https://search.bilibili.com"}
    cookies: dict[str, str] = {}
    if settings.bilibili_sessdata:
        cookies["SESSDATA"] = settings.bilibili_sessdata

    async with httpx.AsyncClient(follow_redirects=True) as client:
        mixin_key = await _get_mixin_key(client)
        params = {
            "search_type": "video",
            "keyword": keyword,
            "page": str(page),
            "page_size": "20",
        }
        query = _sign_params(params, mixin_key)
        resp = await client.get(
            f"{_SEARCH_URL}?{query}",
            headers=headers,
            cookies=cookies,
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()

    code = data.get("code", -1)
    if code != 0:
        msg = data.get("message", "未知错误")
        logger.warning("bilibili search failed code={} msg={}", code, msg)
        raise RuntimeError(f"B 站搜索失败（code={code}）：{msg}")

    results: list[BiliSearchItem] = []
    for item in data.get("data", {}).get("result", []):
        bvid = item.get("bvid", "")
        if not bvid:
            continue
        cover = item.get("pic", "")
        if cover and cover.startswith("//"):
            cover = "https:" + cover
        results.append(BiliSearchItem(
            bvid=bvid,
            title=_strip_tags(item.get("title", "")),
            cover=cover,
            author=item.get("author", ""),
            duration_seconds=_parse_duration(item.get("duration", "")),
            play=item.get("play", 0),
            pubdate=item.get("pubdate", 0),
            url=f"https://www.bilibili.com/video/{bvid}",
        ))
    return results
