import pytest

from app.models import MealType
from app.services.recipe_importer import RecipeImportError, parse_recipe_html, validate_recipe_url

HTML = """
<html><head><script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Recipe",
  "name": "Сырные вафли",
  "url": "https://food.ru/recipes/1-test",
  "image": ["https://cdn.food.ru/test.jpg"],
  "recipeYield": "2 порции",
  "recipeCategory": "завтрак",
  "recipeIngredient": ["Мука 200 г", "Соль по вкусу"]
}
</script></head></html>
"""


def test_parse_json_ld_recipe() -> None:
    recipe = parse_recipe_html(HTML, "https://food.ru/recipes/1-test")
    assert recipe.title == "Сырные вафли"
    assert recipe.meal_types == [MealType.breakfast]
    assert recipe.image_url == "https://cdn.food.ru/test.jpg"
    assert len(recipe.ingredients) == 2
    assert recipe.ingredients[1].note == "по вкусу"


@pytest.mark.parametrize(
    "url",
    [
        "http://food.ru/recipes/1-test",
        "https://example.com/recipes/1-test",
        "https://food.ru/articles/test",
    ],
)
def test_rejects_unsupported_urls(url: str) -> None:
    with pytest.raises(RecipeImportError):
        validate_recipe_url(url)


@pytest.mark.parametrize(
    "url",
    [
        "https://food.ru/recipes/1-test?utm_source=test",
        "https://eda.rambler.ru/recepty/supy/test-1",
        "https://gastronom.ru/recipe/123/test",
        "https://lavka.yandex.ru/recipes2/test?context_id=123",
    ],
)
def test_accepts_supported_recipe_sources(url: str) -> None:
    validate_recipe_url(url)
