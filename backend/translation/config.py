"""Translation layer configuration.

Reads from environment variables with sensible defaults.
No dependency on the codex settings module — self-contained.
"""

import os


class TranslationConfig:
    """Configuration for the translation service."""

    @property
    def api_key(self) -> str:
        return (
            os.environ.get("DEEPSEEK_API_KEY")
            or ""
        ).strip()

    @property
    def model(self) -> str:
        return os.environ.get("TRANSLATION_MODEL", "deepseek-v4-flash")

    @property
    def timeout_seconds(self) -> int:
        return int(os.environ.get("TRANSLATION_TIMEOUT", "45"))

    @property
    def cache_ttl_seconds(self) -> int:
        return int(os.environ.get("TRANSLATION_CACHE_TTL", "86400"))  # 24h default

    @property
    def max_tokens(self) -> int:
        return int(os.environ.get("TRANSLATION_MAX_TOKENS", "4096"))

    @property
    def enabled(self) -> bool:
        """Whether translation is enabled. Requires API key."""
        return bool(self.api_key)


# Singleton
_config: TranslationConfig | None = None


def get_translation_config() -> TranslationConfig:
    global _config
    if _config is None:
        _config = TranslationConfig()
    return _config
