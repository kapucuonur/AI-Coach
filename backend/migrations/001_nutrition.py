"""Add nutrition tracking tables

Revision ID: 001_nutrition
Revises: 
Create Date: 2026-02-16

"""
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    
    # Create nutrition_entries table
    op.create_table(
        'nutrition_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_email', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('meal_time', sa.DateTime(), nullable=False),
        sa.Column('calories', sa.Float(), nullable=False),
        sa.Column('protein', sa.Float(), nullable=False),
        sa.Column('carbs', sa.Float(), nullable=False),
        sa.Column('fats', sa.Float(), nullable=False),
        sa.Column('food_description', sa.String(), nullable=False),
        sa.Column('confidence', sa.String(), nullable=True),
        sa.Column('image_data', sa.String(), nullable=True),
        sa.ForeignKeyConstraint(['user_email'], ['users.email'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_nutrition_entries_id'), 'nutrition_entries', ['id'], unique=False)

def downgrade():
    op.drop_index(op.f('ix_nutrition_entries_id'), table_name='nutrition_entries')
    op.drop_table('nutrition_entries')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
