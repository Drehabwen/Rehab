import os
import sqlite3
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

# Set up test DB path
TEST_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rehab_integration_test.db")

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


def test_sync_screening_workflow():
    # 1. Sync a mock screening
    payload = {
        "session_id": "session_test_123",
        "subject": {
            "subject_id": "subject_abc_789",
            "display_name": "张小明",
            "sex": "male",
            "age": 14,
            "height_cm": 165.5,
            "notes": "有轻微脊柱侧弯预警"
        },
        "protocol_results": [
            {
                "result_id": "res_static_123",
                "protocol": "static_posture",
                "status": "completed",
                "capture_quality": "excellent",
                "metrics": {"shoulder_angle": 1.5, "pelvic_tilt": 0.8},
                "findings": ["高低肩偏离 1.5 度", "骨盆左倾 0.8 度"],
                "risk_flags": ["shoulder_asymmetry"],
                "recommendations": ["建议进行脊柱侧弯针对性物理评估"],
                "psi_score": 92.5,
                "severity_grades": {"coronal": "mild", "sagittal": "normal"}
            }
        ],
        "integrated_report": {
            "report_id": "rep_123",
            "title": "脊柱与体态综合筛查报告",
            "overall_risk": "attention",
            "consistency_level": "single_protocol",
            "main_patterns": ["高低肩"],
            "next_action": "professional_evaluation",
            "summary": "静态姿势显示有轻微高低肩迹象，其他指标正常。",
            "recommendations": ["加强上背部肌肉训练", "建议康复师触诊"]
        },
        "llm_analysis": {
            "enhanced_summary": "AI 分析：该受试者有轻度姿态不对称偏离，主要是左肩高右肩低。",
            "clinical_context": "基于姿势动力学分析，该不对称可能与长期不良坐姿有关。",
            "risk_narrative": "风险较低，但若不干预可能发展为结构性侧弯。",
            "suggestions": ["做肩袖肌群强化", "拉伸斜方肌"],
            "limitations": ["分析基于单次静态图像捕捉，深蹲动力学数据缺乏"]
        },
        "created_at": "2026-05-21T10:00:00Z"
    }

    # Test POST /api/integration/sync-screening
    response = client.post("/api/integration/sync-screening", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["action"] == "created"
    assert data["session_id"] == "session_test_123"

    # Test GET /api/integration/synced-screenings
    response = client.get("/api/integration/synced-screenings")
    assert response.status_code == 200
    list_data = response.json()
    assert len(list_data) == 1
    assert list_data[0]["session_id"] == "session_test_123"
    assert list_data[0]["subject_display_name"] == "张小明"
    assert list_data[0]["overall_risk"] == "attention"
    assert list_data[0]["status"] == "pending"

    # Test GET /api/integration/synced-screenings/{session_id}
    response = client.get("/api/integration/synced-screenings/session_test_123")
    assert response.status_code == 200
    detail_data = response.json()
    assert detail_data["session_id"] == "session_test_123"
    assert detail_data["payload"]["subject"]["display_name"] == "张小明"
    assert detail_data["payload"]["llm_analysis"]["suggestions"] == ["做肩袖肌群强化", "拉伸斜方肌"]

    # Test POST /api/integration/synced-screenings/{session_id}/import (Mark as imported)
    response = client.post("/api/integration/synced-screenings/session_test_123/import")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify status is now 'imported' in list
    response = client.get("/api/integration/synced-screenings")
    assert response.status_code == 200
    list_data = response.json()
    assert len(list_data) == 1
    assert list_data[0]["status"] == "imported"

    # Test query filter by status
    response = client.get("/api/integration/synced-screenings?status=pending")
    assert response.status_code == 200
    assert len(response.json()) == 0

    response = client.get("/api/integration/synced-screenings?status=imported")
    assert response.status_code == 200
    assert len(response.json()) == 1

    # Test DELETE /api/integration/synced-screenings/{session_id}
    response = client.delete("/api/integration/synced-screenings/session_test_123")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    # Verify list is empty
    response = client.get("/api/integration/synced-screenings")
    assert response.status_code == 200
    assert len(response.json()) == 0
