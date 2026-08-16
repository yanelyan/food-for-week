from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import ImportJob, ImportStatus, Ingredient, Recipe, RecipeIngredient
from app.services.ingredient_parser import normalize_ingredient_name
from app.services.recipe_importer import RecipeImportError, fetch_recipe


def get_or_create_ingredient(db: Session, user_id: int, name: str) -> Ingredient:
    normalized_name = normalize_ingredient_name(name)
    ingredient = db.scalar(
        select(Ingredient).where(
            Ingredient.user_id == user_id,
            Ingredient.normalized_name == normalized_name,
        )
    )
    if ingredient is None:
        ingredient = Ingredient(user_id=user_id, name=name.strip(), normalized_name=normalized_name)
        db.add(ingredient)
        db.flush()
    return ingredient


def load_recipe(db: Session, recipe_id: int, user_id: int) -> Recipe | None:
    return db.scalar(
        select(Recipe)
        .options(selectinload(Recipe.ingredients).selectinload(RecipeIngredient.ingredient))
        .where(Recipe.id == recipe_id, Recipe.user_id == user_id)
    )


def process_import_job(job_id: str) -> None:
    from app.database import SessionLocal

    with SessionLocal() as db:
        job = db.get(ImportJob, job_id)
        if job is None:
            return
        job.status = ImportStatus.processing
        db.commit()
        try:
            imported = fetch_recipe(job.source_url)
            duplicate = db.scalar(
                select(Recipe).where(
                    Recipe.user_id == job.user_id,
                    Recipe.source_url.in_([job.source_url, imported.source_url]),
                )
            )
            if duplicate:
                raise RecipeImportError("Этот рецепт уже добавлен")

            recipe = Recipe(
                user_id=job.user_id,
                title=imported.title,
                meal_type=imported.meal_type,
                source_url=imported.source_url,
                image_url=imported.image_url,
                source_yield=imported.source_yield,
            )
            db.add(recipe)
            db.flush()
            for position, parsed in enumerate(imported.ingredients):
                ingredient = get_or_create_ingredient(db, job.user_id, parsed.name)
                db.add(
                    RecipeIngredient(
                        recipe_id=recipe.id,
                        ingredient_id=ingredient.id,
                        position=position,
                        source_text=parsed.source_text,
                        quantity=parsed.quantity,
                        unit=parsed.unit,
                        note=parsed.note,
                        alternative_quantity=parsed.alternative_quantity,
                        alternative_unit=parsed.alternative_unit,
                    )
                )
            job.recipe_id = recipe.id
            job.status = ImportStatus.completed
            db.commit()
        except Exception as exc:  # job boundary: store a safe error for polling clients
            db.rollback()
            job = db.get(ImportJob, job_id)
            if job is None:
                return
            job.status = ImportStatus.failed
            job.error_message = (
                str(exc) if isinstance(exc, RecipeImportError) else "Не удалось обработать рецепт"
            )
            db.commit()
