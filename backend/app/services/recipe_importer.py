import json
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse, urlunparse

import httpx
from bs4 import BeautifulSoup

from app.models import MealType
from app.services.ingredient_parser import ParsedIngredient, parse_ingredient


class RecipeImportError(ValueError):
    pass


@dataclass(frozen=True)
class ImportedRecipe:
    title: str
    source_url: str
    image_url: str | None
    source_yield: str | None
    meal_types: list[MealType]
    ingredients: list[ParsedIngredient]


SUPPORTED_SOURCES: dict[str, tuple[str, str]] = {
    "food.ru": ("/recipes/", "Food.ru"),
    "www.food.ru": ("/recipes/", "Food.ru"),
    "eda.rambler.ru": ("/recepty/", "Рамблер/Еда"),
    "gastronom.ru": ("/recipe/", "Gastronom.ru"),
    "www.gastronom.ru": ("/recipe/", "Gastronom.ru"),
    "lavka.yandex.ru": ("/recipes2/", "Яндекс Лавка"),
}


def normalize_recipe_url(url: str) -> str:
    parsed = urlparse(url.strip())
    hostname = (parsed.hostname or "").lower()
    if parsed.scheme != "https" or hostname not in SUPPORTED_SOURCES:
        raise RecipeImportError("Этот сайт пока не поддерживается")
    required_path, _ = SUPPORTED_SOURCES[hostname]
    if not parsed.path.startswith(required_path) or parsed.path.rstrip("/") == required_path.rstrip(
        "/"
    ):
        raise RecipeImportError("Ссылка должна вести на отдельный рецепт")
    canonical_host = hostname.removeprefix("www.")
    return urlunparse(("https", canonical_host, parsed.path.rstrip("/"), "", "", ""))


def validate_recipe_url(url: str) -> None:
    normalize_recipe_url(url)


def _find_recipe_data(value: object) -> dict[str, object] | None:
    if isinstance(value, dict):
        recipe_type = value.get("@type")
        if recipe_type == "Recipe" or (isinstance(recipe_type, list) and "Recipe" in recipe_type):
            return value
        for nested_value in value.values():
            found = _find_recipe_data(nested_value)
            if found:
                return found
    if isinstance(value, list):
        for item in value:
            found = _find_recipe_data(item)
            if found:
                return found
    return None


def _infer_meal_types(title: str, categories: list[str]) -> list[MealType]:
    value = " ".join([title, *categories]).lower()
    result: list[MealType] = []
    rules = (
        (MealType.breakfast, ("завтрак", "вафл", "каша", "омлет", "сырник", "тост")),
        (MealType.lunch, ("обед", "суп", "закуск", "салат")),
        (MealType.dinner, ("ужин", "основное блюдо", "горячее")),
        (MealType.dessert, ("десерт", "печенье", "чизкейк", "торт", "пирож", "кобблер")),
    )
    for meal_type, words in rules:
        if any(word in value for word in words):
            result.append(meal_type)
    return result or [MealType.lunch]


def _image_url(value: object) -> str | None:
    if isinstance(value, list):
        return _image_url(value[0]) if value else None
    if isinstance(value, dict):
        return str(value.get("url") or value.get("contentUrl") or "") or None
    return str(value or "") or None


def _detailed_dom_ingredients(soup: BeautifulSoup) -> list[str]:
    values: list[str] = []
    for element in soup.select('[itemprop="recipeIngredient"]'):
        text = " ".join(element.get_text(" ", strip=True).split())
        if text and text not in values:
            values.append(text)
    return values


def _amount_score(values: list[str]) -> int:
    return sum(
        1
        for item in values
        if (parsed := parse_ingredient(item)).quantity is not None or parsed.note is not None
    )


def parse_recipe_html(html: str, source_url: str) -> ImportedRecipe:
    canonical_url = normalize_recipe_url(source_url)
    soup = BeautifulSoup(html, "html.parser")
    recipe_data: dict[str, object] | None = None
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            payload = json.loads(script.string or script.get_text())
        except (json.JSONDecodeError, TypeError):
            continue
        recipe_data = _find_recipe_data(payload)
        if recipe_data:
            break

    if not recipe_data:
        raise RecipeImportError("На странице не найдены данные рецепта")

    title = str(recipe_data.get("name") or "").strip()
    raw_value = recipe_data.get("recipeIngredient")
    raw_ingredients = (
        [str(item).strip() for item in raw_value] if isinstance(raw_value, list) else []
    )
    dom_ingredients = _detailed_dom_ingredients(soup)
    if _amount_score(dom_ingredients) > _amount_score(raw_ingredients):
        raw_ingredients = dom_ingredients
    if not title or not raw_ingredients:
        raise RecipeImportError("У рецепта отсутствует название или список продуктов")

    raw_category = recipe_data.get("recipeCategory")
    categories = (
        [str(item) for item in raw_category]
        if isinstance(raw_category, list)
        else [str(raw_category or "")]
    )
    categories.extend(
        element.get_text(" ", strip=True) for element in soup.select('[data-testid$="-link"]')
    )

    source_value = str(recipe_data.get("url") or "")
    try:
        imported_url = (
            normalize_recipe_url(urljoin(canonical_url, source_value))
            if source_value
            else canonical_url
        )
    except RecipeImportError:
        imported_url = canonical_url
    return ImportedRecipe(
        title=title,
        source_url=imported_url,
        image_url=_image_url(recipe_data.get("image")),
        source_yield=str(recipe_data.get("recipeYield") or "") or None,
        meal_types=_infer_meal_types(title, categories),
        ingredients=[parse_ingredient(item) for item in raw_ingredients],
    )


def fetch_recipe(url: str) -> ImportedRecipe:
    canonical_url = normalize_recipe_url(url)
    _, source_name = SUPPORTED_SOURCES[urlparse(canonical_url).hostname or ""]
    try:
        response = httpx.get(
            canonical_url,
            follow_redirects=True,
            timeout=25,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 Food_for_week/0.2"
                )
            },
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RecipeImportError(f"Не удалось получить рецепт с {source_name}") from exc
    return parse_recipe_html(response.text, canonical_url)
