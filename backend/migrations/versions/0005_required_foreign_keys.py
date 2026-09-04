"""Make required foreign keys non-nullable."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005_required_foreign_keys"
down_revision: str | None = "0004_pantry_semantics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

REQUIRED_FOREIGN_KEYS = {
    "recipes": ("user_id",),
    "ingredients": ("user_id",),
    "recipe_ingredients": ("recipe_id", "ingredient_id"),
    "planned_recipes": ("user_id", "recipe_id"),
    "shopping_checks": ("user_id", "ingredient_id"),
    "import_jobs": ("user_id",),
    "recipe_meal_types": ("recipe_id",),
}


def _set_nullable(nullable: bool) -> None:
    for table_name, columns in REQUIRED_FOREIGN_KEYS.items():
        with op.batch_alter_table(table_name) as batch_op:
            for column_name in columns:
                batch_op.alter_column(
                    column_name,
                    existing_type=sa.Integer(),
                    nullable=nullable,
                )


def upgrade() -> None:
    _set_nullable(False)


def downgrade() -> None:
    _set_nullable(True)
