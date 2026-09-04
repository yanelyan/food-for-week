import pytest
from pydantic import ValidationError

from app.config import Settings


def test_production_requires_telegram_token() -> None:
    with pytest.raises(ValidationError, match="TELEGRAM_BOT_TOKEN"):
        Settings(app_env="production", telegram_bot_token="", _env_file=None)


def test_local_mode_allows_test_user_without_token() -> None:
    configured = Settings(app_env="local", telegram_bot_token="", _env_file=None)

    assert configured.is_local is True
