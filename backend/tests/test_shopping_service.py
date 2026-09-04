from app.models import RecipeIngredient
from app.services.shopping_service import (
    AggregatedIngredient,
    add_recipe_ingredient,
    conversion_hint,
    format_amounts,
)


def make_item(
    quantity: float | None,
    unit: str | None,
    note: str | None = None,
    alternative_quantity: float | None = None,
    alternative_unit: str | None = None,
):
    return RecipeIngredient(
        recipe_id=1,
        ingredient_id=1,
        source_text="test",
        quantity=quantity,
        unit=unit,
        note=note,
        alternative_quantity=alternative_quantity,
        alternative_unit=alternative_unit,
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


def test_formats_packaging_and_keeps_weight_as_hint() -> None:
    target = AggregatedIngredient(ingredient_id=1, name="Тунец")
    add_recipe_ingredient(target, make_item(2, "банка", None, 540, "г"))
    assert format_amounts(target) == "2 банки"
    assert conversion_hint(target, "тунец") == "Эквивалент из рецепта: 540 г"


def test_formats_branch_plural() -> None:
    target = AggregatedIngredient(ingredient_id=1, name="Петрушка")
    add_recipe_ingredient(target, make_item(4, "веточка", None, 8, "г"))
    assert format_amounts(target) == "4 веточки"


def test_marks_equivalent_as_partial_when_not_every_amount_has_one() -> None:
    target = AggregatedIngredient(ingredient_id=1, name="Соль")
    add_recipe_ingredient(target, make_item(0.5, "ч. л.", None, 3.5, "г"))
    add_recipe_ingredient(target, make_item(1, "ст. л."))

    assert conversion_hint(target, "соль") == "Эквивалент только для части количества: 3,5 г"
