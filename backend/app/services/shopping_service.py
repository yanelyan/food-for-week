from collections import defaultdict
from dataclasses import dataclass, field

from app.models import RecipeIngredient


@dataclass
class AggregatedIngredient:
    ingredient_id: int
    name: str
    quantities: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    notes: set[str] = field(default_factory=set)
    alternative_quantities: dict[str, float] = field(default_factory=lambda: defaultdict(float))
    quantified_source_count: int = 0
    alternative_source_count: int = 0


COMMON_CONVERSIONS: dict[str, dict[str, tuple[float, str]]] = {
    "вода": {"ч. л.": (5, "мл"), "ст. л.": (15, "мл"), "стакан": (250, "мл")},
    "мука": {"ч. л.": (3, "г"), "ст. л.": (10, "г"), "стакан": (160, "г")},
    "сахар": {"ч. л.": (5, "г"), "ст. л.": (20, "г"), "стакан": (200, "г")},
}


def canonical_quantity(quantity: float, unit: str) -> tuple[float, str]:
    if unit == "кг":
        return quantity * 1000, "г"
    if unit == "л":
        return quantity * 1000, "мл"
    return quantity, unit


def format_quantity(value: float) -> str:
    rounded = round(value, 2)
    if rounded.is_integer():
        return str(int(rounded))
    return f"{rounded:g}".replace(".", ",")


def display_quantity(quantity: float, unit: str) -> str:
    if unit == "г" and quantity >= 1000:
        return f"{format_quantity(quantity / 1000)} кг"
    if unit == "мл" and quantity >= 1000:
        return f"{format_quantity(quantity / 1000)} л"
    forms = {
        "перо": ("перо", "пера", "перьев"),
        "веточка": ("веточка", "веточки", "веточек"),
        "пучок": ("пучок", "пучка", "пучков"),
        "банка": ("банка", "банки", "банок"),
        "упаковка": ("упаковка", "упаковки", "упаковок"),
    }
    if unit in forms:
        integer = int(quantity) if quantity.is_integer() else None
        if integer is not None:
            last_two = integer % 100
            last = integer % 10
            if last_two not in range(11, 15) and last == 1:
                unit = forms[unit][0]
            elif last_two not in range(11, 15) and last in {2, 3, 4}:
                unit = forms[unit][1]
            else:
                unit = forms[unit][2]
        else:
            unit = forms[unit][1]
    return f"{format_quantity(quantity)} {unit}".strip()


def add_recipe_ingredient(target: AggregatedIngredient, item: RecipeIngredient) -> None:
    if item.quantity is not None and item.unit:
        target.quantified_source_count += 1
        quantity, unit = canonical_quantity(item.quantity, item.unit)
        target.quantities[unit] += quantity
    elif item.quantity is not None:
        target.quantified_source_count += 1
        target.quantities[""] += item.quantity
    if item.note:
        target.notes.add(item.note)
    if item.alternative_quantity is not None and item.alternative_unit:
        target.alternative_source_count += 1
        quantity, unit = canonical_quantity(item.alternative_quantity, item.alternative_unit)
        target.alternative_quantities[unit] += quantity


def format_amounts(target: AggregatedIngredient) -> str:
    parts = [
        display_quantity(quantity, unit)
        for unit, quantity in sorted(target.quantities.items(), key=lambda value: value[0])
    ]
    parts.extend(sorted(target.notes))
    return " + ".join(parts) if parts else "количество не указано"


def conversion_hint(target: AggregatedIngredient, normalized_name: str) -> str | None:
    if target.alternative_quantities:
        values = [
            display_quantity(quantity, unit)
            for unit, quantity in sorted(
                target.alternative_quantities.items(), key=lambda value: value[0]
            )
        ]
        prefix = (
            "Эквивалент только для части количества: "
            if target.alternative_source_count < target.quantified_source_count
            else "Эквивалент из рецепта: "
        )
        return prefix + " + ".join(values)

    ingredient_key = next(
        (key for key in COMMON_CONVERSIONS if key in normalized_name),
        None,
    )
    if ingredient_key is None:
        return None
    converted: dict[str, float] = defaultdict(float)
    for unit, quantity in target.quantities.items():
        rule = COMMON_CONVERSIONS[ingredient_key].get(unit)
        if rule:
            factor, converted_unit = rule
            converted[converted_unit] += quantity * factor
    if not converted:
        return None
    values = [
        display_quantity(quantity, unit)
        for unit, quantity in sorted(converted.items(), key=lambda value: value[0])
    ]
    return "Примерно: " + " + ".join(values)
