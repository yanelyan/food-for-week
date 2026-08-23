import re
from dataclasses import dataclass, replace

UNITS = (
    "ст. л.",
    "ч. л.",
    "ст.л.",
    "ч.л.",
    "столовая ложка",
    "столовые ложки",
    "чайная ложка",
    "чайные ложки",
    "щепотка",
    "щепотки",
    "стакан",
    "стакана",
    "стаканов",
    "штука",
    "штуки",
    "штук",
    "шт.",
    "шт",
    "перо",
    "пера",
    "перьев",
    "зубчик",
    "зубчика",
    "зубчиков",
    "кг",
    "мл",
    "г",
    "л",
)
UNIT_PATTERN = "|".join(re.escape(unit) for unit in sorted(UNITS, key=len, reverse=True))
NUMBER_PATTERN = r"(?:\d+(?:[.,]\d+)?|¼|½|¾|⅓|⅔|⅛)"
INGREDIENT_PATTERN = re.compile(
    rf"^(?P<name>.+?)[\s,–—-]+(?P<quantity>{NUMBER_PATTERN})\s*"
    rf"(?P<unit>{UNIT_PATTERN})"
    rf"(?:\s*=\s*(?P<alternative_quantity>{NUMBER_PATTERN})\s*"
    rf"(?P<alternative_unit>{UNIT_PATTERN}))?$",
    re.IGNORECASE,
)
QUALITATIVE_PATTERN = re.compile(
    r"^(?P<name>.+?)[\s,–—-]+(?P<note>по вкусу|немного|для жарки)$", re.IGNORECASE
)

FRACTIONS = {"¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}
UNIT_ALIASES = {
    "ст.л.": "ст. л.",
    "ч.л.": "ч. л.",
    "столовая ложка": "ст. л.",
    "столовые ложки": "ст. л.",
    "чайная ложка": "ч. л.",
    "чайные ложки": "ч. л.",
    "щепотки": "щепотка",
    "стакана": "стакан",
    "стаканов": "стакан",
    "штука": "шт.",
    "штуки": "шт.",
    "штук": "шт.",
    "шт": "шт.",
    "пера": "перо",
    "перьев": "перо",
    "зубчика": "зубчик",
    "зубчиков": "зубчик",
}
NAME_ALIASES = {
    "томаты": "помидор",
    "помидоры": "помидор",
    "помидор": "помидор",
    "яйца": "яйцо",
    "яйцо": "яйцо",
    "картофель": "картофель",
    "картошка": "картофель",
    "лук репчатый": "репчатый лук",
}
LIQUID_WORDS = (
    "вода",
    "молоко",
    "сливки",
    "масло",
    "сок",
    "бульон",
    "уксус",
    "соус",
)
VOLUME_CONVERSIONS = {"ч. л.": 5, "ст. л.": 15, "стакан": 250}
PANTRY_WORDS = (
    "вода",
    "соль",
    "перец",
    "паприка",
    "кориандр",
    "куркума",
    "корица",
    "тмин",
    "гвоздика",
    "ванилин",
    "приправа",
    "специ",
    "масло",
    "уксус",
    "соус",
    "горчица",
)


@dataclass(frozen=True)
class ParsedIngredient:
    name: str
    normalized_name: str
    source_text: str
    quantity: float | None = None
    unit: str | None = None
    note: str | None = None
    alternative_quantity: float | None = None
    alternative_unit: str | None = None


def parse_number(value: str | None) -> float | None:
    if value is None:
        return None
    if value in FRACTIONS:
        return FRACTIONS[value]
    return float(value.replace(",", "."))


def normalize_unit(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.lower().strip()
    return UNIT_ALIASES.get(cleaned, cleaned)


def normalize_ingredient_name(value: str) -> str:
    cleaned = re.sub(r"\s+", " ", value.lower().replace("ё", "е")).strip(" .,")
    return NAME_ALIASES.get(cleaned, cleaned)


def is_pantry_ingredient(value: str) -> bool:
    normalized = normalize_ingredient_name(value)
    return any(word in normalized for word in PANTRY_WORDS)


def _apply_measure_rules(parsed: ParsedIngredient) -> ParsedIngredient:
    normalized_name = parsed.normalized_name
    is_egg = "яйц" in normalized_name
    is_liquid = any(word in normalized_name for word in LIQUID_WORDS)

    if is_egg and parsed.alternative_unit in {"г", "кг"}:
        parsed = replace(parsed, alternative_quantity=None, alternative_unit=None)

    if not is_liquid:
        return parsed

    if parsed.alternative_quantity is not None and parsed.alternative_unit in {"мл", "л"}:
        quantity = parsed.alternative_quantity
        unit = parsed.alternative_unit
        if unit == "л":
            quantity *= 1000
            unit = "мл"
        return replace(
            parsed,
            quantity=quantity,
            unit=unit,
            alternative_quantity=None,
            alternative_unit=None,
        )

    if parsed.quantity is not None and parsed.unit in VOLUME_CONVERSIONS:
        return replace(
            parsed,
            quantity=parsed.quantity * VOLUME_CONVERSIONS[parsed.unit],
            unit="мл",
            alternative_quantity=None,
            alternative_unit=None,
        )

    if parsed.alternative_unit in {"г", "кг"}:
        return replace(parsed, alternative_quantity=None, alternative_unit=None)
    return parsed


def parse_ingredient(source_text: str) -> ParsedIngredient:
    cleaned = re.sub(r"\s+", " ", source_text).strip()
    match = INGREDIENT_PATTERN.match(cleaned)
    if match:
        values = match.groupdict()
        name = values["name"].strip(" ,–—-")
        parsed = ParsedIngredient(
            name=name,
            normalized_name=normalize_ingredient_name(name),
            source_text=cleaned,
            quantity=parse_number(values["quantity"]),
            unit=normalize_unit(values["unit"]),
            alternative_quantity=parse_number(values["alternative_quantity"]),
            alternative_unit=normalize_unit(values["alternative_unit"]),
        )
        return _apply_measure_rules(parsed)

    qualitative_match = QUALITATIVE_PATTERN.match(cleaned)
    if qualitative_match:
        name = qualitative_match.group("name").strip(" ,–—-")
        return ParsedIngredient(
            name=name,
            normalized_name=normalize_ingredient_name(name),
            source_text=cleaned,
            note=qualitative_match.group("note").lower(),
        )

    return ParsedIngredient(
        name=cleaned,
        normalized_name=normalize_ingredient_name(cleaned),
        source_text=cleaned,
    )
