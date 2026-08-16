import pytest

from app.services.ingredient_parser import parse_ingredient


@pytest.mark.parametrize(
    ("source", "name", "quantity", "unit", "alternative_quantity", "alternative_unit"),
    [
        ("Паста фузилли 225 г", "Паста фузилли", 225, "г", None, None),
        ("Помидор 2 шт. = 180 г", "Помидор", 2, "шт.", 180, "г"),
        ("Соль 0,5 ч. л. = 3,5 г", "Соль", 0.5, "ч. л.", 3.5, "г"),
        ("Лимон ⅓ шт.", "Лимон", 1 / 3, "шт.", None, None),
    ],
)
def test_parse_numeric_ingredient(
    source: str,
    name: str,
    quantity: float,
    unit: str,
    alternative_quantity: float | None,
    alternative_unit: str | None,
) -> None:
    parsed = parse_ingredient(source)
    assert parsed.name == name
    assert parsed.quantity == pytest.approx(quantity)
    assert parsed.unit == unit
    assert parsed.alternative_quantity == alternative_quantity
    assert parsed.alternative_unit == alternative_unit


def test_parse_qualitative_ingredient_without_fake_quantity() -> None:
    parsed = parse_ingredient("Соль по вкусу")
    assert parsed.name == "Соль"
    assert parsed.quantity is None
    assert parsed.note == "по вкусу"


def test_normalizes_known_synonym() -> None:
    parsed = parse_ingredient("Томаты 2 шт.")
    assert parsed.normalized_name == "помидор"
