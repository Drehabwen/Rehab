import json
import os
from typing import Any, AsyncGenerator, Dict

from openai import AsyncOpenAI


class TreatmentPlanConfigError(RuntimeError):
    """Raised when treatment plan service configuration is missing."""


class AssessmentDataUnavailableError(RuntimeError):
    """Raised when assessment data cannot be loaded from a real datasource."""


def _get_api_key() -> str:
    api_key = os.getenv("DEEPSEEK_API_KEY", "").strip()
    if not api_key:
        raise TreatmentPlanConfigError(
            "DEEPSEEK_API_KEY is missing; treatment plan generation is unavailable."
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
你是一位专业的运动表现教练和体能康复专家。请根据以下评估数据，为运动员生成一份为期 4 周的个性化运动训练与康复方案：

{json.dumps(assessment_data, ensure_ascii=False, indent=2)}

要求：
1. 从评估数据中识别关键问题（如体态异常、活动度受限、动作不稳等）。
2. 制定一个 4 周的训练计划。
3. 每周 3-5 次训练，每次 30-45 分钟。
4. 每次训练包含：热身、核心/专项训练、拉伸放松。
5. 提供可操作的动作指导和注意事项。
6. 包含阶段性目标和进度评估方法。
7. 使用专业、严谨且充满激励性的语言（教练口吻）。
8. 以 Markdown 格式输出。
"""


def build_session_report_prompt(session_report_data: Dict[str, Any]) -> str:
    """Build prompt for treatment-plan generation from a global session report."""
    patient_type = session_report_data.get("patientType", "adult")
    patient_type_label = "青少年运动员" if patient_type == "adolescent" else "成年运动员"
    
    adolescent_instruction = ""
    if patient_type == "adolescent":
        adolescent_instruction = """
- **青少年训练原则**：重点在于建立正确的动作模式、灵活性和核心稳定性。避免过早进行高强度的抗阻训练。
- **趣味性与互动**：建议中可以增加一些游戏化或互动性强的描述，激发青少年运动兴趣。
- **发育保护**：特别关注脊柱、生长板和关节的压力，避免过度冲击。
"""

    return f"""
你是一位专业的运动表现教练和体能康复专家。请根据以下综合监控报告，为{patient_type_label}生成一份为期 4 周的个性化运动训练方案：

{json.dumps(session_report_data, ensure_ascii=False, indent=2)}

运动员类型：{patient_type_label}

要求：
1. 以综合报告为核心依据，综合分析体态、ROM、主观反馈及运动稳定性。
2. 结合【Vision3 疲劳/稳定性监控数据】（如 jitterIndex, stabilityScore）评估当前的过度训练风险和竞技状态。
3. 制定 4 周计划，每周 3-5 次，每次 30-45 分钟。
4. 每周计划需包含明确的训练重点、动作安排、强度建议和恢复指导。
5. 如果数据缺失影响判断，请在方案中明确指出需要补充的测试项。
6. 包含家庭自主训练指导和复测节点。
7. 使用专业、严谨且充满激励性的语言（教练口吻）。
8. 以 Markdown 格式输出。
{adolescent_instruction}
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
