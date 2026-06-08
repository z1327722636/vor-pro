from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, select, update

from app.crud.lineups import build_lineup_query, get_lineup
from app.deps import CurrentUser, DbSession
from app.enums import LineupSource, MapName, Side, ThrowType
from app.models.favorite import Favorite
from app.models.lineup import Lineup
from app.schemas.lineup import (
    LineupCreate,
    LineupResponse,
    UserLineupBulkDelete,
    UserLineupBulkUpdate,
    UserLineupUpdate,
    lineup_response,
)

router = APIRouter()


@router.get("", response_model=list[LineupResponse])
async def list_lineups(
    db: DbSession,
    q: str | None = None,
    map_name: MapName | None = Query(default=None, alias="map"),
    site: str | None = None,
    agent: str | None = None,
    side: Side | None = None,
    ability: str | None = None,
    throw_type: ThrowType | None = None,
    source_type: LineupSource | None = None,
    sort: str = "latest",
    limit: int = Query(default=24, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
) -> list[LineupResponse]:
    stmt = (
        build_lineup_query(q, map_name, site, agent, side, ability, throw_type, source_type, sort)
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return [lineup_response(item) for item in result.scalars().all()]


@router.post("", response_model=LineupResponse, status_code=status.HTTP_201_CREATED)
async def create_lineup(payload: LineupCreate, db: DbSession, current_user: CurrentUser) -> LineupResponse:
    lineup = Lineup(**payload.model_dump(), author_user_id=current_user.id)
    db.add(lineup)
    await db.commit()
    await db.refresh(lineup)
    return lineup_response(lineup)


@router.get("/mine", response_model=list[LineupResponse])
async def list_my_lineups(
    db: DbSession,
    current_user: CurrentUser,
    q: str | None = None,
    map_name: MapName | None = Query(default=None, alias="map"),
    site: str | None = None,
    agent: str | None = None,
    side: Side | None = None,
    ability: str | None = None,
    throw_type: ThrowType | None = None,
    source_type: LineupSource | None = None,
    sort: str = "latest",
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> list[LineupResponse]:
    stmt = (
        build_lineup_query(
            q,
            map_name,
            site,
            agent,
            side,
            ability,
            throw_type,
            source_type,
            sort,
            include_hidden=True,
        )
        .where(Lineup.author_user_id == current_user.id)
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return [lineup_response(item) for item in result.scalars().all()]


@router.patch("/mine/bulk", response_model=dict[str, int])
async def bulk_update_my_lineups(
    payload: UserLineupBulkUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, int]:
    result = await db.execute(
        update(Lineup)
        .where(Lineup.author_user_id == current_user.id, Lineup.id.in_(payload.ids))
        .values(is_hidden=payload.is_hidden)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return {"updated": result.rowcount or 0}


@router.delete("/mine/bulk", response_model=dict[str, int])
async def bulk_delete_my_lineups(
    payload: UserLineupBulkDelete,
    db: DbSession,
    current_user: CurrentUser,
) -> dict[str, int]:
    result = await db.execute(
        delete(Lineup).where(Lineup.author_user_id == current_user.id, Lineup.id.in_(payload.ids))
    )
    await db.commit()
    return {"deleted": result.rowcount or 0}


@router.get("/mine/{lineup_id}", response_model=LineupResponse)
async def read_my_lineup(lineup_id: int, db: DbSession, current_user: CurrentUser) -> LineupResponse:
    lineup = await get_lineup(db, lineup_id, include_hidden=True)
    if lineup is None or lineup.author_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    return lineup_response(lineup)


@router.patch("/mine/{lineup_id}", response_model=LineupResponse)
async def update_my_lineup(
    lineup_id: int,
    payload: UserLineupUpdate,
    db: DbSession,
    current_user: CurrentUser,
) -> LineupResponse:
    lineup = await get_lineup(db, lineup_id, include_hidden=True)
    if lineup is None or lineup.author_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lineup, field, value)

    await db.commit()
    await db.refresh(lineup)
    return lineup_response(lineup)


@router.delete("/mine/{lineup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_lineup(lineup_id: int, db: DbSession, current_user: CurrentUser) -> None:
    lineup = await get_lineup(db, lineup_id, include_hidden=True)
    if lineup is None or lineup.author_user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")

    await db.delete(lineup)
    await db.commit()


@router.get("/{lineup_id}", response_model=LineupResponse)
async def read_lineup(lineup_id: int, db: DbSession) -> LineupResponse:
    lineup = await get_lineup(db, lineup_id)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    return lineup_response(lineup)


@router.post("/{lineup_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def favorite_lineup(lineup_id: int, db: DbSession, current_user: CurrentUser) -> None:
    lineup = await get_lineup(db, lineup_id)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    exists = await db.execute(
        select(Favorite).where(Favorite.user_id == current_user.id, Favorite.lineup_id == lineup_id)
    )
    if exists.scalar_one_or_none() is None:
        db.add(Favorite(user_id=current_user.id, lineup_id=lineup_id))
        await db.commit()


@router.delete("/{lineup_id}/favorite", status_code=status.HTTP_204_NO_CONTENT)
async def unfavorite_lineup(lineup_id: int, db: DbSession, current_user: CurrentUser) -> None:
    await db.execute(delete(Favorite).where(Favorite.user_id == current_user.id, Favorite.lineup_id == lineup_id))
    await db.commit()
