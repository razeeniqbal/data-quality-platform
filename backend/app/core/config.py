from pydantic_settings import BaseSettings
from typing import List
import json
import os


class Settings(BaseSettings):
    APP_NAME: str = "Data Quality Platform"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    DATABASE_URL: str = "sqlite:///./data_quality.db"
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    FRONTEND_URL: str = "http://localhost:5173"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"
        case_sensitive = True

    def __init__(self, **data):
        super().__init__(**data)
        # Parse ALLOWED_ORIGINS from environment variable if present
        allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
        if allowed_origins_env:
            try:
                self.ALLOWED_ORIGINS = json.loads(allowed_origins_env)
            except (json.JSONDecodeError, ValueError):
                # Fallback: treat as comma-separated string
                self.ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_env.split(",")]


settings = Settings()

