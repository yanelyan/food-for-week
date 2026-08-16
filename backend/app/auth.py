import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from urllib.parse import parse_qsl

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User


@dataclass(frozen=True)
class TelegramUser:
    telegram_id: int
    display_name: str


def validate_telegram_init_data(init_data: str) -> TelegramUser:
    if not settings.telegram_bot_token:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Bot token missing")

    values = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = values.pop("hash", None)
    auth_date = int(values.get("auth_date", "0"))
    if not received_hash or abs(time.time() - auth_date) > 86400:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram data")

    data_check = "\n".join(f"{key}={values[key]}" for key in sorted(values))
    secret = hmac.new(b"WebAppData", settings.telegram_bot_token.encode(), hashlib.sha256).digest()
    expected_hash = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_hash, received_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Telegram signature")

    user_data = json.loads(values.get("user", "{}"))
    telegram_id = int(user_data["id"])
    display_name = " ".join(
        part for part in [user_data.get("first_name"), user_data.get("last_name")] if part
    ) or user_data.get("username", f"Пользователь {telegram_id}")
    return TelegramUser(telegram_id=telegram_id, display_name=display_name)


def get_current_user(
    db: Session = Depends(get_db),
    telegram_init_data: str | None = Header(default=None, alias="X-Telegram-Init-Data"),
) -> User:
    if settings.is_local and not telegram_init_data:
        user = db.get(User, 1)
        if user is None:
            user = User(id=1, display_name="Локальный пользователь")
            db.add(user)
            db.commit()
            db.refresh(user)
        return user

    if not telegram_init_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Telegram auth required")

    telegram_user = validate_telegram_init_data(telegram_init_data)
    user = db.scalar(select(User).where(User.telegram_id == telegram_user.telegram_id))
    if user is None:
        user = User(
            telegram_id=telegram_user.telegram_id,
            display_name=telegram_user.display_name,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user
