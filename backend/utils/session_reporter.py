from __future__ import annotations

import re
import time
import uuid
from typing import List

from models import SessionReportRequest, SessionReportResponse
from utils.llm_reporter import client, extract_markdown


def _compact_preview(value: str | None, fallback: str) -> str:
    if not value:
        return fallback
    compact = " ".join(value.split())
    return compact[:1200]


def _format_section_input(
    label: str,
    title: str | None,
    status: str | None,
    evidence_count: int,
    preview: str | None,
    missing_fallback: str,
) -> str:
    return (
        f"{label}：\n"
        f"- 标题：{title or label}\n"
        f"- 状态：{status or 'missing'}\n"
        f"- 证据条数：{evidence_count}\n"
        f"- 摘要：{_compact_preview(preview, missing_fallback)}"
    )


def _build_fallback_markdown(request: SessionReportRequest) -> str:
    missing = " / ".join(request.readiness.missingTypes) if request.readiness.missingTypes else "无"
    lines: List[str] = [
        "# 接诊综合报告",
        "",
        f"- 接诊 ID：{request.sessionId}",
        f"- 患者：{request.patientName or request.patientId}",
        f"- 已就绪输入：{request.readiness.readyCount}/3",
        f"- 缺失输入：{missing}",
        "",
        "## 综合判断",
        "当前综合报告由兜底路径生成，建议在 LLM 服务恢复后重新生成正式综合报告。",
        "",
        "## 输入状态",
        f"- 体态评估：{request.posture.status if request.posture else 'missing'}",
        f"- ROM：{request.rom.status if request.rom else 'missing'}",
        f"- 语音病历：{request.medvoice.status if request.medvoice else 'missing'}",
        f"- 疲劳监测：{request.fatigue.status if request.fatigue else 'missing'}",
        "",
        "## 建议下一步",
        "1. 先补齐缺失输入，再基于完整接诊信息生成综合报告。",
        "2. 联合查看体态、ROM 和病史主诉，确认主要功能受限与代偿链。",
        "3. 回到报告中心重新生成综合报告与治疗建议。",
    ]
    return "\n".join(lines)


def _build_session_report_prompt(request: SessionReportRequest) -> str:
    missing = "、".join(request.readiness.missingTypes) if request.readiness.missingTypes else "无"
    patient_name = request.patientName or "未提供姓名"
    patient_type_label = "青少年" if request.patientType == "adolescent" else "成年人"

    # Adolescent specific instructions
    adolescent_instruction = ""
    if request.patientType == "adolescent":
        adolescent_instruction = """
- **青少年专项关注**：重点评估骨骼发育（如脊柱侧弯风险）、长骨保护、动作模式的建立而非单纯力量。
- 建议中需包含生长发育期的运动负荷控制，避免过度冲击。
- 语言风格应鼓励为主，建议中可加入趣味性训练描述。
"""

    posture_block = _format_section_input(
        "体态评估",
        request.posture.title if request.posture else None,
        request.posture.status if request.posture else None,
        request.posture.evidenceCount if request.posture else 0,
        request.posture.preview if request.posture else None,
        "未提供体态输入。",
    )
    rom_block = _format_section_input(
        "ROM",
        request.rom.title if request.rom else None,
        request.rom.status if request.rom else None,
        request.rom.evidenceCount if request.rom else 0,
        request.rom.preview if request.rom else None,
        "未提供 ROM 输入。",
    )
    medvoice_block = _format_section_input(
        "语音病历",
        request.medvoice.title if request.medvoice else None,
        request.medvoice.status if request.medvoice else None,
        request.medvoice.evidenceCount if request.medvoice else 0,
        request.medvoice.preview if request.medvoice else None,
        "未提供语音病历输入。",
    )
    fatigue_block = _format_section_input(
        "疲劳监测",
        request.fatigue.title if request.fatigue else None,
        request.fatigue.status if request.fatigue else None,
        request.fatigue.evidenceCount if request.fatigue else 0,
        request.fatigue.preview if request.fatigue else None,
        "未提供疲劳监测数据。",
    )

    return f"""
你是一名资深康复治疗师，正在为报告中心撰写“接诊级综合报告”。

你的读者是康复师、体能教练或竞技体育专家。请直接输出可用于训练指导的 Markdown，语言必须为简体中文。

写作要求：
- 这是“接诊综合报告”，需要特别关注“运动疲劳”与“动作稳定性”。
- 必须综合体态评估、ROM、语音病历和疲劳监测四个来源；如果某一项缺失，要明确写“未提供”。
- 必须识别“动作变形”与“主观疲劳指数(RPE)”之间的关联。
- 如果抖动指数(jitterIndex)较高且稳定性得分(stabilityScore)较低，必须评估运动损伤风险。
- 严禁输出任何占位符或英文模板语。
- 结论必须落到康复工作与竞技表现：疲劳等级、伤病风险、训练强度调整建议。
- 不要写免责声明。
{adolescent_instruction}

请严格使用以下结构：
# 接诊综合报告
## 综合判断
用 2 到 4 句话说明当前最值得关注的问题、疲劳状态、动作稳定性，以及多来源之间的对应关系。

## 跨评估关联
用 3 到 5 条项目符号，逐条写清：
- 体态与动作表现
- ROM 发现
- 病史/主诉（含 RPE）
- 实时疲劳监测（稳定性与抖动）
- 这些发现之间如何互相印证（例如：RPE 高且抖动大，提示神经肌肉疲劳）

## 风险评估
重点评估：
1. 过度训练风险
2. 动作失稳导致的急性损伤风险
3. 疲劳导致的慢性劳损风险

## 康复与训练调整建议
用 3 到 5 条编号列表，给出具体的处理建议：
- 是否需要即刻降负荷或停止训练
- 针对性恢复方案（如筋膜放松、睡眠宣教）
- 针对动作不稳的补强训练方向

## 复评与监控建议
1. 建议持续监测的指标
2. 下次训练前的预警阈值

接诊信息：
- 接诊 ID：{request.sessionId}
- 患者 ID：{request.patientId}
- 患者姓名：{patient_name}
- 患者类型：{patient_type_label}
- 已就绪输入：{request.readiness.readyCount}/4
- 缺失输入：{missing}

输入摘要：
{posture_block}

{rom_block}

{medvoice_block}

{fatigue_block}
"""


def _contains_placeholder_markers(markdown: str) -> bool:
    placeholder_patterns = [
        r"\[[^\]]+\]",
        r"Name not provided in inputs",
        r"Current date",
        r"brief summary",
        r"primary impairment pattern",
        r"Key posture finding",
        r"Key ROM finding",
        r"Patient Report via MedVoice",
        r"specific activities",
        r"Measurable outcome",
    ]
    return any(re.search(pattern, markdown, flags=re.IGNORECASE) for pattern in placeholder_patterns)


def generate_session_report(request: SessionReportRequest) -> SessionReportResponse:
    prompt = _build_session_report_prompt(request)

    markdown = ""
    insights: List[str] = []
    recommendations: List[str] = []

    if client:
        try:
            response = client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你负责把康复接诊中的体态评估、ROM 和语音病历整理成一份面向康复师的综合报告。"
                            "你的输出必须是简体中文 Markdown，且不能出现占位符、英文模板句或空框架。"
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                timeout=300,
            )
            raw_content = response.choices[0].message.content if response.choices and response.choices[0].message else ""
            markdown = extract_markdown(raw_content or "").strip()
            if _contains_placeholder_markers(markdown):
                markdown = ""
        except Exception:
            markdown = ""

    if not markdown:
        markdown = _build_fallback_markdown(request)

    for line in markdown.splitlines():
        stripped = line.strip()
        if stripped.startswith("- ") and len(insights) < 3:
            insights.append(stripped[2:])
        if stripped[:3] in {"1. ", "2. ", "3. ", "4. "}:
            recommendations.append(stripped[3:])

    return SessionReportResponse(
        id=f"session-report-{uuid.uuid4().hex[:12]}",
        sessionId=request.sessionId,
        patientId=request.patientId,
        markdown=markdown,
        insights=insights[:3],
        recommendations=recommendations[:4],
        createdAt=int(time.time() * 1000),
        sourceAssessmentIds=request.sourceAssessmentIds,
    )
