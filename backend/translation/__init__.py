"""Translation layer public API.

Usage:
    from translation import get_translation_service

    svc = get_translation_service()
    result = svc.translate("plan", raw_markdown, patient_context)
"""

from .service import TranslationService, get_translation_service
from .types import TranslationResult, PatientContext, SourceType

__all__ = [
    "TranslationService",
    "get_translation_service",
    "TranslationResult",
    "PatientContext",
    "SourceType",
]
