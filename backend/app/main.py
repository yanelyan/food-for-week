from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.plan import router as plan_router
from app.api.recipes import router as recipes_router
from app.api.settings import router as settings_router
from app.api.shopping import router as shopping_router
from app.config import settings
from app.services.plan_service import PurchaseDayRequiredError

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(recipes_router, prefix="/api")
app.include_router(plan_router, prefix="/api")
app.include_router(shopping_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.exception_handler(PurchaseDayRequiredError)
def purchase_day_required(_request: Request, exc: PurchaseDayRequiredError) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": str(exc)},
    )


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
