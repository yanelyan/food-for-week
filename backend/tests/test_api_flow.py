from collections.abc import Generator
from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app import database
from app.database import Base, get_db
from app.main import app
from app.models import MealType
from app.services.ingredient_parser import ParsedIngredient
from app.services.recipe_importer import ImportedRecipe


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    testing_session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)

    def override_db() -> Generator[Session, None, None]:
        with testing_session() as session:
            yield session

    monkeypatch.setattr(database, "SessionLocal", testing_session)
    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def test_full_recipe_plan_and_shopping_flow(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    initial_settings = client.get("/api/settings").json()
    assert initial_settings["purchase_weekday"] is None

    imported = ImportedRecipe(
        title="Тестовые вафли",
        source_url="https://food.ru/recipes/1-test",
        image_url="https://cdn.food.ru/test.jpg",
        source_yield="2 порции",
        meal_types=[MealType.breakfast],
        ingredients=[
            ParsedIngredient(
                name="Мука",
                normalized_name="мука",
                source_text="Мука 300 г",
                quantity=300,
                unit="г",
            ),
            ParsedIngredient(
                name="Соль",
                normalized_name="соль",
                source_text="Соль по вкусу",
                note="по вкусу",
            ),
        ],
    )
    monkeypatch.setattr("app.services.recipe_service.fetch_recipe", lambda _: imported)

    response = client.post("/api/recipes/import", json={"url": imported.source_url})
    assert response.status_code == 202
    jobs = client.get("/api/recipes/imports/recent").json()
    assert jobs[0]["status"] == "completed"

    recipes = client.get("/api/recipes").json()
    assert len(recipes) == 1
    recipe_id = recipes[0]["id"]
    assert recipes[0]["ingredient_count"] == 2

    updated_recipe = client.patch(
        f"/api/recipes/{recipe_id}",
        json={"meal_types": ["breakfast", "dessert"]},
    ).json()
    assert updated_recipe["meal_types"] == ["breakfast", "dessert"]

    settings = client.put(
        "/api/settings",
        json={"purchase_weekday": 0, "timezone_name": "UTC"},
    )
    assert settings.status_code == 200

    plan = client.get("/api/plan").json()
    response = client.post(
        "/api/plan",
        json={
            "recipe_id": recipe_id,
            "planned_date": plan["today"],
            "meal_type": "breakfast",
        },
    )
    assert response.status_code == 201

    shopping = client.get("/api/shopping-list").json()
    assert [item["name"] for item in shopping["items"]] == ["Мука"]
    assert [item["name"] for item in shopping["pantry_items"]] == ["Соль"]
    assert shopping["items"][0]["display_amount"] == "300 г"
    assert shopping["pantry_items"][0]["display_amount"] == "по вкусу"

    flour_id = shopping["items"][0]["ingredient_id"]
    checked = client.patch(f"/api/shopping-list/{flour_id}", json={"checked": True}).json()
    assert checked["checked"] is True

    salt_id = shopping["pantry_items"][0]["ingredient_id"]
    unchecked = client.patch(f"/api/shopping-list/{salt_id}", json={"checked": False}).json()
    assert unchecked["checked"] is False
    after_uncheck = client.get("/api/shopping-list").json()
    assert [item["name"] for item in after_uncheck["items"]] == ["Мука"]
    assert after_uncheck["pantry_items"][0]["name"] == "Соль"
    assert after_uncheck["pantry_items"][0]["checked"] is False

    assert client.post("/api/shopping-list/reset").status_code == 204
    reset = client.get("/api/shopping-list").json()
    assert [item["name"] for item in reset["pantry_items"]] == ["Соль"]

    next_week = date.fromisoformat(plan["period"]["start"]) + timedelta(days=7)
    assert (
        client.post(
            "/api/plan",
            json={
                "recipe_id": recipe_id,
                "planned_date": next_week.isoformat(),
                "meal_type": "breakfast",
            },
        ).status_code
        == 201
    )
    assert client.delete("/api/plan/current-week").status_code == 204
    remaining = client.get("/api/plan").json()["items"]
    assert [item["planned_date"] for item in remaining] == [next_week.isoformat()]


def test_changing_amount_removes_stale_source_equivalent(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    imported = ImportedRecipe(
        title="Тунец для салата",
        source_url="https://food.ru/recipes/2-tuna",
        image_url=None,
        source_yield=None,
        meal_types=[MealType.lunch],
        ingredients=[
            ParsedIngredient(
                name="Тунец",
                normalized_name="тунец",
                source_text="Тунец 2 банки / 540 г",
                quantity=2,
                unit="банка",
                alternative_quantity=540,
                alternative_unit="г",
            )
        ],
    )
    monkeypatch.setattr("app.services.recipe_service.fetch_recipe", lambda _: imported)

    assert client.post("/api/recipes/import", json={"url": imported.source_url}).status_code == 202
    job = client.get("/api/recipes/imports/recent").json()[0]
    recipe = client.get(f"/api/recipes/{job['recipe_id']}").json()
    ingredient = recipe["ingredients"][0]

    updated = client.patch(
        f"/api/recipes/{recipe['id']}/ingredients/{ingredient['id']}",
        json={
            "name": ingredient["name"],
            "quantity": 1,
            "unit": "банка",
            "note": None,
            "is_pantry": False,
        },
    ).json()

    assert updated["ingredients"][0]["quantity"] == 1
    assert updated["ingredients"][0]["alternative_quantity"] is None
    assert updated["ingredients"][0]["alternative_unit"] is None

    client.put("/api/settings", json={"purchase_weekday": 0, "timezone_name": "UTC"})
    unused_check = client.patch(
        f"/api/shopping-list/{ingredient['ingredient_id']}", json={"checked": True}
    )
    assert unused_check.status_code == 404

    shopping = client.get("/api/shopping-list").json()
    planned_date = max(client.get("/api/plan").json()["today"], shopping["period"]["start"])
    assert (
        client.post(
            "/api/plan",
            json={
                "recipe_id": recipe["id"],
                "planned_date": planned_date,
                "meal_type": "lunch",
            },
        ).status_code
        == 201
    )
    tuna = client.get("/api/shopping-list").json()["items"][0]
    assert tuna["checked"] is False


def test_rejects_second_active_import(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        "starlette.background.BackgroundTasks.add_task",
        lambda self, func, *args, **kwargs: None,
    )
    url = "https://food.ru/recipes/3-slow"

    assert client.post("/api/recipes/import", json={"url": url}).status_code == 202
    duplicate = client.post("/api/recipes/import", json={"url": url})

    assert duplicate.status_code == 409
    assert duplicate.json()["detail"] == "Импорт этого рецепта уже выполняется"
    assert len(client.get("/api/recipes/imports/recent").json()) == 1


def test_personal_pantry_applies_to_existing_and_future_recipes(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    imported = ImportedRecipe(
        title="Салат с нутом",
        source_url="https://food.ru/recipes/4-chickpeas",
        image_url=None,
        source_yield=None,
        meal_types=[MealType.lunch],
        ingredients=[
            ParsedIngredient(
                name="Нут",
                normalized_name="нут",
                source_text="Нут 200 г",
                quantity=200,
                unit="г",
            )
        ],
    )
    monkeypatch.setattr("app.services.recipe_service.fetch_recipe", lambda _: imported)

    assert client.post("/api/recipes/import", json={"url": imported.source_url}).status_code == 202
    recipe = client.get("/api/recipes").json()[0]
    recipe_detail = client.get(f"/api/recipes/{recipe['id']}").json()
    assert recipe_detail["ingredients"][0]["is_pantry"] is False

    added = client.post("/api/shopping-list/pantry", json={"name": "Нут"})
    assert added.status_code == 201
    pantry_product = added.json()
    assert pantry_product["normalized_name"] == "нут"
    assert client.get(f"/api/recipes/{recipe['id']}").json()["ingredients"][0]["is_pantry"] is True
    assert [item["name"] for item in client.get("/api/shopping-list/pantry").json()] == ["Нут"]

    duplicate = client.post("/api/shopping-list/pantry", json={"name": " нут "})
    assert duplicate.status_code == 409

    assert client.delete(f"/api/shopping-list/pantry/{pantry_product['id']}").status_code == 204
    assert client.get("/api/shopping-list/pantry").json() == []
    assert client.get(f"/api/recipes/{recipe['id']}").json()["ingredients"][0]["is_pantry"] is False

    preconfigured = client.post("/api/shopping-list/pantry", json={"name": "Киноа"})
    assert preconfigured.status_code == 201
    future = ImportedRecipe(
        title="Киноа на завтрак",
        source_url="https://food.ru/recipes/5-quinoa",
        image_url=None,
        source_yield=None,
        meal_types=[MealType.breakfast],
        ingredients=[
            ParsedIngredient(
                name="Киноа",
                normalized_name="киноа",
                source_text="Киноа 100 г",
                quantity=100,
                unit="г",
            )
        ],
    )
    monkeypatch.setattr("app.services.recipe_service.fetch_recipe", lambda _: future)
    assert client.post("/api/recipes/import", json={"url": future.source_url}).status_code == 202
    future_recipe = client.get("/api/recipes").json()[0]
    assert (
        client.get(f"/api/recipes/{future_recipe['id']}").json()["ingredients"][0]["is_pantry"]
        is True
    )
