import re
from dataclasses import dataclass

UNITS = (
    "ст. л.",
    "ч. л.",
    "ст.л.",
    "ч.л.",
    "щепотка",
    "щепотки",
    "стакан",
    "стакана",
    "стаканов",
    "шт.",
    "штук",
    "кг",
    "мл",
    "г",
    "л",
)
UNIT_PATTERN = "|".join(re.escape(unit) for unit in UNITS)
NUMBER_PATTERN = r"(?:\d+(?:[.,]\d+)?|¼|½|¾|⅓|⅔|⅛)"
INGREDIENT_PATTERN = re.compile(
    rf"^(?P<name>.+?)\s+(?P<quantity>{NUMBER_PATTERN})\s*"
    rf"(?P<unit>{UNIT_PATTERN})"
    rf"(?:\s*=\s*(?P<alternative_quantity>{NUMBER_PATTERN})\s*"
    rf"(?P<alternative_unit>{UNIT_PATTERN}))?$",
    re.IGNORECASE,
)
QUALITATIVE_PATTERN = re.compile(
    r"^(?P<name>.+?)\s+(?P<note>по вкусу|немного|для жарки)$", re.IGNORECASE
)

FRACTIONS = {"¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅛": 0.125}
UNIT_ALIASES = {
    "ст.л.": "ст. л.",
    "ч.л.": "ч. л.",
    "щепотки": "щепотка",
    "стакана": "стакан",
    "стаканов": "стакан",
    "штук": "шт.",
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


def parse_ingredient(source_text: str) -> ParsedIngredient:
    cleaned = re.sub(r"\s+", " ", source_text).strip()
    match = INGREDIENT_PATTERN.match(cleaned)
    if match:
        values = match.groupdict()
        name = values["name"].strip()
        return ParsedIngredient(
            name=name,
            normalized_name=normalize_ingredient_name(name),
            source_text=cleaned,
            quantity=parse_number(values["quantity"]),
            unit=normalize_unit(values["unit"]),
            alternative_quantity=parse_number(values["alternative_quantity"]),
            alternative_unit=normalize_unit(values["alternative_unit"]),
        )

    qualitative_match = QUALITATIVE_PATTERN.match(cleaned)
    if qualitative_match:
        name = qualitative_match.group("name").strip()
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
