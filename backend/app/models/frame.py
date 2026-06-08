from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.enums import FrameRole, FrameSource


class Frame(Base):
    __tablename__ = "frames"

    id: Mapped[int] = mapped_column(primary_key=True)
    video_id: Mapped[int | None] = mapped_column(ForeignKey("videos.id", ondelete="SET NULL"))
    timestamp_ms: Mapped[int | None] = mapped_column(Integer, index=True)
    role: Mapped[FrameRole] = mapped_column(Enum(FrameRole), index=True)
    source: Mapped[FrameSource] = mapped_column(Enum(FrameSource), default=FrameSource.AUTO, index=True)
    image_path: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    video = relationship("Video", back_populates="frames")
