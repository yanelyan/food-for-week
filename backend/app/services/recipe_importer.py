import json
from dataclasses import dataclass
from urllib.parse import urlparse

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
    meal_type: MealType
    ingredients: list[ParsedIngredient]


def validate_food_ru_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"food.ru", "www.food.ru"}:
        raise RecipeImportError("В MVP поддерживаются только ссылки на food.ru")
    if not parsed.path.startswith("/recipes/"):
        raise RecipeImportError("Ссылка должна вести на рецепт food.ru")


def _find_recipe_data(value: object) -> dict[str, object] | None:
    if isinstance(value, dict):
        if value.get("@type") == "Recipe":
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


def _infer_meal_type(title: str, category: str) -> MealType:
    value = f"{title} {category}".lower()
    if any(word in value for word in ("десерт", "печенье", "чизкейк", "торт", "пирож")):
        return MealType.dessert
    if any(word in value for word in ("завтрак", "вафл", "каша", "омлет", "сырник")):
        return MealType.breakfast
    if "ужин" in value:
        return MealType.dinner
    return MealType.lunch


def parse_recipe_html(html: str, source_url: str) -> ImportedRecipe:
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
    raw_ingredients = recipe_data.get("recipeIngredient")
    if not title or not isinstance(raw_ingredients, list) or not raw_ingredients:
        raise RecipeImportError("У рецепта отсутствует название или список продуктов")

    image_value = recipe_data.get("image")
    if isinstance(image_value, list):
        image_url = str(image_value[0]) if image_value else None
    elif isinstance(image_value, dict):
        image_url = str(image_value.get("url") or "") or None
    else:
        image_url = str(image_value or "") or None

    category = str(recipe_data.get("recipeCategory") or "")
    return ImportedRecipe(
        title=title,
        source_url=str(recipe_data.get("url") or source_url),
        image_url=image_url,
        source_yield=str(recipe_data.get("recipeYield") or "") or None,
        meal_type=_infer_meal_type(title, category),
        ingredients=[parse_ingredient(str(item)) for item in raw_ingredients],
    )


def fetch_recipe(url: str) -> ImportedRecipe:
    validate_food_ru_url(url)
    try:
        response = httpx.get(
            url,
            follow_redirects=False,
            timeout=20,
            headers={"User-Agent": "Food_for_week/0.1 (+recipe import)"},
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        raise RecipeImportError("Не удалось загрузить рецепт с food.ru") from exc
    return parse_recipe_html(response.text, url)
