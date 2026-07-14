"""remove AI pipeline: drop jobs table, clean up enums

Revision ID: 0004_remove_ai_pipeline
Revises: 0003_admin_users
Create Date: 2026-07-13 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0004_remove_ai_pipeline"
down_revision = "0003_admin_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Drop jobs table and its index
    op.drop_index("ix_jobs_status", table_name="jobs")
    op.drop_table("jobs")

    # 2. Drop job-related enum types
    sa.Enum(name="jobsource").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="jobstatus").drop(op.get_bind(), checkfirst=True)

    # 3. Replace framesource enum: remove AUTO
    op.execute(
        "UPDATE frames SET source = 'USER_PICKED' WHERE source = 'AUTO'"
    )
    op.execute("ALTER TYPE framesource RENAME TO framesource_old")
    new_framesource = sa.Enum("USER_PICKED", "USER_UPLOADED", name="framesource")
    new_framesource.create(op.get_bind(), checkfirst=True)
    op.execute(
        "ALTER TABLE frames ALTER COLUMN source TYPE framesource "
        "USING source::text::framesource"
    )
    op.execute("DROP TYPE framesource_old")
    # Rebuild source index after type change
    op.drop_index("ix_frames_source", table_name="frames")
    op.create_index("ix_frames_source", "frames", ["source"])

    # 4. Replace lineupsource enum: remove AI_AUTO
    op.execute(
        "UPDATE lineups SET source_type = 'USER_MANUAL_UPLOAD' WHERE source_type = 'AI_AUTO'"
    )
    op.execute("ALTER TYPE lineupsource RENAME TO lineupsource_old")
    new_lineupsource = sa.Enum(
        "USER_MANUAL_UPLOAD", "USER_MANUAL_VIDEO", "USER_CORRECTED", name="lineupsource"
    )
    new_lineupsource.create(op.get_bind(), checkfirst=True)
    op.execute(
        "ALTER TABLE lineups ALTER COLUMN source_type TYPE lineupsource "
        "USING source_type::text::lineupsource"
    )
    op.execute("DROP TYPE lineupsource_old")
    # Rebuild source_type index after type change
    op.drop_index("ix_lineups_source_type", table_name="lineups")
    op.create_index("ix_lineups_source_type", "lineups", ["source_type"])


def downgrade() -> None:
    # 1. Restore lineupsource with AI_AUTO
    op.execute("ALTER TYPE lineupsource RENAME TO lineupsource_new")
    old_lineupsource = sa.Enum(
        "AI_AUTO", "USER_MANUAL_UPLOAD", "USER_MANUAL_VIDEO", "USER_CORRECTED",
        name="lineupsource"
    )
    old_lineupsource.create(op.get_bind(), checkfirst=True)
    op.execute(
        "ALTER TABLE lineups ALTER COLUMN source_type TYPE lineupsource "
        "USING source_type::text::lineupsource"
    )
    op.execute("DROP TYPE lineupsource_new")
    op.drop_index("ix_lineups_source_type", table_name="lineups")
    op.create_index("ix_lineups_source_type", "lineups", ["source_type"])

    # 2. Restore framesource with AUTO
    op.execute("ALTER TYPE framesource RENAME TO framesource_new")
    old_framesource = sa.Enum(
        "AUTO", "USER_PICKED", "USER_UPLOADED", name="framesource"
    )
    old_framesource.create(op.get_bind(), checkfirst=True)
    op.execute(
        "ALTER TABLE frames ALTER COLUMN source TYPE framesource "
        "USING source::text::framesource"
    )
    op.execute("DROP TYPE framesource_new")
    op.drop_index("ix_frames_source", table_name="frames")
    op.create_index("ix_frames_source", "frames", ["source"])

    # 3. Restore jobstatus and jobsource enums
    sa.Enum(
        "URL", "KEYWORD", "LOCAL_FILE", "MANUAL_UPLOAD", "VIDEO_FRAME_PICK",
        name="jobsource"
    ).create(op.get_bind(), checkfirst=True)
    sa.Enum(
        "PENDING", "DOWNLOADING", "SCENE_SPLIT", "CV_FILTER", "VLM_PARSE",
        "AWAIT_USER_PICK", "FRAME_GRAB", "VLM_DESCRIBE", "AWAIT_USER_CONFIRM",
        "DEDUP", "DONE", "FAILED", name="jobstatus"
    ).create(op.get_bind(), checkfirst=True)

    # 4. Restore jobs table
    job_source_enum = sa.Enum(
        "URL", "KEYWORD", "LOCAL_FILE", "MANUAL_UPLOAD", "VIDEO_FRAME_PICK",
        name="jobsource"
    )
    job_status_enum = sa.Enum(
        "PENDING", "DOWNLOADING", "SCENE_SPLIT", "CV_FILTER", "VLM_PARSE",
        "AWAIT_USER_PICK", "FRAME_GRAB", "VLM_DESCRIBE", "AWAIT_USER_CONFIRM",
        "DEDUP", "DONE", "FAILED", name="jobstatus"
    )
    op.create_table(
        "jobs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("video_id", sa.Integer(), sa.ForeignKey("videos.id", ondelete="SET NULL")),
        sa.Column("source_type", job_source_enum, nullable=False),
        sa.Column("source_url", sa.Text()),
        sa.Column("keyword", sa.String(length=255)),
        sa.Column("status", job_status_enum, nullable=False, server_default="PENDING"),
        sa.Column("progress", sa.Float(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.String(length=100)),
        sa.Column("error_message", sa.Text()),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("result", sa.dialects.postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_jobs_status", "jobs", ["status"])
