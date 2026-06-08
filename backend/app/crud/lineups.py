from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.enums import LineupSource, MapName, Side, ThrowType
from app.models.lineup import Lineup

SORT_COLUMNS = {
    "latest": Lineup.created_at.desc(),
    "popular": Lineup.likes_count.desc(),
}


def build_lineup_query(
    q: str | None = None,
    map_name: MapName | None = None,
    site: str | None = None,
    agent: str | None = None,
    side: Side | None = None,
    ability: str | None = None,
    throw_type: ThrowType | None = None,
    source_type: LineupSource | None = None,
    sort: str = "latest",
    include_hidden: bool = False,
) -> Select[tuple[Lineup]]:
    stmt = select(Lineup)
    if not include_hidden:
        stmt = stmt.where(Lineup.is_hidden.is_(False))
    keyword = q.strip() if q else ""
    if keyword:
        like_keyword = f"%{keyword}%"
        stmt = stmt.where(
            or_(
                Lineup.agent.ilike(like_keyword),
                Lineup.ability.ilike(like_keyword),
                Lineup.site.ilike(like_keyword),
                Lineup.standing_description.ilike(like_keyword),
                Lineup.aim_description.ilike(like_keyword),
                Lineup.landing_description.ilike(like_keyword),
                Lineup.original_video_url.ilike(like_keyword),
            )
        )
    if map_name is not None:
        stmt = stmt.where(Lineup.map == map_name)
    if site:
        stmt = stmt.where(Lineup.site == site.lower())
    if agent:
        stmt = stmt.where(Lineup.agent == agent.lower())
    if side is not None:
        stmt = stmt.where(Lineup.side == side)
    if ability:
        stmt = stmt.where(Lineup.ability == ability.lower())
    if throw_type is not None:
        stmt = stmt.where(Lineup.throw_type == throw_type)
    if source_type is not None:
        stmt = stmt.where(Lineup.source_type == source_type)
    return stmt.options(
        selectinload(Lineup.standing_frame),
        selectinload(Lineup.aim_frame),
        selectinload(Lineup.landing_frame),
        selectinload(Lineup.steps),
    ).order_by(SORT_COLUMNS.get(sort, SORT_COLUMNS["latest"]))


async def get_lineup(db: AsyncSession, lineup_id: int, include_hidden: bool = False) -> Lineup | None:
    stmt = select(Lineup).where(Lineup.id == lineup_id)
    if not include_hidden:
        stmt = stmt.where(Lineup.is_hidden.is_(False))
    result = await db.execute(
        stmt.options(
            selectinload(Lineup.standing_frame),
            selectinload(Lineup.aim_frame),
            selectinload(Lineup.landing_frame),
            selectinload(Lineup.steps),
        )
    )
    return result.scalar_one_or_none()
