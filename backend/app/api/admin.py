from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import delete, update

from app.crud.lineups import build_lineup_query, get_lineup
from app.deps import CurrentAdmin, DbSession
from app.enums import LineupSource, MapName, Side, ThrowType
from app.models.lineup import Lineup
from app.schemas.lineup import (
    AdminLineupBulkDelete,
    AdminLineupBulkUpdate,
    AdminLineupCreate,
    AdminLineupUpdate,
    LineupResponse,
    lineup_response,
)

router = APIRouter()


@router.get("/lineups", response_model=list[LineupResponse])
async def list_admin_lineups(
    db: DbSession,
    current_admin: CurrentAdmin,
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
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return [lineup_response(item) for item in result.scalars().all()]


@router.post("/lineups", response_model=LineupResponse, status_code=status.HTTP_201_CREATED)
async def create_admin_lineup(
    payload: AdminLineupCreate,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> LineupResponse:
    data = payload.model_dump()
    dedup_hash = data.pop("dedup_hash") or f"admin:{uuid4().hex}"
    lineup = Lineup(
        **data,
        dedup_hash=dedup_hash,
        author_user_id=current_admin.id,
    )
    db.add(lineup)
    await db.commit()
    await db.refresh(lineup)
    return lineup_response(lineup)


@router.patch("/lineups/bulk", response_model=dict[str, int])
async def bulk_update_admin_lineups(
    payload: AdminLineupBulkUpdate,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> dict[str, int]:
    result = await db.execute(
        update(Lineup)
        .where(Lineup.id.in_(payload.ids))
        .values(is_hidden=payload.is_hidden)
        .execution_options(synchronize_session=False)
    )
    await db.commit()
    return {"updated": result.rowcount or 0}


@router.delete("/lineups/bulk", response_model=dict[str, int])
async def bulk_delete_admin_lineups(
    payload: AdminLineupBulkDelete,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> dict[str, int]:
    result = await db.execute(delete(Lineup).where(Lineup.id.in_(payload.ids)))
    await db.commit()
    return {"deleted": result.rowcount or 0}


@router.get("/lineups/{lineup_id}", response_model=LineupResponse)
async def read_admin_lineup(
    lineup_id: int,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> LineupResponse:
    lineup = await get_lineup(db, lineup_id, include_hidden=True)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    return lineup_response(lineup)


@router.patch("/lineups/{lineup_id}", response_model=LineupResponse)
async def update_admin_lineup(
    lineup_id: int,
    payload: AdminLineupUpdate,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> LineupResponse:
    lineup = await get_lineup(db, lineup_id, include_hidden=True)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(lineup, field, value)

    await db.commit()
    await db.refresh(lineup)
    return lineup_response(lineup)


@router.delete("/lineups/{lineup_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin_lineup(
    lineup_id: int,
    db: DbSession,
    current_admin: CurrentAdmin,
) -> None:
    lineup = await get_lineup(db, lineup_id, include_hidden=True)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")

    await db.delete(lineup)
    await db.commit()
