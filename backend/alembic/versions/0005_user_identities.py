"""add user identities

Revision ID: 0005_user_identities
Revises: 0004_remove_ai_pipeline
Create Date: 2026-07-14 00:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = "0005_user_identities"
down_revision = "0004_remove_ai_pipeline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    duplicate_email_count = bind.execute(
        sa.text(
            """
            SELECT count(*)
            FROM (
                SELECT lower(email)
                FROM users
                WHERE email IS NOT NULL
                GROUP BY lower(email)
                HAVING count(*) > 1
            ) AS duplicate_emails
            """
        )
    ).scalar_one()
    if duplicate_email_count:
        raise RuntimeError("Duplicate emails after lower-case normalization must be merged first")

    op.execute("UPDATE users SET email = lower(email) WHERE email IS NOT NULL")
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=True)
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=True)

    op.create_index(
        "ix_users_email_lower",
        "users",
        [sa.text("lower(email)")],
        unique=True,
        postgresql_where=sa.text("email IS NOT NULL"),
    )

    op.create_table(
        "user_identities",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(length=64), nullable=False),
        sa.Column("provider_user_id", sa.String(length=255), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_user_identities_provider_user_id",
        ),
    )
    op.create_index("ix_user_identities_user_id", "user_identities", ["user_id"])
    op.create_index("ix_user_identities_provider", "user_identities", ["provider"])

    op.execute(
        """
        INSERT INTO user_identities (user_id, provider, provider_user_id, created_at)
        SELECT id, 'email', email, COALESCE(created_at, now())
        FROM users
        WHERE email IS NOT NULL
        """
    )


def downgrade() -> None:
    bind = op.get_bind()
    passwordless_count = bind.execute(
        sa.text("SELECT count(*) FROM users WHERE password_hash IS NULL")
    ).scalar_one()
    if passwordless_count:
        raise RuntimeError("Cannot downgrade while passwordless WeChat-only users exist")

    op.drop_index("ix_users_email_lower", table_name="users")
    op.drop_index("ix_user_identities_provider", table_name="user_identities")
    op.drop_index("ix_user_identities_user_id", table_name="user_identities")
    op.drop_table("user_identities")

    op.execute(
        "UPDATE users SET email = concat('legacy-user-', id, '@wechat.example.com') "
        "WHERE email IS NULL"
    )
    op.alter_column("users", "password_hash", existing_type=sa.String(length=255), nullable=False)
    op.alter_column("users", "email", existing_type=sa.String(length=255), nullable=False)
