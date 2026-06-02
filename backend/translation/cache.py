"""In-memory TTL cache for translation results.

Uses content-hash keys: SHA-256(sourceType + rawContent + patientContext).
Thread-safe via threading.Lock.

Follows the same pattern as codex/early-screening llm_service.py cache.
"""

import hashlib
import threading
import time
from typing import Any, Optional

from .types import TranslationResult


class TranslationCache:
    """Thread-safe in-memory TTL cache keyed by content hash."""

    def __init__(self, ttl_seconds: int = 86400):
        self._ttl = ttl_seconds
        self._store: dict[str, tuple[TranslationResult, float]] = {}
        self._lock = threading.Lock()

    @staticmethod
    def compute_key(
        source_type: str,
        raw_content: str,
        patient_context_text: str,
    ) -> str:
        """Compute a content-hash cache key."""
        payload = f"{source_type}|{raw_content}|{patient_context_text}"
        return hashlib.sha256(payload.encode("utf-8")).hexdigest()

    def get(self, cache_key: str) -> Optional[TranslationResult]:
        """Return cached result if present and not expired, else None."""
        with self._lock:
            entry = self._store.get(cache_key)
            if entry is None:
                return None
            result, stored_at = entry
            if time.monotonic() - stored_at > self._ttl:
                del self._store[cache_key]
                return None
            return result

    def set(self, cache_key: str, result: TranslationResult) -> None:
        """Store a translation result in the cache."""
        with self._lock:
            self._store[cache_key] = (result, time.monotonic())

    def clear(self) -> None:
        """Clear all cached entries."""
        with self._lock:
            self._store.clear()

    def __len__(self) -> int:
        with self._lock:
            return len(self._store)
