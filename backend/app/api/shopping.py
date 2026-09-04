from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Ingredient, PlannedRecipe, RecipeIngredient, ShoppingCheck, User
from app.schemas import (
    PlanPeriodRead,
    ShoppingAmount,
    ShoppingCheckUpdate,
    ShoppingItemRead,
    ShoppingListRead,
)
from app.services.plan_service import planning_window
from app.services.shopping_service import (
    AggregatedIngredient,
    add_recipe_ingredient,
    conversion_hint,
    format_amounts,
)

router = APIRouter(prefix="/shopping-list", tags=["shopping-list"])


@router.get("", response_model=ShoppingListRead)
def get_shopping_list(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> ShoppingListRead:
    window = planning_window(user)
    rows = db.execute(
        select(RecipeIngredient, Ingredient)
        .join(Ingredient, Ingredient.id == RecipeIngredient.ingredient_id)
        .join(PlannedRecipe, PlannedRecipe.recipe_id == RecipeIngredient.recipe_id)
        .where(
            PlannedRecipe.user_id == user.id,
            PlannedRecipe.planned_date.between(window.shopping_start, window.shopping_end),
        )
    ).all()
    grouped: dict[int, AggregatedIngredient] = {}
    normalized_names: dict[int, str] = {}
    pantry_flags: dict[int, bool] = {}
    for recipe_ingredient, ingredient in rows:
        target = grouped.setdefault(
            ingredient.id,
            AggregatedIngredient(ingredient_id=ingredient.id, name=ingredient.name),
        )
        normalized_names[ingredient.id] = ingredient.normalized_name
        pantry_flags[ingredient.id] = ingredient.is_pantry
        add_recipe_ingredient(target, recipe_ingredient)

    checks = {
        check.ingredient_id: check.checked
        for check in db.scalars(
            select(ShoppingCheck).where(
                ShoppingCheck.user_id == user.id,
                ShoppingCheck.period_start == window.shopping_start,
            )
        ).all()
    }
    items = []
    pantry_items = []
    for target in sorted(grouped.values(), key=lambda value: value.name.lower()):
        amounts = [
            ShoppingAmount(quantity=quantity, unit=unit or None)
            for unit, quantity in sorted(target.quantities.items(), key=lambda value: value[0])
        ]
        amounts.extend(ShoppingAmount(quantity=None, unit=None, note=note) for note in target.notes)
        is_pantry = pantry_flags.get(target.ingredient_id, False)
        checked = checks.get(target.ingredient_id, is_pantry)
        item = ShoppingItemRead(
            ingredient_id=target.ingredient_id,
            name=target.name,
            display_amount=format_amounts(target),
            amounts=amounts,
            conversion_hint=conversion_hint(target, normalized_names.get(target.ingredient_id, "")),
            checked=checked,
            is_pantry=is_pantry,
        )
        if is_pantry:
            pantry_items.append(item)
        else:
            items.append(item)
    return ShoppingListRead(
        period=PlanPeriodRead(start=window.shopping_start, end=window.shopping_end),
        purchase_weekday=user.purchase_weekday,
        items=items,
        pantry_items=pantry_items,
    )


@router.patch("/{ingredient_id}", response_model=ShoppingItemRead)
def update_shopping_check(
    ingredient_id: int,
    payload: ShoppingCheckUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ShoppingItemRead:
    window = planning_window(user)
    ingredient = db.scalar(
        select(Ingredient).where(Ingredient.id == ingredient_id, Ingredient.user_id == user.id)
    )
    if ingredient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Продукт не найден")
    used_in_period = db.scalar(
        select(RecipeIngredient.id)
        .join(PlannedRecipe, PlannedRecipe.recipe_id == RecipeIngredient.recipe_id)
        .where(
            RecipeIngredient.ingredient_id == ingredient_id,
            PlannedRecipe.user_id == user.id,
            PlannedRecipe.planned_date.between(window.shopping_start, window.shopping_end),
        )
        .limit(1)
    )
    if used_in_period is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Продукт не используется")
    check = db.scalar(
        select(ShoppingCheck).where(
            ShoppingCheck.user_id == user.id,
            ShoppingCheck.period_start == window.shopping_start,
            ShoppingCheck.ingredient_id == ingredient_id,
        )
    )
    if check is None:
        check = ShoppingCheck(
            user_id=user.id,
            period_start=window.shopping_start,
            ingredient_id=ingredient_id,
            checked=payload.checked,
        )
        db.add(check)
    else:
        check.checked = payload.checked
    db.commit()

    shopping_list = get_shopping_list(db=db, user=user)
    item = next(
        (
            value
            for value in [*shopping_list.items, *shopping_list.pantry_items]
            if value.ingredient_id == ingredient_id
        ),
        None,
    )
    if item is None:  # guarded by the period membership check above
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Список покупок изменился")
    return item


@router.post("/reset", status_code=status.HTTP_204_NO_CONTENT)
def reset_shopping_checks(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> None:
    window = planning_window(user)
    db.execute(
        delete(ShoppingCheck).where(
            ShoppingCheck.user_id == user.id,
            ShoppingCheck.period_start == window.shopping_start,
        )
    )
    db.commit()
