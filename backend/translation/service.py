"""TranslationService — unified translation layer.

Converts therapist professional content (treatment plans, scale tasks,
assessment summaries) into parent-friendly language using DeepSeek LLM.

Pattern based on utils/treatment_plan_service.py:
- Synchronous OpenAI SDK (DeepSeek-compatible)
- TTL memory cache with threading.Lock
- Error wrapping: fallback to original content
- Content-hash cache keys

Usage:
    svc = get_translation_service()
    result = svc.translate("plan", raw_markdown, patient_ctx)
    # result.translated_content is the JSON string
    # result.structured_output is the parsed dict (or None on fallback)
"""

import json
import logging
import re
from typing import Any, Optional

from .types import TranslationResult, PatientContext, SourceType
from .config import get_translation_config
from .cache import TranslationCache
from .prompts import build_plan_prompt, build_scale_prompt, build_assessment_prompt

logger = logging.getLogger(__name__)

# ── Prompt builders per source type ──
_PROMPT_BUILDERS = {
    "plan": build_plan_prompt,
    "scale": build_scale_prompt,
    "assessment": build_assessment_prompt,
}


class TranslationService:
    """Calls DeepSeek LLM to translate professional content into parent-friendly language."""

    def __init__(self) -> None:
        self._config = get_translation_config()
        self._cache = TranslationCache(ttl_seconds=self._config.cache_ttl_seconds)

    # ── Public API ──

    def translate(
        self,
        source_type: SourceType,
        raw_content: str,
        patient_context: Optional[PatientContext] = None,
    ) -> TranslationResult:
        """Translate professional content into parent-friendly language.

        Args:
            source_type: "plan", "scale", or "assessment"
            raw_content: The original professional content
            patient_context: Optional patient demographics for personalization

        Returns:
            TranslationResult with translated_content and structured_output

        Never raises — falls back to original content on any error.
        """
        ctx = patient_context or PatientContext()
        demographics = ctx.demographics_text()

        # 1. Check cache
        cache_key = self._cache.compute_key(source_type, raw_content, demographics)
        cached = self._cache.get(cache_key)
        if cached is not None:
            logger.info("Translation cache hit for %s", source_type)
            return cached

        # 2. Check if enabled
        if not self._config.enabled:
            logger.warning("Translation disabled — no DEEPSEEK_API_KEY set")
            result = self._fallback(source_type, raw_content)
            self._cache.set(cache_key, result)
            return result

        # 3. Call LLM
        try:
            result = self._call_llm(source_type, raw_content, demographics)
            self._cache.set(cache_key, result)
            return result
        except Exception as exc:
            logger.error("Translation failed for %s: %s", source_type, exc)
            result = self._fallback(source_type, raw_content)
            self._cache.set(cache_key, result)
            return result

    # ── Internal methods ──

    def _call_llm(
        self,
        source_type: SourceType,
        raw_content: str,
        demographics: str,
    ) -> TranslationResult:
        """Call DeepSeek API via OpenAI SDK and parse the response."""
        from openai import OpenAI

        client = OpenAI(
            api_key=self._config.api_key,
            base_url="https://api.deepseek.com",
        )

        builder = _PROMPT_BUILDERS[source_type]
        prompt = builder(raw_content, demographics)

        system_prompt = "你是小柱，一位温暖、有同理心的AI儿童康复助手。你用大白话跟家长沟通，把专业康复知识翻译成家长能看懂、能执行的日常指南。你的语气像邻家哥哥/姐姐，亲切、鼓励、不说教。"

        response = client.chat.completions.create(
            model=self._config.model,
            max_tokens=self._config.max_tokens,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            timeout=self._config.timeout_seconds,
        )

        text = response.choices[0].message.content or ""
        text = text.strip()
        # Strip markdown code fences
        if text.startswith("```"):
            lines = text.split("\n")
            text = "\n".join(
                lines[1:-1] if lines[-1].strip() == "```" else lines[1:]
            )

        try:
            structured = json.loads(text)
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON for %s, using raw text", source_type)
            structured = None

        return TranslationResult(
            source_type=source_type,
            original_content=raw_content,
            translated_content=json.dumps(structured, ensure_ascii=False) if structured else text,
            structured_output=structured,
            source="llm",
        )

    def _fallback(
        self,
        source_type: SourceType,
        raw_content: str,
    ) -> TranslationResult:
        """Return original content as fallback when LLM is unavailable."""
        structured_output = None
        translated_content = raw_content

        if source_type == "plan":
            structured_output = self._build_plan_fallback(raw_content)
            translated_content = json.dumps(structured_output, ensure_ascii=False)

        return TranslationResult(
            source_type=source_type,
            original_content=raw_content,
            translated_content=translated_content,
            structured_output=structured_output,
            source="fallback",
        )

    def _build_plan_fallback(self, raw_content: str) -> dict[str, Any]:
        """Build a conservative parent guide without changing the prescription."""
        lines = [line.strip() for line in raw_content.splitlines() if line.strip()]
        exercise_lines = self._extract_exercise_lines(lines)
        cautions = self._extract_cautions(lines)
        estimated_minutes = self._estimate_minutes(raw_content, len(exercise_lines))

        exercises = []
        for line in exercise_lines:
            name = self._clean_exercise_name(line)
            exercises.append(
                {
                    "name": name,
                    "purpose": "帮助孩子按康复师处方完成家庭训练，具体训练目标以康复师原始说明为准。",
                    "how_to_do": [
                        f"找到康复师处方中的「{name}」这一项。",
                        "按原处方写明的顺序、组数、次数和频率执行。",
                        "动作过程保持缓慢、稳定，不憋气，不追求过大幅度。",
                    ],
                    "dosage": self._extract_dosage(line),
                    "cautions": cautions[:3] or [
                        "如果动作引起明显疼痛或不适，请先暂停。",
                        "如果家长不确定动作姿势，先联系康复师确认后再继续。",
                    ],
                    "child_tips": [
                        "可以把训练拆成短时间完成，先保证动作质量。",
                        "孩子抗拒时先降低节奏，不强行追求一次完成。",
                    ],
                }
            )

        if not exercises:
            exercises.append(
                {
                    "name": "康复师下达的家庭训练",
                    "purpose": "帮助家长按康复师原始处方执行家庭训练。",
                    "how_to_do": [
                        "先阅读康复师原始说明。",
                        "按处方中的动作、组数、次数和频率执行。",
                        "遇到看不懂或做不准的动作，先向康复师确认。",
                    ],
                    "dosage": {},
                    "cautions": cautions[:3] or ["如出现明显不适，请先暂停训练。"],
                    "child_tips": ["先完成最容易配合的一项，再逐步补齐其他训练。"],
                }
            )

        return {
            "parent_title": "家庭训练执行说明",
            "today_focus": "这份说明把康复师的处方整理成家长更容易执行的步骤。动作、剂量和注意事项仍以康复师原始处方为准。",
            "estimated_minutes": estimated_minutes,
            "exercises": exercises[:6],
            "stop_conditions": [
                "疼痛明显加重或出现新的麻木、头晕等不适。",
                "孩子明显抗拒、哭闹或动作无法保持安全姿势。",
                "训练后不适持续超过 30 分钟。",
            ],
            "contact_therapist_when": [
                "不确定动作姿势是否正确。",
                "连续两次训练都无法完成原定剂量。",
                "出现处方里没有提到的新症状或明显疼痛。",
            ],
        }

    def _extract_exercise_lines(self, lines: list[str]) -> list[str]:
        candidates: list[str] = []
        blocked_keywords = ("注意", "禁忌", "目标", "原则", "风险", "建议", "评估", "方案", "备注", "频率")

        for line in lines:
            normalized = line.strip()
            if any(keyword in normalized for keyword in blocked_keywords):
                continue
            if re.match(r"^([-*]\s+|\d+[.、]\s*)", normalized):
                cleaned = re.sub(r"^([-*]\s+|\d+[.、]\s*)", "", normalized).strip()
                if 2 <= len(cleaned) <= 80:
                    candidates.append(cleaned)

        return candidates[:6]

    def _clean_exercise_name(self, line: str) -> str:
        cleaned = re.sub(r"[*_`#>-]", "", line).strip()
        cleaned = re.split(r"[：:，,；;（(]", cleaned, maxsplit=1)[0].strip()
        return cleaned[:30] or "家庭训练动作"

    def _extract_dosage(self, text: str) -> dict[str, str]:
        dosage: dict[str, str] = {}
        patterns = {
            "sets": r"(\d+\s*[组組])",
            "reps": r"(\d+\s*[次遍])",
            "duration": r"(\d+\s*(?:分钟|秒|min|s))",
            "frequency": r"((?:每天|每日|每周|一周)[^，,；;\n]{0,12})",
        }
        for key, pattern in patterns.items():
            match = re.search(pattern, text, flags=re.IGNORECASE)
            if match:
                dosage[key] = match.group(1)
        return dosage

    def _extract_cautions(self, lines: list[str]) -> list[str]:
        cautions: list[str] = []
        keywords = ("注意", "避免", "暂停", "疼痛", "不适", "禁忌", "停止")
        for line in lines:
            if any(keyword in line for keyword in keywords):
                cleaned = re.sub(r"^(#{1,4}\s+|[-*]\s+|\d+[.、]\s*)", "", line).strip()
                if cleaned:
                    cautions.append(cleaned[:80])
        return cautions

    def _estimate_minutes(self, raw_content: str, exercise_count: int) -> int:
        minute_values = [
            int(value)
            for value in re.findall(r"(\d+)\s*(?:分钟|min)", raw_content, flags=re.IGNORECASE)
            if int(value) <= 90
        ]
        if minute_values:
            return max(3, min(sum(minute_values), 60))
        return max(5, min(exercise_count * 5, 30))


# ── Singleton ──
_service: Optional[TranslationService] = None


def get_translation_service() -> TranslationService:
    """Get or create the singleton TranslationService."""
    global _service
    if _service is None:
        _service = TranslationService()
    return _service
