"""initial schema

Revision ID: 0001_initial
Revises:
Create Date: 2026-05-25 11:20:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    map_enum = sa.Enum("ASCENT", "BIND", "HAVEN", "SPLIT", "ICEBOX", "BREEZE", "FRACTURE", "PEARL", "LOTUS", "SUNSET", "ABYSS", name="mapname")
    side_enum = sa.Enum("ATTACK", "DEFENSE", name="side")
    throw_enum = sa.Enum("DIRECT", "JUMP_THROW", "WALK_THROW", "CROUCH_THROW", "LEFT_CLICK", "RIGHT_CLICK", name="throwtype")
    job_source_enum = sa.Enum("URL", "KEYWORD", "LOCAL_FILE", "MANUAL_UPLOAD", "VIDEO_FRAME_PICK", name="jobsource")
    job_status_enum = sa.Enum("PENDING", "DOWNLOADING", "SCENE_SPLIT", "CV_FILTER", "VLM_PARSE", "AWAIT_USER_PICK", "FRAME_GRAB", "VLM_DESCRIBE", "AWAIT_USER_CONFIRM", "DEDUP", "DONE", "FAILED", name="jobstatus")
    frame_role_enum = sa.Enum("STANDING", "AIM", "LANDING", name="framerole")
    frame_source_enum = sa.Enum("AUTO", "USER_PICKED", "USER_UPLOADED", name="framesource")
    lineup_source_enum = sa.Enum("AI_AUTO", "USER_MANUAL_UPLOAD", "USER_MANUAL_VIDEO", "USER_CORRECTED", name="lineupsource")

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    op.create_table(
        "videos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("platform", sa.String(length=64), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("uploader", sa.String(length=255)),
        sa.Column("title", sa.String(length=500)),
        sa.Column("duration_ms", sa.Integer()),
        sa.Column("raw_path", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_videos_platform", "videos", ["platform"])

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
        sa.Column("result", postgresql.JSONB()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_jobs_status", "jobs", ["status"])

    op.create_table(
        "frames",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("video_id", sa.Integer(), sa.ForeignKey("videos.id", ondelete="SET NULL")),
        sa.Column("timestamp_ms", sa.Integer()),
        sa.Column("role", frame_role_enum, nullable=False),
        sa.Column("source", frame_source_enum, nullable=False, server_default="AUTO"),
        sa.Column("image_path", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_frames_timestamp_ms", "frames", ["timestamp_ms"])
    op.create_index("ix_frames_role", "frames", ["role"])
    op.create_index("ix_frames_source", "frames", ["source"])

    op.create_table(
        "lineups",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("video_id", sa.Integer(), sa.ForeignKey("videos.id", ondelete="SET NULL")),
        sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL")),
        sa.Column("corrected_from_id", sa.Integer(), sa.ForeignKey("lineups.id", ondelete="SET NULL")),
        sa.Column("map", map_enum, nullable=False),
        sa.Column("agent", sa.String(length=64), nullable=False),
        sa.Column("side", side_enum, nullable=False),
        sa.Column("ability", sa.String(length=64), nullable=False),
        sa.Column("throw_type", throw_enum, nullable=False),
        sa.Column("standing_frame_id", sa.Integer(), sa.ForeignKey("frames.id"), nullable=False),
        sa.Column("aim_frame_id", sa.Integer(), sa.ForeignKey("frames.id"), nullable=False),
        sa.Column("landing_frame_id", sa.Integer(), sa.ForeignKey("frames.id"), nullable=False),
        sa.Column("standing_description", sa.Text(), nullable=False, server_default=""),
        sa.Column("aim_description", sa.Text(), nullable=False, server_default=""),
        sa.Column("landing_description", sa.Text(), nullable=False, server_default=""),
        sa.Column("minimap_x", sa.Float()),
        sa.Column("minimap_y", sa.Float()),
        sa.Column("landing_x", sa.Float()),
        sa.Column("landing_y", sa.Float()),
        sa.Column("source_type", lineup_source_enum, nullable=False, server_default="AI_AUTO"),
        sa.Column("correction_version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("dedup_hash", sa.String(length=128), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="0"),
        sa.Column("original_video_timestamp_ms", sa.Integer()),
        sa.Column("original_video_url", sa.Text()),
        sa.Column("likes_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reports_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    for column in ["map", "agent", "side", "ability", "throw_type", "source_type", "dedup_hash", "is_hidden"]:
        op.create_index(f"ix_lineups_{column}", "lineups", [column])

    op.create_table(
        "favorites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lineup_id", sa.Integer(), sa.ForeignKey("lineups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "lineup_id", name="uq_favorite_user_lineup"),
    )
    op.create_table(
        "lineup_likes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lineup_id", sa.Integer(), sa.ForeignKey("lineups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "lineup_id", name="uq_like_user_lineup"),
    )
    op.create_table(
        "lineup_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("lineup_id", sa.Integer(), sa.ForeignKey("lineups.id", ondelete="CASCADE"), nullable=False),
        sa.Column("reason", sa.String(length=100), nullable=False, server_default="incorrect"),
        sa.Column("detail", sa.Text()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "lineup_id", name="uq_report_user_lineup"),
    )


def downgrade() -> None:
    op.drop_table("lineup_reports")
    op.drop_table("lineup_likes")
    op.drop_table("favorites")
    op.drop_table("lineups")
    op.drop_table("frames")
    op.drop_table("jobs")
    op.drop_table("videos")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    for enum_name in [
        "lineupsource",
        "framesource",
        "framerole",
        "jobstatus",
        "jobsource",
        "throwtype",
        "side",
        "mapname",
    ]:
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
