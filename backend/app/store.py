"""Thread-safe JSON-backed local data store.

It deliberately has no database dependency: a new installation gets useful
seed data, while updates are written atomically to a private local JSON file.
Set GARAGE_PERSIST_DATA=false for a purely in-memory demo session.
"""

from __future__ import annotations

import json
import tempfile
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from threading import RLock
from typing import Any

from .seed import seed_data


COLLECTIONS = ("settings", "customers", "vehicles", "jobs", "appointments", "inventory", "invoices")


class LocalStore:
    def __init__(self, data_file: Path, *, persist: bool = True) -> None:
        self.data_file = data_file
        self.persist = persist
        self._lock = RLock()
        self._data: dict[str, list[dict[str, Any]]] = self._load()

    def _load(self) -> dict[str, list[dict[str, Any]]]:
        if self.persist and self.data_file.exists():
            try:
                with self.data_file.open("r", encoding="utf-8") as source:
                    loaded = json.load(source)
            except (OSError, json.JSONDecodeError) as error:
                raise RuntimeError(
                    f"Unable to read local garage data at {self.data_file}. "
                    "Move or repair the file before restarting the API."
                ) from error
            if not isinstance(loaded, dict):
                raise RuntimeError(f"Local garage data at {self.data_file} must be a JSON object.")
            data = loaded
        else:
            data = seed_data()

        for collection in COLLECTIONS:
            value = data.setdefault(collection, [])
            if not isinstance(value, list):
                raise RuntimeError(f"Collection '{collection}' in {self.data_file} must be a JSON array.")

        if self.persist and not self.data_file.exists():
            self._write(data)
        return data

    @staticmethod
    def _timestamp() -> str:
        return datetime.now(timezone.utc).replace(microsecond=0).isoformat()

    def _write(self, data: dict[str, list[dict[str, Any]]]) -> None:
        self.data_file.parent.mkdir(parents=True, exist_ok=True)
        temporary_path: str | None = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self.data_file.parent,
                prefix=f".{self.data_file.name}.",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                json.dump(data, temporary_file, indent=2, ensure_ascii=False)
                temporary_file.write("\n")
                temporary_path = temporary_file.name
            Path(temporary_path).replace(self.data_file)
        except OSError as error:
            if temporary_path:
                Path(temporary_path).unlink(missing_ok=True)
            raise RuntimeError(f"Unable to persist local garage data to {self.data_file}.") from error

    def _save(self) -> None:
        if self.persist:
            self._write(self._data)

    def _collection(self, name: str) -> list[dict[str, Any]]:
        if name not in COLLECTIONS:
            raise ValueError(f"Unknown collection: {name}")
        return self._data[name]

    def list(self, name: str) -> list[dict[str, Any]]:
        with self._lock:
            return deepcopy(self._collection(name))

    def get(self, name: str, resource_id: str) -> dict[str, Any] | None:
        with self._lock:
            row = next((item for item in self._collection(name) if item["id"] == resource_id), None)
            return deepcopy(row) if row else None

    def create(self, name: str, payload: dict[str, Any], *, id_prefix: str) -> dict[str, Any]:
        with self._lock:
            now = self._timestamp()
            row = {
                "id": f"{id_prefix}_{uuid.uuid4().hex[:10]}",
                **deepcopy(payload),
                "created_at": now,
                "updated_at": now,
            }
            self._collection(name).append(row)
            self._save()
            return deepcopy(row)

    def update(self, name: str, resource_id: str, changes: dict[str, Any]) -> dict[str, Any] | None:
        with self._lock:
            for row in self._collection(name):
                if row["id"] == resource_id:
                    row.update(deepcopy(changes))
                    row["updated_at"] = self._timestamp()
                    self._save()
                    return deepcopy(row)
            return None

    def delete(self, name: str, resource_id: str) -> bool:
        with self._lock:
            rows = self._collection(name)
            for index, row in enumerate(rows):
                if row["id"] == resource_id:
                    rows.pop(index)
                    self._save()
                    return True
            return False

    def reset(self) -> None:
        with self._lock:
            self._data = seed_data()
            self._save()
