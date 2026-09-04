from datetime import UTC, date, datetime

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import User
from app.services.plan_service import planning_window, user_today


def test_user_today_uses_account_timezone_at_day_boundary() -> None:
    instant = datetime(2026, 9, 4, 22, 30, tzinfo=UTC)
    moscow_user = User(display_name="Москва", timezone_name="Europe/Moscow")
    los_angeles_user = User(display_name="Лос-Анджелес", timezone_name="America/Los_Angeles")

    assert user_today(moscow_user, instant) == date(2026, 9, 5)
    assert user_today(los_angeles_user, instant) == date(2026, 9, 4)


def test_window_is_anchored_to_weekly_purchase_day() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(display_name="Тест", purchase_weekday=3, timezone_name="Asia/Omsk")
        db.add(user)
        db.commit()

        window = planning_window(user, date(2026, 8, 23))
        assert window.cycle_start == date(2026, 8, 20)
        assert window.shopping_start == date(2026, 8, 21)
        assert window.shopping_end == date(2026, 8, 27)
        assert window.plan_end == date(2026, 10, 21)

        next_window = planning_window(user, date(2026, 8, 27))
        assert next_window.cycle_start == date(2026, 8, 27)
        assert next_window.shopping_end == date(2026, 9, 3)
