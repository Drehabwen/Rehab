"""Translation layer shared types.

Defines the data structures used throughout the translation module:
source types, patient context, translation results.
"""

from typing import Literal, Optional, Any

# ── Source types ──
SourceType = Literal["plan", "scale", "assessment"]

# ── Patient context (minimal demographics for prompt personalization) ──
class PatientContext:
    """Minimal patient demographics passed to the LLM for contextualized translation."""
    def __init__(
        self,
        display_name: str = "",
        age: Optional[int] = None,
        sex: Optional[str] = None,
        diagnosis_tags: Optional[list[str]] = None,
    ):
        self.display_name = display_name
        self.age = age
        self.sex = sex
        self.diagnosis_tags = diagnosis_tags or []

    def to_dict(self) -> dict[str, Any]:
        return {
            "display_name": self.display_name,
            "age": self.age,
            "sex": self.sex,
            "diagnosis_tags": self.diagnosis_tags,
        }

    def demographics_text(self) -> str:
        """Build a human-readable demographics string for prompts."""
        parts = [self.display_name] if self.display_name else []
        if self.age is not None:
            parts.append(f"{self.age}岁")
        if self.sex:
            label = "男" if self.sex == "male" else "女" if self.sex == "female" else ""
            if label:
                parts.append(label)
        if self.diagnosis_tags:
            parts.append(f"诊断: {', '.join(self.diagnosis_tags)}")
        return ", ".join(parts) if parts else "未知患者"


# ── Translation result ──
class TranslationResult:
    """Container returned by TranslationService.translate()."""
    def __init__(
        self,
        source_type: SourceType,
        original_content: str,
        translated_content: str,
        structured_output: Optional[dict[str, Any]] = None,
        source: Literal["llm", "fallback"] = "llm",
    ):
        self.source_type = source_type
        self.original_content = original_content
        self.translated_content = translated_content
        self.structured_output = structured_output
        self.source = source  # "llm" or "fallback"
