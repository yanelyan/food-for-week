from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import ImportJob, Recipe, RecipeIngredient, RecipeMealType, User
from app.schemas import (
    ImportJobRead,
    ImportRequest,
    IngredientRead,
    IngredientUpdate,
    RecipeRead,
    RecipeSummary,
    RecipeUpdate,
)
from app.services.ingredient_parser import normalize_ingredient_name
from app.services.recipe_importer import RecipeImportError, normalize_recipe_url
from app.services.recipe_service import get_or_create_ingredient, load_recipe, process_import_job

router = APIRouter(prefix="/recipes", tags=["recipes"])


def ingredient_to_schema(item: RecipeIngredient) -> IngredientRead:
    return IngredientRead(
        id=item.id,
        ingredient_id=item.ingredient_id,
        name=item.ingredient.name,
        normalized_name=item.ingredient.normalized_name,
        source_text=item.source_text,
        quantity=item.quantity,
        unit=item.unit,
        note=item.note,
        alternative_quantity=item.alternative_quantity,
        alternative_unit=item.alternative_unit,
        is_pantry=item.ingredient.is_pantry,
    )


def recipe_to_schema(recipe: Recipe) -> RecipeRead:
    return RecipeRead(
        id=recipe.id,
        title=recipe.title,
        meal_types=[category.meal_type for category in recipe.meal_categories]
        or [recipe.primary_meal_type],
        source_url=recipe.source_url,
        image_url=recipe.image_url,
        source_yield=recipe.source_yield,
        created_at=recipe.created_at,
        ingredients=[ingredient_to_schema(item) for item in recipe.ingredients],
    )


@router.get("", response_model=list[RecipeSummary])
def list_recipes(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[RecipeSummary]:
    recipes = db.scalars(
        select(Recipe)
        .options(selectinload(Recipe.ingredients), selectinload(Recipe.meal_categories))
        .where(Recipe.user_id == user.id)
        .order_by(Recipe.created_at.desc(), Recipe.id.desc())
    ).all()
    return [
        RecipeSummary(
            id=recipe.id,
            title=recipe.title,
            meal_types=[category.meal_type for category in recipe.meal_categories]
            or [recipe.primary_meal_type],
            source_url=recipe.source_url,
            image_url=recipe.image_url,
            ingredient_count=len(recipe.ingredients),
            created_at=recipe.created_at,
        )
        for recipe in recipes
    ]


@router.get("/{recipe_id}", response_model=RecipeRead)
def get_recipe(
    recipe_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RecipeRead:
    recipe = load_recipe(db, recipe_id, user.id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не найден")
    return recipe_to_schema(recipe)


@router.post("/import", response_model=ImportJobRead, status_code=status.HTTP_202_ACCEPTED)
def import_recipe(
    payload: ImportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ImportJob:
    source_url = str(payload.url)
    try:
        source_url = normalize_recipe_url(source_url)
    except RecipeImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)
        ) from exc
    duplicate = db.scalar(
        select(Recipe).where(Recipe.user_id == user.id, Recipe.source_url == source_url)
    )
    if duplicate:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Этот рецепт уже добавлен")

    job = ImportJob(id=str(uuid4()), user_id=user.id, source_url=source_url)
    db.add(job)
    db.commit()
    db.refresh(job)
    background_tasks.add_task(process_import_job, job.id)
    return job


@router.get("/imports/recent", response_model=list[ImportJobRead])
def list_import_jobs(
    db: Session = Depends(get_db), user: User = Depends(get_current_user)
) -> list[ImportJob]:
    return list(
        db.scalars(
            select(ImportJob)
            .where(ImportJob.user_id == user.id)
            .order_by(ImportJob.created_at.desc())
            .limit(10)
        ).all()
    )


@router.get("/imports/{job_id}", response_model=ImportJobRead)
def get_import_job(
    job_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ImportJob:
    job = db.scalar(select(ImportJob).where(ImportJob.id == job_id, ImportJob.user_id == user.id))
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Импорт не найден")
    return job


@router.patch("/{recipe_id}", response_model=RecipeRead)
def update_recipe(
    recipe_id: int,
    payload: RecipeUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RecipeRead:
    recipe = load_recipe(db, recipe_id, user.id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не найден")
    meal_types = list(dict.fromkeys(payload.meal_types))
    recipe.primary_meal_type = meal_types[0]
    recipe.meal_categories.clear()
    db.flush()
    recipe.meal_categories = [RecipeMealType(meal_type=value) for value in meal_types]
    db.commit()
    return recipe_to_schema(recipe)


@router.patch("/{recipe_id}/ingredients/{recipe_ingredient_id}", response_model=RecipeRead)
def update_recipe_ingredient(
    recipe_id: int,
    recipe_ingredient_id: int,
    payload: IngredientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> RecipeRead:
    recipe = load_recipe(db, recipe_id, user.id)
    if recipe is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Рецепт не найден")
    item = next((value for value in recipe.ingredients if value.id == recipe_ingredient_id), None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ингредиент не найден")

    normalized_name = normalize_ingredient_name(payload.name)
    current = item.ingredient
    next_unit = payload.unit.strip() if payload.unit else None
    amount_changed = payload.quantity != item.quantity or next_unit != item.unit
    if normalized_name != current.normalized_name:
        item.ingredient = get_or_create_ingredient(db, user.id, payload.name)
    else:
        current.name = payload.name.strip()
    item.quantity = payload.quantity
    item.unit = next_unit
    item.note = payload.note.strip() if payload.note else None
    if amount_changed:
        item.alternative_quantity = None
        item.alternative_unit = None
    item.ingredient.is_pantry = payload.is_pantry
    item.source_text = " ".join(
        value
        for value in [
            payload.name.strip(),
            str(payload.quantity).replace(".", ",") if payload.quantity is not None else None,
            item.unit,
            item.note,
        ]
        if value
    )
    db.commit()
    recipe = load_recipe(db, recipe_id, user.id)
    assert recipe is not None
    return recipe_to_schema(recipe)
