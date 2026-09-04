import hashlib
import hmac
import time
from urllib.parse import urlencode

import pytest
from fastapi import HTTPException

from app.auth import settings, validate_telegram_init_data


def signed_init_data(values: dict[str, str], token: str) -> str:
    data_check = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    signature = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    return urlencode({**values, "hash": signature})


def test_invalid_auth_date_returns_unauthorized(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "telegram_bot_token", "test-token")

    with pytest.raises(HTTPException) as error:
        validate_telegram_init_data("auth_date=not-a-number&hash=invalid")

    assert error.value.status_code == 401


def test_malformed_signed_user_returns_unauthorized(monkeypatch: pytest.MonkeyPatch) -> None:
    token = "test-token"
    monkeypatch.setattr(settings, "telegram_bot_token", token)
    init_data = signed_init_data(
        {"auth_date": str(int(time.time())), "user": "not-json"},
        token,
    )

    with pytest.raises(HTTPException) as error:
        validate_telegram_init_data(init_data)

    assert error.value.status_code == 401
