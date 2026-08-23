from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import ShoppingCheck, User
from app.schemas import UserSettingsRead, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("", response_model=UserSettingsRead)
def get_settings(user: User = Depends(get_current_user)) -> UserSettingsRead:
    return UserSettingsRead(
        purchase_weekday=user.purchase_weekday,
        timezone_name=user.timezone_name or "UTC",
    )


@router.put("", response_model=UserSettingsRead)
def update_settings(
    payload: UserSettingsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> UserSettingsRead:
    try:
        ZoneInfo(payload.timezone_name)
    except ZoneInfoNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Неизвестный часовой пояс",
        ) from exc

    weekday_changed = user.purchase_weekday != payload.purchase_weekday
    user.purchase_weekday = payload.purchase_weekday
    user.timezone_name = payload.timezone_name
    if weekday_changed:
        db.execute(delete(ShoppingCheck).where(ShoppingCheck.user_id == user.id))
    db.commit()
    return UserSettingsRead(
        purchase_weekday=user.purchase_weekday,
        timezone_name=user.timezone_name,
    )
