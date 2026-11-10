from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api.cases import router as cases_router
from app.api.simulations import router as simulations_router


# Crear tablas en SQLite al inicio
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Simulador Judicial Interactivo",
    version="1.0.0",
    description="Backend para análisis de expedientes y simulación de juicios orales."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cases_router)
app.include_router(simulations_router)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "provider": settings.LLM_PROVIDER, "model": settings.OPENAI_MODEL}
