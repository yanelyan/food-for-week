from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import PlannedRecipe, Recipe, User
from app.schemas import (
    PlannedRecipeCreate,
    PlannedRecipeRead,
    PlanPeriodRead,
    PlanRead,
    RecipeSummary,
)
from app.services.plan_service import planning_window

router = APIRouter(prefix="/plan", tags=["plan"])


def planned_to_schema(item: PlannedRecipe) -> PlannedRecipeRead:
    recipe = item.recipe
    return PlannedRecipeRead(
        id=item.id,
        planned_date=item.planned_date,
        meal_type=item.meal_type,
        recipe=RecipeSummary(
            id=recipe.id,
            title=recipe.title,
            meal_types=[category.meal_type for category in recipe.meal_categories]
            or [recipe.primary_meal_type],
            source_url=recipe.source_url,
            image_url=recipe.image_url,
            ingredient_count=len(recipe.ingredients),
            created_at=recipe.created_at,
        ),
    )


@router.get("", response_model=PlanRead)
def get_plan(db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> PlanRead:
    window = planning_window(user)
    items = db.scalars(
        select(PlannedRecipe)
        .options(
            selectinload(PlannedRecipe.recipe).selectinload(Recipe.ingredients),
            selectinload(PlannedRecipe.recipe).selectinload(Recipe.meal_categories),
        )
        .where(
            PlannedRecipe.user_id == user.id,
            PlannedRecipe.planned_date.between(window.cycle_start, window.plan_end),
        )
        .order_by(PlannedRecipe.planned_date, PlannedRecipe.meal_type, PlannedRecipe.id)
    ).all()
    return PlanRead(
        period=PlanPeriodRead(start=window.cycle_start, end=window.plan_end),
        today=window.today,
        purchase_weekday=user.purchase_weekday,
        items=[planned_to_schema(item) for item in items],
    )


@router.post("", response_model=PlannedRecipeRead, status_code=status.HTTP_201_CREATED)
def add_to_plan(
    payload: PlannedRecipeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PlannedRecipeRead:
    window = planning_window(user)
    if not window.today <= payload.planned_date <= window.plan_end:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Дата недоступна для планирования",
        )
    recipe = db.scalar(
        select(Recipe)
        .options(selectinload(Recipe.ingredients), selectinload(Recipe.meal_categories))
        .where(Recipe.id == payload.recipe_id, Recipe.user_id == user.id)
    )
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не найден")

    item = PlannedRecipe(
        user_id=user.id,
        recipe_id=recipe.id,
        planned_date=payload.planned_date,
        meal_type=payload.meal_type,
        recipe=recipe,
    )
    db.add(item)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Этот рецепт уже добавлен в выбранный приём пищи",
        ) from exc
    db.refresh(item)
    return planned_to_schema(item)


@router.delete("/current-week", status_code=status.HTTP_204_NO_CONTENT)
def clear_current_week(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    window = planning_window(user)
    db.execute(
        delete(PlannedRecipe).where(
            PlannedRecipe.user_id == user.id,
            PlannedRecipe.planned_date.between(
                window.cycle_start, window.cycle_start + timedelta(days=6)
            ),
        )
    )
    db.commit()


@router.delete("/{planned_recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_from_plan(
    planned_recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> None:
    item = db.scalar(
        select(PlannedRecipe).where(
            PlannedRecipe.id == planned_recipe_id, PlannedRecipe.user_id == user.id
        )
    )
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Блюдо не найдено")
    db.delete(item)
    db.commit()
