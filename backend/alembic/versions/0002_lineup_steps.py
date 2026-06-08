"""add lineup steps

Revision ID: 0002_lineup_steps
Revises: 0001_initial
Create Date: 2026-05-25 17:08:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_lineup_steps"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("lineups", sa.Column("site", sa.String(length=16), nullable=False, server_default="a"))
    op.create_index("ix_lineups_site", "lineups", ["site"])
    op.alter_column("lineups", "standing_frame_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("lineups", "aim_frame_id", existing_type=sa.Integer(), nullable=True)
    op.alter_column("lineups", "landing_frame_id", existing_type=sa.Integer(), nullable=True)

    op.create_table(
        "lineup_steps",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lineup_id", sa.Integer(), sa.ForeignKey("lineups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("image_path", sa.Text(), nullable=False),
        sa.Column("note", sa.Text(), nullable=False, server_default=""),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_lineup_steps_lineup_id", "lineup_steps", ["lineup_id"])
    op.create_index("ix_lineup_steps_order_index", "lineup_steps", ["order_index"])


def downgrade() -> None:
    op.drop_index("ix_lineup_steps_order_index", table_name="lineup_steps")
    op.drop_index("ix_lineup_steps_lineup_id", table_name="lineup_steps")
    op.drop_table("lineup_steps")

    op.alter_column("lineups", "landing_frame_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("lineups", "aim_frame_id", existing_type=sa.Integer(), nullable=False)
    op.alter_column("lineups", "standing_frame_id", existing_type=sa.Integer(), nullable=False)
    op.drop_index("ix_lineups_site", table_name="lineups")
    op.drop_column("lineups", "site")
