from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base

EMAIL_PROVIDER = "email"
WECHAT_MINIPROGRAM_PROVIDER = "wechat_miniprogram"
WECHAT_UNIONID_PROVIDER = "wechat_unionid"
RESERVED_EMAIL_DOMAINS = frozenset({"wechat.example.com"})


def is_reserved_email(email: str) -> bool:
    _, separator, domain = email.strip().lower().rpartition("@")
    return bool(separator) and domain in RESERVED_EMAIL_DOMAINS


class UserIdentity(Base):
    __tablename__ = "user_identities"
    __table_args__ = (
        UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_user_identities_provider_user_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    provider_user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="identities")
