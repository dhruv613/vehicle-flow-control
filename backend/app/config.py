"""Runtime configuration for the local FastAPI service."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _as_bool(value: str | None, default: bool = True) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _origins() -> list[str]:
    configured = os.getenv("GARAGE_CORS_ORIGINS")
    if configured:
        return [origin.strip() for origin in configured.split(",") if origin.strip()]

    # The API is intentionally easy to reach from Expo Go, a LAN device, and
    # the local web development server. Set GARAGE_CORS_ORIGINS in production.
    return ["*"]


@dataclass(frozen=True)
class Settings:
    app_name: str
    api_prefix: str
    data_file: Path
    persist_data: bool
    cors_origins: list[str]


BASE_DIR = Path(__file__).resolve().parents[1]

settings = Settings(
    app_name="Vehicle Flow Control API",
    api_prefix="/api",
    data_file=Path(os.getenv("GARAGE_DATA_FILE", BASE_DIR / "data" / "garage.json")),
    persist_data=_as_bool(os.getenv("GARAGE_PERSIST_DATA"), default=True),
    cors_origins=_origins(),
)
