from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.enums import LineupSource, MapName, Side, ThrowType


class Lineup(Base):
    __tablename__ = "lineups"

    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int | None] = mapped_column(ForeignKey("videos.id", ondelete="SET NULL"))
    author_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    corrected_from_id: Mapped[int | None] = mapped_column(
        ForeignKey("lineups.id", ondelete="SET NULL")
    )

    map: Mapped[MapName] = mapped_column(Enum(MapName), index=True)
    agent: Mapped[str] = mapped_column(String(64), index=True)
    side: Mapped[Side] = mapped_column(Enum(Side), index=True)
    ability: Mapped[str] = mapped_column(String(64), index=True)
    throw_type: Mapped[ThrowType] = mapped_column(Enum(ThrowType), index=True)
    site: Mapped[str] = mapped_column(String(16), default="a", server_default="a", index=True)

    standing_frame_id: Mapped[int | None] = mapped_column(ForeignKey("frames.id"))
    aim_frame_id: Mapped[int | None] = mapped_column(ForeignKey("frames.id"))
    landing_frame_id: Mapped[int | None] = mapped_column(ForeignKey("frames.id"))

    standing_description: Mapped[str] = mapped_column(Text, default="")
    aim_description: Mapped[str] = mapped_column(Text, default="")
    landing_description: Mapped[str] = mapped_column(Text, default="")
    minimap_x: Mapped[float | None] = mapped_column(Float)
    minimap_y: Mapped[float | None] = mapped_column(Float)
    landing_x: Mapped[float | None] = mapped_column(Float)
    landing_y: Mapped[float | None] = mapped_column(Float)

    source_type: Mapped[LineupSource] = mapped_column(
        Enum(LineupSource), default=LineupSource.AI_AUTO, index=True
    )
    correction_version: Mapped[int] = mapped_column(Integer, default=1)
    dedup_hash: Mapped[str] = mapped_column(String(128), index=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    original_video_timestamp_ms: Mapped[int | None] = mapped_column(Integer)
    original_video_url: Mapped[str | None] = mapped_column(Text)

    likes_count: Mapped[int] = mapped_column(Integer, default=0)
    reports_count: Mapped[int] = mapped_column(Integer, default=0)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    video = relationship("Video", back_populates="lineups")
    standing_frame = relationship("Frame", foreign_keys=[standing_frame_id])
    aim_frame = relationship("Frame", foreign_keys=[aim_frame_id])
    landing_frame = relationship("Frame", foreign_keys=[landing_frame_id])
    corrected_from = relationship("Lineup", remote_side=[id])
    favorites = relationship("Favorite", back_populates="lineup", cascade="all, delete-orphan")
    likes = relationship("LineupLike", back_populates="lineup", cascade="all, delete-orphan")
    reports = relationship("LineupReport", back_populates="lineup", cascade="all, delete-orphan")
    steps = relationship(
        "LineupStep",
        back_populates="lineup",
        cascade="all, delete-orphan",
        order_by="LineupStep.order_index",
    )
