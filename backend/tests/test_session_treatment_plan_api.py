import os
import sys

from fastapi.testclient import TestClient

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from main import app


client = TestClient(app)


def test_generate_treatment_plan_from_session_report_endpoint(monkeypatch):
    async def fake_generate_treatment_plan_from_session_report(payload):
        assert payload["sessionId"] == "session-1"
        assert payload["sessionReportId"] == "session-report-1"
        return "# Treatment Plan\n\n1. Restore mobility"

    monkeypatch.setattr("main.ensure_treatment_plan_config", lambda: None)
    monkeypatch.setattr(
        "main.generate_treatment_plan_from_session_report",
        fake_generate_treatment_plan_from_session_report,
    )

    response = client.post(
        "/api/treatment-plan/generate-from-session-report",
        json={
            "patientId": "patient-1",
            "sessionId": "session-1",
            "sessionReportId": "session-report-1",
            "sessionReportMarkdown": "# Session Report",
            "insights": ["posture and rom need joint review"],
            "recommendations": ["start with shoulder mobility"],
            "createdBy": "system",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["patientId"] == "patient-1"
    assert payload["sessionId"] == "session-1"
    assert payload["sessionReportId"] == "session-report-1"
    assert payload["content"].startswith("# Treatment Plan")
