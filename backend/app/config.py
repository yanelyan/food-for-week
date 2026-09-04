from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Food_for_week"
    app_env: str = "local"
    database_url: str = "sqlite:///./food_for_week.sqlite3"
    telegram_bot_token: str = ""
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def require_production_secrets(self) -> "Settings":
        if not self.is_local and not self.telegram_bot_token.strip():
            raise ValueError("TELEGRAM_BOT_TOKEN is required outside local mode")
        return self

    @property
    def is_local(self) -> bool:
        return self.app_env.lower() == "local"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.frontend_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
