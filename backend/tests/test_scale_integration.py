import os
import sqlite3
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

# Set up test DB path
TEST_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rehab_integration_test_scale.db")

# Patch DB_PATH in integration module before importing app/router
with patch("routers.integration.DB_PATH", TEST_DB_PATH):
    from main import app
    from routers.integration import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_and_teardown_db():
    # Clean up test DB if exists
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass
    
    # Initialize fresh test db and keep patch active during the test
    with patch("routers.integration.DB_PATH", TEST_DB_PATH):
        init_db()
        yield
        
    # Clean up after test
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass


def test_scale_integration_workflow():
    patient_id = "patient_yihang_123"
    session_id = "session_yihang_s1"
    
    # 1. Push a scale task
    push_payload = {
        "patient_id": patient_id,
        "session_id": session_id,
        "scale_id": "SRS-22",
        "therapist_name": "王康复师"
    }
    
    response = client.post("/api/integration/scale/push", json=push_payload)
    assert response.status_code == 200
    push_data = response.json()
    assert push_data["status"] == "success"
    assert "task_id" in push_data
    task_id = push_data["task_id"]
    assert push_data["scale_id"] == "SRS-22"
    
    # 2. Get pending scales for the patient
    response = client.get(f"/api/integration/scale/pending/{patient_id}")
    assert response.status_code == 200
    pending_list = response.json()
    assert len(pending_list) == 1
    assert pending_list[0]["task_id"] == task_id
    assert pending_list[0]["scale_id"] == "SRS-22"
    assert pending_list[0]["status"] == "pending"
    
    # 3. Submit completed scale data from the chatbot
    mock_scale_data = {
        "scaleId": "SRS-22",
        "scaleName": "SRS-22 脊柱侧弯患者生活质量问卷",
        "filledBy": "parent",
        "totalScore": 85,
        "maxScore": 110,
        "percentageScore": 77.27,
        "dimensions": {
            "functionActive": 4.2,
            "pain": 3.8,
            "selfImage": 3.5,
            "mentalHealth": 4.0,
            "satisfaction": 4.5
        },
        "answers": [
            {
                "questionId": 1,
                "questionText": "你的背部疼痛程度如何？",
                "category": "pain",
                "score": 4,
                "answerText": "轻度疼痛"
            }
        ],
        "aiInterpretation": "患者在功能活动与精神健康方面表现良好，自我形象存在轻度负面评价，建议加强心理疏导并维持现有康复训练。",
        "createdAt": 1782384000000
    }
    
    submit_payload = {
        "task_id": task_id,
        "session_id": session_id,
        "scale_data": mock_scale_data
    }
    
    response = client.post("/api/integration/scale/submit", json=submit_payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    assert response.json()["task_id"] == task_id
    
    # 4. Verify pending scales is now empty for this patient
    response = client.get(f"/api/integration/scale/pending/{patient_id}")
    assert response.status_code == 200
    assert len(response.json()) == 0
    
    # 5. Fetch scale results belonging to this session
    response = client.get(f"/api/integration/scale/results/{session_id}")
    assert response.status_code == 200
    results_list = response.json()
    assert len(results_list) == 1
    assert results_list[0]["task_id"] == task_id
    assert results_list[0]["status"] == "completed"
    assert results_list[0]["scale_data"]["scaleId"] == "SRS-22"
    assert results_list[0]["scale_data"]["totalScore"] == 85
    assert results_list[0]["scale_data"]["dimensions"]["functionActive"] == 4.2
