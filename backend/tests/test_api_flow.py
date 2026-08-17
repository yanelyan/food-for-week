from collections.abc import Generator

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
    imported = ImportedRecipe(
        title="Тестовые вафли",
        source_url="https://food.ru/recipes/1-test",
        image_url="https://cdn.food.ru/test.jpg",
        source_yield="2 порции",
        meal_type=MealType.breakfast,
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

    plan = client.get("/api/plan").json()
    response = client.post(
        "/api/plan",
        json={
            "recipe_id": recipe_id,
            "planned_date": plan["period"]["start"],
            "meal_type": "breakfast",
        },
    )
    assert response.status_code == 201

    shopping = client.get("/api/shopping-list").json()
    assert [item["name"] for item in shopping["items"]] == ["Мука", "Соль"]
    assert shopping["items"][0]["display_amount"] == "300 г"
    assert shopping["items"][1]["display_amount"] == "по вкусу"

    flour_id = shopping["items"][0]["ingredient_id"]
    checked = client.patch(f"/api/shopping-list/{flour_id}", json={"checked": True}).json()
    assert checked["checked"] is True
