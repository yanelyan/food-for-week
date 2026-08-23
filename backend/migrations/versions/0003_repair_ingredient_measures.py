"""Repair packaged measures and backfill pantry ingredients."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.services.ingredient_parser import is_pantry_ingredient, parse_ingredient

revision: str = "0003_repair_measures"
down_revision: str | None = "0002_mvp2_planning"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


REPAIR_WORDS = ("веточ", "пучок", "пучка", "пучков", "банк", "упаков")


def _repair_saved_ingredients() -> None:
    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            """
            SELECT
                ri.id AS recipe_ingredient_id,
                ri.ingredient_id,
                ri.source_text,
                r.user_id,
                i.normalized_name
            FROM recipe_ingredients AS ri
            JOIN recipes AS r ON r.id = ri.recipe_id
            JOIN ingredients AS i ON i.id = ri.ingredient_id
            """
        )
    ).mappings()

    for row in rows:
        source_text = row["source_text"]
        if not any(word in source_text.lower() for word in REPAIR_WORDS):
            continue
        parsed = parse_ingredient(source_text)
        if parsed.quantity is None:
            continue

        target_id = connection.execute(
            sa.text(
                """
                SELECT id FROM ingredients
                WHERE user_id = :user_id AND normalized_name = :normalized_name
                """
            ),
            {"user_id": row["user_id"], "normalized_name": parsed.normalized_name},
        ).scalar_one_or_none()

        if target_id is None:
            target_id = row["ingredient_id"]
            connection.execute(
                sa.text(
                    """
                    UPDATE ingredients
                    SET name = :name, normalized_name = :normalized_name
                    WHERE id = :ingredient_id
                    """
                ),
                {
                    "ingredient_id": target_id,
                    "name": parsed.name,
                    "normalized_name": parsed.normalized_name,
                },
            )

        connection.execute(
            sa.text(
                """
                UPDATE recipe_ingredients
                SET ingredient_id = :ingredient_id,
                    quantity = :quantity,
                    unit = :unit,
                    note = :note,
                    alternative_quantity = :alternative_quantity,
                    alternative_unit = :alternative_unit
                WHERE id = :recipe_ingredient_id
                """
            ),
            {
                "recipe_ingredient_id": row["recipe_ingredient_id"],
                "ingredient_id": target_id,
                "quantity": parsed.quantity,
                "unit": parsed.unit,
                "note": parsed.note,
                "alternative_quantity": parsed.alternative_quantity,
                "alternative_unit": parsed.alternative_unit,
            },
        )


def _backfill_pantry_flags() -> None:
    connection = op.get_bind()
    rows = connection.execute(sa.text("SELECT id, name FROM ingredients")).mappings()
    pantry_ids = [row["id"] for row in rows if is_pantry_ingredient(row["name"])]
    if pantry_ids:
        ingredients = sa.table(
            "ingredients",
            sa.column("id", sa.Integer()),
            sa.column("is_pantry", sa.Boolean()),
        )
        connection.execute(
            ingredients.update().where(ingredients.c.id.in_(pantry_ids)).values(is_pantry=True)
        )


def upgrade() -> None:
    _repair_saved_ingredients()
    _backfill_pantry_flags()


def downgrade() -> None:
    # The original imported values cannot be restored reliably.
    pass
