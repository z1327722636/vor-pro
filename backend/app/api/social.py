from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.crud.lineups import get_lineup
from app.deps import CurrentUser, DbSession
from app.models.lineup_like import LineupLike
from app.models.lineup_report import LineupReport

router = APIRouter()


@router.post("/{lineup_id}/like", status_code=status.HTTP_204_NO_CONTENT)
async def like_lineup(lineup_id: int, db: DbSession, current_user: CurrentUser) -> None:
    lineup = await get_lineup(db, lineup_id)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    result = await db.execute(
        select(LineupLike).where(LineupLike.user_id == current_user.id, LineupLike.lineup_id == lineup_id)
    )
    if result.scalar_one_or_none() is None:
        db.add(LineupLike(user_id=current_user.id, lineup_id=lineup_id))
        lineup.likes_count += 1
        await db.commit()


@router.post("/{lineup_id}/report", status_code=status.HTTP_204_NO_CONTENT)
async def report_lineup(
    lineup_id: int,
    db: DbSession,
    current_user: CurrentUser,
    reason: str = "incorrect",
    detail: str | None = None,
) -> None:
    lineup = await get_lineup(db, lineup_id)
    if lineup is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lineup not found")
    result = await db.execute(
        select(LineupReport).where(LineupReport.user_id == current_user.id, LineupReport.lineup_id == lineup_id)
    )
    if result.scalar_one_or_none() is None:
        db.add(LineupReport(user_id=current_user.id, lineup_id=lineup_id, reason=reason, detail=detail))
        lineup.reports_count += 1
        if lineup.reports_count >= 3:
            lineup.is_hidden = True
        await db.commit()
