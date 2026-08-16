from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.database import Base
from app.models import User
from app.services.plan_service import ensure_current_period


def test_period_stays_fixed_then_moves_by_full_week() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(display_name="Тест", plan_started_on=date(2026, 8, 17))
        db.add(user)
        db.commit()

        start, end = ensure_current_period(db, user, date(2026, 8, 23))
        assert start == date(2026, 8, 17)
        assert end == date(2026, 8, 23)

        start, end = ensure_current_period(db, user, date(2026, 8, 24))
        assert start == date(2026, 8, 24)
        assert end == date(2026, 8, 30)

        start, end = ensure_current_period(db, user, date(2026, 9, 8))
        assert start == date(2026, 9, 7)
        assert end == date(2026, 9, 13)
