import os
import sys

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app
from utils import session_reporter


client = TestClient(app)


def build_payload():
    return {
        "sessionId": "session-1",
        "patientId": "patient-1",
        "patientName": "张三",
        "sourceAssessmentIds": ["posture-1", "rom-1", "voice-1"],
        "readiness": {
            "readyCount": 3,
            "partialCount": 0,
            "missingTypes": [],
            "availableTypes": ["posture", "rom", "medvoice"],
        },
        "posture": {
            "title": "体态评估",
            "status": "ready",
            "preview": "基础体态报告提示圆肩和头前引。",
            "evidenceCount": 3,
        },
        "rom": {
            "title": "关节活动度",
            "status": "ready",
            "preview": "左肩前屈受限，建议结合肩胛控制训练。",
            "evidenceCount": 2,
        },
        "medvoice": {
            "title": "语音病历",
            "status": "ready",
            "preview": "主诉颈肩疼痛三个月，久坐后加重。",
            "evidenceCount": 2,
        },
    }


def test_generate_session_report_endpoint(monkeypatch):
    def fake_generate_session_report(request):
        return {
            "id": "session-report-test",
            "sessionId": request.sessionId,
            "patientId": request.patientId,
            "markdown": "# Session Report\n\nGenerated",
            "insights": ["posture and rom aligned"],
            "recommendations": ["finish rehab plan"],
            "createdAt": 1234567890,
            "sourceAssessmentIds": request.sourceAssessmentIds,
        }

    monkeypatch.setattr("main.generate_session_report", fake_generate_session_report)

    response = client.post("/api/session-report/generate", json=build_payload())

    assert response.status_code == 200
    payload = response.json()
    assert payload["sessionId"] == "session-1"
    assert payload["patientId"] == "patient-1"
    assert payload["markdown"].startswith("# Session Report")
    assert payload["sourceAssessmentIds"] == ["posture-1", "rom-1", "voice-1"]


def test_generate_session_report_uses_fallback_when_llm_fails(monkeypatch):
    class BrokenClient:
        class Chat:
            class Completions:
                @staticmethod
                def create(**_kwargs):
                    raise RuntimeError("llm unavailable")

            completions = Completions()

        chat = Chat()

    monkeypatch.setattr(session_reporter, "client", BrokenClient())

    response = client.post("/api/session-report/generate", json=build_payload())

    assert response.status_code == 200
    payload = response.json()
    assert payload["markdown"].startswith("# 接诊综合报告")
    assert "兜底路径" in payload["markdown"]
