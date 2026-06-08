import asyncio
from dataclasses import dataclass
from hashlib import sha256
from re import sub

import httpx
from loguru import logger

from app.config import get_settings


@dataclass(frozen=True)
class VideoSearchResult:
    platform: str
    url: str
    title: str | None = None
    uploader: str | None = None


def dedup_results(results: list[VideoSearchResult]) -> list[VideoSearchResult]:
    seen: set[str] = set()
    output: list[VideoSearchResult] = []
    for item in results:
        key = sha256(item.url.encode("utf-8")).hexdigest()
        if key not in seen:
            seen.add(key)
            output.append(item)
    return output


def clean_title(title: str | None) -> str | None:
    if title is None:
        return None
    return sub(r"<[^>]+>", "", title).strip()


def get_bilibili_headers() -> dict[str, str]:
    settings = get_settings()
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/125.0.0.0 Safari/537.36"
        ),
        "Referer": "https://search.bilibili.com/",
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    }
    if settings.bilibili_sessdata:
        headers["Cookie"] = f"SESSDATA={settings.bilibili_sessdata}"
    return headers


async def search_external_videos(keyword: str, limit: int = 20) -> list[dict[str, str | None]]:
    results: list[VideoSearchResult] = []
    results.extend(await search_bilibili(keyword, limit=limit))
    results.extend(await search_douyin(keyword, limit=limit))
    return [item.__dict__ for item in dedup_results(results)[:limit]]


async def search_bilibili(keyword: str, limit: int = 20) -> list[VideoSearchResult]:
    params = {"search_type": "video", "keyword": keyword, "page": 1}
    last_status: int | None = None
    async with httpx.AsyncClient(timeout=15, headers=get_bilibili_headers()) as client:
        for attempt in range(3):
            response = await client.get("https://api.bilibili.com/x/web-interface/search/type", params=params)
            last_status = response.status_code
            if response.status_code == 200:
                break
            if attempt < 2:
                await asyncio.sleep(0.4 * (attempt + 1))
        else:
            logger.warning("Bilibili search failed: status={}, keyword={}", last_status, keyword)
            return []
    data = response.json()
    items = data.get("data", {}).get("result", [])[:limit]
    return [
        VideoSearchResult(
            platform="bilibili",
            url=(
                "https:" + item.get("arcurl", "")
                if str(item.get("arcurl", "")).startswith("//")
                else item.get("arcurl", "")
            ),
            title=clean_title(item.get("title")),
            uploader=item.get("author"),
        )
        for item in items
        if item.get("arcurl")
    ]


async def search_douyin(keyword: str, limit: int = 20) -> list[VideoSearchResult]:
    settings = get_settings()
    if not settings.douyin_api_base_url:
        return []
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            f"{settings.douyin_api_base_url.rstrip('/')}/api/search",
            params={"keyword": keyword, "limit": limit},
        )
    if response.status_code != 200:
        return []
    data = response.json()
    items = data.get("data", [])[:limit]
    return [
        VideoSearchResult(
            platform="douyin",
            url=item.get("url", ""),
            title=item.get("title"),
            uploader=item.get("author"),
        )
        for item in items
        if item.get("url")
    ]
