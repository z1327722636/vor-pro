"""add admin flag to users

Revision ID: 0003_admin_users
Revises: 0002_lineup_steps
Create Date: 2026-05-26 12:30:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0003_admin_users"
down_revision = "0002_lineup_steps"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "is_admin")
