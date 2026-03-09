import sys
from pathlib import Path

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from main import app  # noqa: E402


def test_stepped_analysis_returns_report_for_mock_request():
    with TestClient(app) as client:
        with client.websocket_connect("/ws/analyze") as websocket:
            websocket.send_json(
                {
                    "type": "POSTURE_STEPPED_ANALYSIS",
                    "frames": [],
                    "assessmentType": "quick",
                    "mock": True,
                    "requestId": "test-mock-stepped-1",
                }
            )

            response = websocket.receive_json()

    assert response["type"] == "POSTURE_REPORT"
    assert response["assessmentType"] == "quick"
    assert isinstance(response["metrics"], dict)
    assert isinstance(response["issues"], list)
    assert response["auxiliaryDiagnosis"]
