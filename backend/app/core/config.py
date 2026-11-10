from pathlib import Path
from pydantic_settings import BaseSettings
from typing import List

_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
_ENV_PATH = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    LLM_PROVIDER: str = "openai"
    OPENAI_MODEL: str = "gpt-4o-mini"
    DATABASE_URL: str = "sqlite:///./simulador.db"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        env_file = str(_ENV_PATH) if _ENV_PATH.exists() else ".env"
        extra = "ignore"


settings = Settings()

