"""
External image proxy for hotlink-protected CDNs.

B 站图片 CDN（i0.hdslb.com 等）有防盗链，浏览器直连会返回 403。
本路由做白名单代理：只放行白名单域名，带上正确 Referer 下载后透传 bytes 给前端。

SSRF 防护：
- URL 必须命中白名单域名（精确匹配）
- 域名解析后的 IP 必须非内网/非保留
- 只允许 http/https
"""
from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import Response
from loguru import logger

router = APIRouter()

# 白名单：{host: 对应 Referer}。新增平台时同步加。
_ALLOWED_HOSTS: dict[str, str] = {
    "hdslb.com": "https://www.bilibili.com",
    "i0.hdslb.com": "https://www.bilibili.com",
    "i1.hdslb.com": "https://www.bilibili.com",
    "i2.hdslb.com": "https://www.bilibili.com",
    "i3.hdslb.com": "https://www.bilibili.com",
    "search.bilibili.com": "https://search.bilibili.com",
}

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


def _validate_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="只支持 http/https 链接")
    host = (parsed.hostname or "").strip().lower().rstrip(".")
    if not host or host not in _ALLOWED_HOSTS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"域名 {host or '?'} 不在白名单")
    try:
        addrs = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="域名无法解析") from exc
    for item in addrs:
        if _is_blocked_ip(item[4][0]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不允许访问内网地址")
    return host


@router.get("/proxy/image")
async def proxy_image(url: str = Query(min_length=1, max_length=2000)) -> Response:
    host = _validate_url(url)
    referer = _ALLOWED_HOSTS[host]
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            resp = await client.get(
                url,
                headers={"Referer": referer, "User-Agent": _UA},
            )
    except httpx.HTTPError as exc:
        logger.warning("proxy_image fetch failed: url={} err={}", url, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="图片源站不可达") from exc

    if resp.status_code != 200:
        logger.warning("proxy_image upstream non-200: url={} status={}", url, resp.status_code)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"源站返回 {resp.status_code}")

    content_type = resp.headers.get("content-type", "image/jpeg")
    # 缓存 1 小时：CDN 文件名带 hash 不可变
    headers = {"Cache-Control": "public, max-age=3600"}
    return Response(content=resp.content, media_type=content_type, headers=headers)
