from pydantic_settings import BaseSettings
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
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
    ]

    def __init__(self, **data):
        super().__init__(**data)
        # Allow ALLOWED_ORIGINS to be overridden by environment variable
        if os.getenv("ALLOWED_ORIGINS"):
            allowed_origins_str = os.getenv("ALLOWED_ORIGINS")
            try:
                import json
                self.ALLOWED_ORIGINS = json.loads(allowed_origins_str)
            except:
                # Fallback: split by comma
                self.ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_str.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

