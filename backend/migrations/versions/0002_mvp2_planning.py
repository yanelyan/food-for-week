"""Add MVP 2 planning settings and recipe categories."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_mvp2_planning"
down_revision: str | None = "0001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

meal_type = postgresql.ENUM(
    "breakfast", "lunch", "dinner", "dessert", name="mealtype", create_type=False
)


def upgrade() -> None:
    op.add_column("users", sa.Column("purchase_weekday", sa.Integer(), nullable=True))
    op.add_column(
        "users",
        sa.Column("timezone_name", sa.String(80), server_default="UTC", nullable=False),
    )
    op.add_column(
        "ingredients",
        sa.Column("is_pantry", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.create_table(
        "recipe_meal_types",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE")),
        sa.Column("meal_type", meal_type, nullable=False),
        sa.UniqueConstraint("recipe_id", "meal_type", name="uq_recipe_meal_type"),
    )
    op.create_index("ix_recipe_meal_types_recipe_id", "recipe_meal_types", ["recipe_id"])
    op.execute(
        sa.text(
            "INSERT INTO recipe_meal_types (recipe_id, meal_type) SELECT id, meal_type FROM recipes"
        )
    )


def downgrade() -> None:
    op.drop_table("recipe_meal_types")
    op.drop_column("ingredients", "is_pantry")
    op.drop_column("users", "timezone_name")
    op.drop_column("users", "purchase_weekday")
