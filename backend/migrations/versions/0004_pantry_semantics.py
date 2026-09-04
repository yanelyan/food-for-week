"""Keep pantry checks in place and exclude butter from pantry."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

from app.services.ingredient_parser import parse_ingredient

revision: str = "0004_pantry_semantics"
down_revision: str | None = "0003_repair_measures"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _repair_saved_feathers() -> None:
    connection = op.get_bind()
    rows = connection.execute(
        sa.text(
            """
            SELECT
                ri.id AS recipe_ingredient_id,
                ri.ingredient_id,
                ri.source_text,
                r.user_id
            FROM recipe_ingredients AS ri
            JOIN recipes AS r ON r.id = ri.recipe_id
            """
        )
    ).mappings()

    for row in rows:
        source_text = row["source_text"]
        if not any(word in source_text.lower() for word in ("перо", "пера", "перьев")):
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


def _move_butter_to_shopping_list() -> None:
    connection = op.get_bind()
    butter_ids = list(
        connection.execute(
            sa.text(
                """
                SELECT id FROM ingredients
                WHERE normalized_name LIKE :butter AND normalized_name LIKE :oil
                """
            ),
            {"butter": "%сливоч%", "oil": "%масл%"},
        ).scalars()
    )
    if not butter_ids:
        return

    shopping_checks = sa.table(
        "shopping_checks",
        sa.column("ingredient_id", sa.Integer()),
    )
    ingredients = sa.table(
        "ingredients",
        sa.column("id", sa.Integer()),
        sa.column("is_pantry", sa.Boolean()),
    )
    connection.execute(
        shopping_checks.delete().where(shopping_checks.c.ingredient_id.in_(butter_ids))
    )
    connection.execute(
        ingredients.update().where(ingredients.c.id.in_(butter_ids)).values(is_pantry=False)
    )


def upgrade() -> None:
    _repair_saved_feathers()
    _move_butter_to_shopping_list()


def downgrade() -> None:
    # User inventory choices cannot be restored reliably.
    pass
