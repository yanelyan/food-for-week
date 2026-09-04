import pytest

from app.services.ingredient_parser import is_pantry_ingredient, parse_ingredient


@pytest.mark.parametrize(
    ("source", "name", "quantity", "unit", "alternative_quantity", "alternative_unit"),
    [
        ("Паста фузилли 225 г", "Паста фузилли", 225, "г", None, None),
        ("Помидор 2 шт. = 180 г", "Помидор", 2, "шт.", 180, "г"),
        ("Соль 0,5 ч. л. = 3,5 г", "Соль", 0.5, "ч. л.", 3.5, "г"),
        ("Лимон ⅓ шт.", "Лимон", 1 / 3, "шт.", None, None),
        ("Петрушка 4 веточка = 8 г", "Петрушка", 4, "веточка", 8, "г"),
        ("Укроп 2 веточка = 4 г", "Укроп", 2, "веточка", 4, "г"),
        (
            "Тунец кусочками в собственном соку 2 банка / 540 г = 540 г",
            "Тунец кусочками в собственном соку",
            2,
            "банка",
            540,
            "г",
        ),
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


def test_keeps_feathers_as_main_amount_and_grams_as_hint() -> None:
    parsed = parse_ingredient("Зеленый лук 3 пера = 30 г")
    assert parsed.name == "Зеленый лук"
    assert parsed.quantity == 3
    assert parsed.unit == "перо"
    assert parsed.alternative_quantity == 30
    assert parsed.alternative_unit == "г"


def test_drops_egg_weight_equivalent() -> None:
    parsed = parse_ingredient("Яйца 2 шт. = 100 г")
    assert parsed.quantity == 2
    assert parsed.unit == "шт."
    assert parsed.alternative_quantity is None


def test_converts_liquid_glasses_and_spoons_to_milliliters() -> None:
    glass = parse_ingredient("Молоко 1 стакан = 200 г")
    spoon = parse_ingredient("Вода 2 ст. л.")
    assert (glass.quantity, glass.unit) == (250, "мл")
    assert (spoon.quantity, spoon.unit) == (30, "мл")


def test_butter_is_not_classified_as_pantry_oil() -> None:
    assert is_pantry_ingredient("Оливковое масло") is True
    assert is_pantry_ingredient("Сливочное масло") is False


def test_fresh_pepper_is_not_classified_as_spice() -> None:
    assert is_pantry_ingredient("Красный болгарский перец") is False
    assert is_pantry_ingredient("Перец сладкий") is False
    assert is_pantry_ingredient("Черный перец") is True


def test_garlic_powder_is_classified_as_pantry_spice() -> None:
    assert is_pantry_ingredient("Чесночный порошок") is True
    assert is_pantry_ingredient("Чеснок") is False
