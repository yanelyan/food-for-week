from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models import User

PERIOD_DAYS = 7


def ensure_current_period(db: Session, user: User, today: date | None = None) -> tuple[date, date]:
    current_date = today or date.today()
    if user.plan_started_on is None:
        user.plan_started_on = current_date
        db.commit()
    elif current_date >= user.plan_started_on + timedelta(days=PERIOD_DAYS):
        elapsed_days = (current_date - user.plan_started_on).days
        periods_passed = elapsed_days // PERIOD_DAYS
        user.plan_started_on += timedelta(days=periods_passed * PERIOD_DAYS)
        db.commit()
    period_start = user.plan_started_on
    assert period_start is not None
    return period_start, period_start + timedelta(days=PERIOD_DAYS - 1)
