from app.models import RecipeIngredient
from app.services.shopping_service import (
    AggregatedIngredient,
    add_recipe_ingredient,
    conversion_hint,
    format_amounts,
)


def make_item(quantity: float | None, unit: str | None, note: str | None = None):
    return RecipeIngredient(
        recipe_id=1,
        ingredient_id=1,
        source_text="test",
        quantity=quantity,
        unit=unit,
        note=note,
    )


def test_combines_compatible_units_and_keeps_incompatible_separate() -> None:
    target = AggregatedIngredient(ingredient_id=1, name="Мука")
    add_recipe_ingredient(target, make_item(300, "г"))
    add_recipe_ingredient(target, make_item(0.2, "кг"))
    add_recipe_ingredient(target, make_item(3, "ст. л."))
    assert format_amounts(target) == "500 г + 3 ст. л."
    assert conversion_hint(target, "мука") == "Примерно: 30 г"


def test_keeps_qualitative_amount() -> None:
    target = AggregatedIngredient(ingredient_id=1, name="Соль")
    add_recipe_ingredient(target, make_item(5, "г"))
    add_recipe_ingredient(target, make_item(None, None, "по вкусу"))
    assert format_amounts(target) == "5 г + по вкусу"
