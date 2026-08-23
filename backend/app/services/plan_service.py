from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models import User

PLAN_WEEKS = 9


class PurchaseDayRequiredError(ValueError):
    pass


@dataclass(frozen=True)
class PlanningWindow:
    today: date
    cycle_start: date
    plan_end: date
    shopping_start: date
    shopping_end: date


def user_today(user: User, now: datetime | None = None) -> date:
    try:
        timezone = ZoneInfo(user.timezone_name or "UTC")
    except ZoneInfoNotFoundError:
        timezone = ZoneInfo("UTC")
    current = now or datetime.now(timezone)
    if current.tzinfo is None:
        current = current.replace(tzinfo=timezone)
    return current.astimezone(timezone).date()


def planning_window(user: User, today: date | None = None) -> PlanningWindow:
    if user.purchase_weekday is None:
        raise PurchaseDayRequiredError("Сначала выберите день закупок")
    current_date = today or user_today(user)
    days_since_purchase = (current_date.weekday() - user.purchase_weekday) % 7
    cycle_start = current_date - timedelta(days=days_since_purchase)
    return PlanningWindow(
        today=current_date,
        cycle_start=cycle_start,
        plan_end=cycle_start + timedelta(days=PLAN_WEEKS * 7 - 1),
        shopping_start=cycle_start + timedelta(days=1),
        shopping_end=cycle_start + timedelta(days=7),
    )
