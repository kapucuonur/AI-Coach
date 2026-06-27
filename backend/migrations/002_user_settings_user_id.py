"""Add user_id to user_settings and remove global unique constraint on key

Revision ID: 002_user_settings_user_id
Revises: 001_nutrition
Create Date: 2026-04-04

This migration:
1. Adds user_id column (FK to users.id, nullable) to user_settings
2. Drops the global unique index on user_settings.key
3. Creates a non-unique index on user_settings.key
4. Creates an index on user_settings.user_id
"""
from alembic import op
import sqlalchemy as sa


def upgrade():
    # 1. Add user_id column (nullable so existing rows are preserved)
    try:
        op.add_column(
            'user_settings',
            sa.Column('user_id', sa.Integer(), nullable=True)
        )
    except Exception as e:
        print(f"Column may already exist, skipping: {e}")

    # 2. Add foreign key constraint (PostgreSQL supports this)
    try:
        op.create_foreign_key(
            'fk_user_settings_user_id',
            'user_settings',
            'users',
            ['user_id'],
            ['id'],
            ondelete='CASCADE'
        )
    except Exception as e:
        print(f"FK may already exist, skipping: {e}")

    # 3. Drop old unique index on key
    try:
        op.drop_index('ix_user_settings_key', table_name='user_settings')
    except Exception as e:
        print(f"Old unique index may not exist, skipping: {e}")

    # 4. Create new non-unique index on key
    try:
        op.create_index('ix_user_settings_key', 'user_settings', ['key'], unique=False)
    except Exception as e:
        print(f"Index creation skipped: {e}")

    # 5. Create index on user_id for fast lookups
    try:
        op.create_index('ix_user_settings_user_id', 'user_settings', ['user_id'], unique=False)
    except Exception as e:
        print(f"user_id index creation skipped: {e}")


def downgrade():
    op.drop_index('ix_user_settings_user_id', table_name='user_settings')
    op.drop_index('ix_user_settings_key', table_name='user_settings')
    op.create_index('ix_user_settings_key', 'user_settings', ['key'], unique=True)
    op.drop_constraint('fk_user_settings_user_id', 'user_settings', type_='foreignkey')
    op.drop_column('user_settings', 'user_id')
