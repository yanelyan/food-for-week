"""Initial data model."""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

meal_type = postgresql.ENUM(
    "breakfast", "lunch", "dinner", "dessert", name="mealtype", create_type=False
)
import_status = postgresql.ENUM(
    "pending", "processing", "completed", "failed", name="importstatus", create_type=False
)


def upgrade() -> None:
    meal_type.create(op.get_bind(), checkfirst=True)
    import_status.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=True),
        sa.Column("display_name", sa.String(120), nullable=False),
        sa.Column("plan_started_on", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("telegram_id"),
    )
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"])
    op.create_table(
        "recipes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("title", sa.String(240), nullable=False),
        sa.Column("meal_type", meal_type, nullable=False),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=True),
        sa.Column("source_yield", sa.String(120), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "source_url", name="uq_recipe_user_source"),
    )
    op.create_index("ix_recipes_user_id", "recipes", ["user_id"])
    op.create_table(
        "ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("name", sa.String(180), nullable=False),
        sa.Column("normalized_name", sa.String(180), nullable=False),
        sa.UniqueConstraint("user_id", "normalized_name", name="uq_ingredient_user_name"),
    )
    op.create_index("ix_ingredients_user_id", "ingredients", ["user_id"])
    op.create_index("ix_ingredients_normalized_name", "ingredients", ["normalized_name"])
    op.create_table(
        "recipe_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE")),
        sa.Column("ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.id", ondelete="RESTRICT")),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("source_text", sa.Text(), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=True),
        sa.Column("unit", sa.String(40), nullable=True),
        sa.Column("note", sa.String(120), nullable=True),
        sa.Column("alternative_quantity", sa.Float(), nullable=True),
        sa.Column("alternative_unit", sa.String(40), nullable=True),
    )
    op.create_index("ix_recipe_ingredients_recipe_id", "recipe_ingredients", ["recipe_id"])
    op.create_index("ix_recipe_ingredients_ingredient_id", "recipe_ingredients", ["ingredient_id"])
    op.create_table(
        "planned_recipes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE")),
        sa.Column("planned_date", sa.Date(), nullable=False),
        sa.Column("meal_type", meal_type, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint(
            "user_id", "recipe_id", "planned_date", "meal_type", name="uq_planned_recipe_slot"
        ),
    )
    op.create_index("ix_planned_recipes_user_id", "planned_recipes", ["user_id"])
    op.create_index("ix_planned_recipes_recipe_id", "planned_recipes", ["recipe_id"])
    op.create_index("ix_planned_recipes_planned_date", "planned_recipes", ["planned_date"])
    op.create_table(
        "shopping_checks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("ingredient_id", sa.Integer(), sa.ForeignKey("ingredients.id", ondelete="CASCADE")),
        sa.Column("checked", sa.Boolean(), nullable=False),
        sa.UniqueConstraint("user_id", "period_start", "ingredient_id", name="uq_shopping_check"),
    )
    op.create_index("ix_shopping_checks_user_id", "shopping_checks", ["user_id"])
    op.create_index("ix_shopping_checks_period_start", "shopping_checks", ["period_start"])
    op.create_index("ix_shopping_checks_ingredient_id", "shopping_checks", ["ingredient_id"])
    op.create_table(
        "import_jobs",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE")),
        sa.Column("source_url", sa.Text(), nullable=False),
        sa.Column("status", import_status, nullable=False),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="SET NULL")),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_import_jobs_user_id", "import_jobs", ["user_id"])


def downgrade() -> None:
    op.drop_table("import_jobs")
    op.drop_table("shopping_checks")
    op.drop_table("planned_recipes")
    op.drop_table("recipe_ingredients")
    op.drop_table("ingredients")
    op.drop_table("recipes")
    op.drop_table("users")
    import_status.drop(op.get_bind(), checkfirst=True)
    meal_type.drop(op.get_bind(), checkfirst=True)
