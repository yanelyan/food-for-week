from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.plan import router as plan_router
from app.api.recipes import router as recipes_router
from app.api.shopping import router as shopping_router
from app.config import settings

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


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
