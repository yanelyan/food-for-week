from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import User
from app.services.plan_service import planning_window


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
