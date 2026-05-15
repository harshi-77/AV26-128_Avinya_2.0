from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    app_name: str = "AI Medical Imaging Diagnostics API"
    api_version: str = "1.0.0"
    frontend_origins: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    image_size: int = 224
    upload_dir: Path = BACKEND_DIR / "uploads"
    saved_models_dir: Path = BACKEND_DIR / "saved_models"
    allow_untrained_fallback: bool = True
    max_upload_mb: int = 25

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="MEDAI_",
        case_sensitive=False,
    )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    settings.saved_models_dir.mkdir(parents=True, exist_ok=True)
    return settings
