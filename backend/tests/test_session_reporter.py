import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from models import SessionReportReadiness, SessionReportRequest, SessionReportSectionInput
from utils import session_reporter


def build_request():
    return SessionReportRequest(
        sessionId="session-1",
        patientId="patient-1",
        patientName="李四",
        sourceAssessmentIds=["posture-1", "rom-1", "voice-1"],
        readiness=SessionReportReadiness(
            readyCount=3,
            partialCount=0,
            missingTypes=[],
            availableTypes=["posture", "rom", "medvoice"],
        ),
        posture=SessionReportSectionInput(
            title="体态评估",
            status="ready",
            preview="头前引、圆肩，伴轻度高低肩。",
            evidenceCount=3,
        ),
        rom=SessionReportSectionInput(
            title="关节活动度",
            status="ready",
            preview="左肩前屈和外展略受限。",
            evidenceCount=2,
        ),
        medvoice=SessionReportSectionInput(
            title="语音病历",
            status="ready",
            preview="主诉颈肩酸痛三个月，久坐后加重。",
            evidenceCount=2,
        ),
    )


def test_build_session_report_prompt_targets_rehab_therapists():
    prompt = session_reporter._build_session_report_prompt(build_request())

    assert "你是一名资深康复治疗师" in prompt
    assert "语言必须为简体中文" in prompt
    assert "严禁输出任何占位符" in prompt
    assert "李四" in prompt
    assert "体态评估" in prompt
    assert "语音病历" in prompt


def test_generate_session_report_rejects_placeholder_markdown(monkeypatch):
    class FakeClient:
        class Chat:
            class Completions:
                @staticmethod
                def create(**_kwargs):
                    class Message:
                        content = (
                            "# 接诊综合报告\n\n"
                            "## 综合判断\n"
                            "[Current date]\n"
                            "- [Key posture finding 1 from preview]\n"
                        )

                    class Choice:
                        message = Message()

                    class Response:
                        choices = [Choice()]

                    return Response()

            completions = Completions()

        chat = Chat()

    monkeypatch.setattr(session_reporter, "client", FakeClient())

    report = session_reporter.generate_session_report(build_request())

    assert report.markdown.startswith("# 接诊综合报告")
    assert "兜底路径" in report.markdown
    assert "[Current date]" not in report.markdown
