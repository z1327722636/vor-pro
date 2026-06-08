from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class LineupLike(Base):
    __tablename__ = "lineup_likes"
    __table_args__ = (UniqueConstraint("user_id", "lineup_id", name="uq_like_user_lineup"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    lineup_id: Mapped[int] = mapped_column(ForeignKey("lineups.id", ondelete="CASCADE"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="likes")
    lineup = relationship("Lineup", back_populates="likes")
