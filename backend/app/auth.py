"""Session-token authentication for the local garage API.

Passwords are hashed with PBKDF2-SHA256 (standard library only) and sessions
are opaque bearer tokens persisted in the local store, so a sign-in survives
`uvicorn --reload` and machine restarts during client testing.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, Request, status

PBKDF2_ITERATIONS = 240_000
SESSION_TTL = timedelta(days=7)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt, digest = encoded.split("$")
        if algorithm != "pbkdf2_sha256":
            return False
        candidate = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iterations)
        ).hex()
        return hmac.compare_digest(candidate, digest)
    except (TypeError, ValueError):
        return False


def public_user(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "username": row["username"],
        "name": row.get("name", row["username"]),
        "role": row.get("role", "Team member"),
    }


class SessionAuth:
    """Login, logout and bearer-token validation backed by the local store."""

    def __init__(self, store: Any, public_paths: set[str]) -> None:
        self.store = store
        self.public_paths = public_paths

    @staticmethod
    def _now() -> datetime:
        return datetime.now(timezone.utc)

    def _purge_expired(self) -> None:
        now = self._now().isoformat()
        for session in self.store.list("sessions"):
            if session.get("expires_at", "") < now:
                self.store.delete("sessions", session["id"])

    def login(self, username: str, password: str) -> dict[str, Any]:
        needle = username.strip().casefold()
        user = next(
            (row for row in self.store.list("users") if row["username"].casefold() == needle),
            None,
        )
        if user is None or not verify_password(password, user.get("password_hash", "")):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="That username and password combination was not recognised.",
            )
        self._purge_expired()
        token = secrets.token_urlsafe(32)
        expires_at = (self._now() + SESSION_TTL).isoformat()
        self.store.create(
            "sessions",
            {"token": token, "user_id": user["id"], "expires_at": expires_at},
            id_prefix="ses",
        )
        return {"token": token, "expiresAt": expires_at, "user": public_user(user)}

    def logout(self, token: str | None) -> None:
        if not token:
            return
        for session in self.store.list("sessions"):
            if hmac.compare_digest(session.get("token", ""), token):
                self.store.delete("sessions", session["id"])
                return

    def resolve(self, token: str | None) -> dict[str, Any] | None:
        if not token:
            return None
        session = next(
            (row for row in self.store.list("sessions") if hmac.compare_digest(row.get("token", ""), token)),
            None,
        )
        if session is None or session.get("expires_at", "") < self._now().isoformat():
            return None
        user = self.store.get("users", session["user_id"])
        return public_user(user) if user else None

    @staticmethod
    def bearer_token(request: Request) -> str | None:
        header = request.headers.get("Authorization", "")
        scheme, _, token = header.partition(" ")
        return token.strip() if scheme.lower() == "bearer" and token.strip() else None

    async def guard(self, request: Request) -> None:
        """Global dependency: every API route needs a session except public ones."""
        if request.method == "OPTIONS" or request.url.path in self.public_paths:
            return
        user = self.resolve(self.bearer_token(request))
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sign in to use the garage API.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        request.state.user = user
