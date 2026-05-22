import json
import os
from typing import Any, AsyncGenerator, Dict

from openai import AsyncOpenAI


class TreatmentPlanConfigError(RuntimeError):
    """Raised when treatment plan service configuration is missing."""


class AssessmentDataUnavailableError(RuntimeError):
    """Raised when assessment data cannot be loaded from a real datasource."""


def _get_api_key() -> str:
    api_key = (os.getenv("DEEPSEEK_API_KEY") or os.getenv("VITE_DEEPSEEK_API_KEY") or "").strip()
    if not api_key:
        raise TreatmentPlanConfigError(
            "DEEPSEEK_API_KEY (or VITE_DEEPSEEK_API_KEY) is missing; treatment plan generation is unavailable."
        )
    return api_key


def ensure_treatment_plan_config() -> None:
    """Fail fast for routes that depend on external LLM credentials."""
    _get_api_key()


def _get_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=_get_api_key(),
        base_url="https://api.deepseek.com",
    )


def build_prompt(assessment_data: Dict[str, Any]) -> str:
    """Build prompt for treatment plan generation."""
    return f"""
You are a rehabilitation specialist. Generate a 4-week treatment plan based on this assessment data:

{json.dumps(assessment_data, ensure_ascii=False, indent=2)}

Requirements:
1. Identify key problems from the assessment.
2. Build a 4-week plan.
3. 3-5 sessions/week, 30-45 minutes/session.
4. Include warm-up, core training, and cool-down for each session.
5. Provide actionable instructions and precautions.
6. Include milestones and progress evaluation methods.
7. Use professional but clear language.
8. Output in Markdown.
"""


def build_session_report_prompt(session_report_data: Dict[str, Any]) -> str:
    """Build prompt for treatment-plan generation from a global session report."""
    return f"""
You are a rehabilitation specialist. Generate a 4-week treatment plan from this global session report context:

{json.dumps(session_report_data, ensure_ascii=False, indent=2)}

Requirements:
1. Treat the session report as the primary source of truth.
2. Synthesize posture, ROM, and case-history findings into one plan.
3. Build a 4-week plan with 3-5 sessions/week and 30-45 minutes/session.
4. Organize each week with goals, exercises, dosage, and precautions.
5. Call out missing inputs when they limit plan confidence.
6. Include home-program guidance and reassessment checkpoints.
7. Use professional but clear language.
8. Output in Markdown.
"""


async def generate_treatment_plan(assessment_data: Dict[str, Any]) -> str:
    """Generate treatment plan with non-streaming response."""
    prompt = build_prompt(assessment_data)
    client = _get_client()

    response = await client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.7,
    )
    return response.choices[0].message.content or ""


async def generate_treatment_plan_from_session_report(session_report_data: Dict[str, Any]) -> str:
    """Generate treatment plan from the session-level comprehensive report."""
    prompt = build_session_report_prompt(session_report_data)
    client = _get_client()

    response = await client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.5,
    )
    return response.choices[0].message.content or ""


async def generate_treatment_plan_stream(
    assessment_data: Dict[str, Any],
) -> AsyncGenerator[str, None]:
    """Generate treatment plan with streaming response."""
    prompt = build_prompt(assessment_data)
    client = _get_client()

    stream = await client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
        temperature=0.7,
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def generate_treatment_plan_stream_from_session_report(
    session_report_data: Dict[str, Any],
) -> AsyncGenerator[str, None]:
    """Generate treatment plan from the session-level comprehensive report with streaming output."""
    prompt = build_session_report_prompt(session_report_data)
    client = _get_client()

    stream = await client.chat.completions.create(
        model="deepseek-chat",
        messages=[{"role": "user", "content": prompt}],
        stream=True,
        temperature=0.5,
    )

    async for chunk in stream:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content


async def get_assessment_data(assessment_id: str) -> Dict[str, Any]:
    """Load assessment data from a real datasource.

    Placeholder intentionally raises to prevent silently generating plans from mock data.
    """
    raise AssessmentDataUnavailableError(
        f"Assessment data source is not wired yet for assessment_id={assessment_id}."
    )
