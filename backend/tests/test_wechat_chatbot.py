import os
import sqlite3
import pytest
import json
import hashlib
from fastapi.testclient import TestClient
from unittest.mock import patch

# Set up test DB path
TEST_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "rehab_integration_test.db")

# Patch DB_PATH in integration and chatbot modules before importing app
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
    
    # Initialize fresh test db and keep patch active
    with patch("routers.integration.DB_PATH", TEST_DB_PATH):
        init_db()
        # Seed test data in synced_screenings
        conn = sqlite3.connect(TEST_DB_PATH)
        cursor = conn.cursor()
        
        mock_payload = {
            "session_id": "session_chatbot_999",
            "subject": {
                "subject_id": "QY-SCH01-2605-0145-8",
                "display_name": "王小明",
                "sex": "male",
                "age": 10,
                "height_cm": 142.5,
                "notes": "下蹲左膝有明显内扣倾向"
            },
            "protocol_results": [
                {
                    "result_id": "res_squat_999",
                    "protocol": "squat_screening",
                    "status": "completed",
                    "capture_quality": "good",
                    "metrics": {
                        "left_knee_valgus_deg": 14.2,
                        "right_knee_valgus_deg": 8.1
                    },
                    "findings": ["左膝中度外翻", "双侧下蹲不对称"],
                    "risk_flags": ["knee_valgus_left"],
                    "recommendations": ["臀桥训练", "侧卧蚌式开合"]
                }
            ],
            "integrated_report": {
                "report_id": "rep_chatbot_999",
                "title": "深蹲体态筛查报告",
                "overall_risk": "attention",
                "consistency_level": "consistent",
                "main_patterns": ["动力性膝外翻"],
                "next_action": "clinical_evaluation",
                "summary": "左侧膝关节下蹲有动力性外翻内扣，右侧轻微。",
                "recommendations": ["建议居家强化臀中肌与臀大肌"]
            },
            "created_at": "2026-05-22T10:00:00Z"
        }
        
        cursor.execute("""
            INSERT INTO synced_screenings (
                session_id, subject_id, subject_display_name, overall_risk, status, payload, created_at, synced_at
            ) VALUES (?, ?, ?, ?, 'pending', ?, ?, ?)
        """, (
            "session_chatbot_999",
            "QY-SCH01-2605-0145-8",
            "王小明",
            "attention",
            json.dumps(mock_payload),
            "2026-05-22T10:00:00Z",
            "2026-05-22T10:00:05Z"
        ))
        conn.commit()
        conn.close()
        
        yield
        
    # Clean up after test
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except Exception:
            pass

def test_chatbot_binding_and_query_flow():
    # 1. Bind with missing parameters
    response = client.post("/api/chatbot/bind", json={"suc": "", "display_name": ""})
    assert response.status_code == 400 # Custom 400 error for empty SUC or display name

    # 2. Bind with incorrect SUC
    response = client.post("/api/chatbot/bind", json={"suc": "QY-SCH01-2605-9999-9", "display_name": "王小明"})
    assert response.status_code == 404
    assert "未找到该受试者的早筛档案" in response.json()["detail"]

    # 3. Bind with incorrect display name
    response = client.post("/api/chatbot/bind", json={"suc": "QY-SCH01-2605-0145-8", "display_name": "李小明"})
    assert response.status_code == 403
    assert "身份二次校验失败" in response.json()["detail"]

    # 4. Successful bind with exact name (matching regardless of spaces/casing)
    response = client.post("/api/chatbot/bind", json={"suc": "QY-SCH01-2605-0145-8", "display_name": "  王小明  "})
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "token" in data
    assert data["subject"]["display_name"] == "王小明"
    assert data["subject"]["sex"] == "male"
    assert data["subject"]["age"] == 10

    valid_token = data["token"]

    # 5. Query with invalid token
    query_resp = client.post("/api/chatbot/query", json={
        "suc": "QY-SCH01-2605-0145-8",
        "question": "孩子下蹲内扣严重吗？",
        "token": "invalid_token_123"
    })
    assert query_resp.status_code == 403
    assert "身份认证失败" in query_resp.json()["detail"]

    # 6. Query with valid token (triggers RAG generation or rule-based fallback)
    # We patch _get_api_key to return empty first to test rule-based fallback
    with patch("routers.wechat_chatbot._get_api_key", return_value=""):
        query_resp = client.post("/api/chatbot/query", json={
            "suc": "QY-SCH01-2605-0145-8",
            "question": "孩子该怎么练习？",
            "token": valid_token
        })
        assert query_resp.status_code == 200
        query_data = query_resp.json()
        assert query_data["status"] == "success"
        assert "王小明" in query_data["answer"]
        assert "左膝中度外翻" in query_data["answer"]
        assert "臀桥训练" in query_data["answer"]
        assert "自动回复" in query_data["answer"]

    # 7. Query with valid token & mocked OpenAI response to test LLM branch
    with patch("routers.wechat_chatbot._get_api_key", return_value="sk-test-key-123"):
        # Mocking the client completion
        class MockChoice:
            class MockMessage:
                content = "这是针对王小明左膝中度外翻的定制化AI回复。建议做臀桥训练和蚌式开合。"
            message = MockMessage()
        
        class MockResponse:
            choices = [MockChoice()]

        async def mock_create(*args, **kwargs):
            return MockResponse()

        with patch("openai.resources.chat.completions.AsyncCompletions.create", new=mock_create):
            query_resp = client.post("/api/chatbot/query", json={
                "suc": "QY-SCH01-2605-0145-8",
                "question": "有什么康复动作建议？",
                "token": valid_token
            })
            assert query_resp.status_code == 200
            query_data = query_resp.json()
            assert query_data["status"] == "success"
            assert "定制化AI回复" in query_data["answer"]
            assert "臀桥训练" in query_data["answer"]
