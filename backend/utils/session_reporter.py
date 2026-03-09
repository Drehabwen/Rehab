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

    return f"""
你是一名资深康复治疗师，正在为报告中心撰写“接诊级综合报告”。

你的读者是康复治疗师、康复评估师和临床医生。请直接输出可用于临床沟通的 Markdown，语言必须为简体中文。

写作要求：
- 这是“接诊综合报告”，不是单独的体态报告。
- 必须综合体态评估、ROM、语音病历三个来源；如果某一项缺失，要明确写“未提供”，不要编造。
- 只允许使用输入中已经出现的信息做判断。不要补造角度数值、病程、诊断结果或治疗效果。
- 如果输入中没有明确左右侧，禁止擅自写“左侧”或“右侧”。
- 如果输入中没有明确角度、次数、时长等数字，禁止补写具体数值。
- 如果输入中没有明确诊断名称，禁止直接写“冻结肩”“肩峰撞击”“上交叉综合征”等诊断标签。
- 严禁输出任何占位符、模板提示语或方括号内容，例如 `[待补充]`、`[Current date]`、`[Key finding]`。
- 不要写“Name not provided in inputs”“brief summary”“primary finding pattern”这类英文模板语。
- 结论必须落到康复工作：优先问题、功能受限、复测重点、训练方向。
- 每一节都尽量引用实际输入线索，说明信息来自体态、ROM 还是语音病历。
- 语气专业、克制、直接，不要空泛套话，不要写免责声明，不要输出代码块。

请严格使用以下结构：
# 接诊综合报告
## 综合判断
用 2 到 4 句话说明当前最值得康复师关注的问题、受影响功能以及多来源之间的对应关系。

## 跨评估关联
用 3 到 5 条项目符号，逐条写清：
- 体态发现
- ROM 发现
- 病史/主诉发现
- 这些发现之间如何互相印证或提示代偿链

## 风险与功能受限
用 2 到 4 条项目符号，写当前风险、功能受限或训练时需要规避的问题。

## 康复处理建议
用 3 到 5 条编号列表，给出康复师下一步最可执行的处理建议，例如复测重点、训练方向、宣教重点、观察指标。

## 复评建议
用 2 到 3 条编号列表，写接下来建议补充或复查的评估内容。

接诊信息：
- 接诊 ID：{request.sessionId}
- 患者 ID：{request.patientId}
- 患者姓名：{patient_name}
- 已就绪输入：{request.readiness.readyCount}/3
- 缺失输入：{missing}

输入摘要：
{posture_block}

{rom_block}

{medvoice_block}
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
