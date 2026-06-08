from redis.asyncio import Redis

from app.config import get_settings


async def consume_daily_quota(key: str, limit: int, amount: int = 1) -> bool:
    settings = get_settings()
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    value = await redis.incrby(key, amount)
    if value == amount:
        await redis.expire(key, 60 * 60 * 24)
    await redis.aclose()
    return value <= limit
