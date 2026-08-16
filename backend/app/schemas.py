from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models import ImportStatus, MealType


class IngredientRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    ingredient_id: int
    name: str
    normalized_name: str
    source_text: str
    quantity: float | None
    unit: str | None
    note: str | None
    alternative_quantity: float | None
    alternative_unit: str | None


class RecipeRead(BaseModel):
    id: int
    title: str
    meal_type: MealType
    source_url: str
    image_url: str | None
    source_yield: str | None
    created_at: datetime
    ingredients: list[IngredientRead]


class RecipeSummary(BaseModel):
    id: int
    title: str
    meal_type: MealType
    source_url: str
    image_url: str | None
    ingredient_count: int
    created_at: datetime


class ImportRequest(BaseModel):
    url: HttpUrl


class ImportJobRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    source_url: str
    status: ImportStatus
    recipe_id: int | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime


class IngredientUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=40)
    note: str | None = Field(default=None, max_length=120)


class RecipeUpdate(BaseModel):
    meal_type: MealType


class PlanPeriodRead(BaseModel):
    start: date
    end: date


class PlannedRecipeCreate(BaseModel):
    recipe_id: int
    planned_date: date
    meal_type: MealType


class PlannedRecipeRead(BaseModel):
    id: int
    planned_date: date
    meal_type: MealType
    recipe: RecipeSummary


class PlanRead(BaseModel):
    period: PlanPeriodRead
    items: list[PlannedRecipeRead]


class ShoppingAmount(BaseModel):
    quantity: float | None
    unit: str | None
    note: str | None = None


class ShoppingItemRead(BaseModel):
    ingredient_id: int
    name: str
    display_amount: str
    amounts: list[ShoppingAmount]
    conversion_hint: str | None
    checked: bool


class ShoppingCheckUpdate(BaseModel):
    checked: bool


class ShoppingListRead(BaseModel):
    period: PlanPeriodRead
    items: list[ShoppingItemRead]
