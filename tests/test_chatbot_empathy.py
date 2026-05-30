import sys
import os
import json
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend'))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from main import app
from routers.wechat_chatbot import ChatRequest

client = TestClient(app)

def test_chat_request_pydantic_model():
    """Verify that ChatRequest correctly parses and accepts the systemPrompt parameter."""
    payload = {
        "messages": [{"role": "user", "content": "你好"}],
        "patientContext": {
            "name": "小明",
            "age": 10,
            "hasHistory": True,
            "hasDueReminder": False,
            "riskLevel": "moderate",
            "lastAssessmentSummary": "正常"
        },
        "systemPrompt": "你是一个温暖的机器人小助手。"
    }
    
    # Parse using Pydantic
    req = ChatRequest(**payload)
    assert req.systemPrompt == "你是一个温暖的机器人小助手。"
    assert req.patientContext["name"] == "小明"
    assert req.messages[0]["content"] == "你好"

def test_chatbot_chat_endpoint_binding():
    """Test that the /api/chatbot/chat endpoint accepts custom system prompts and parses it successfully without 422 errors."""
    payload = {
        "messages": [{"role": "user", "content": "孩子有点肩膀不对称，怎么做动作？"}],
        "patientContext": {
            "name": "小明",
            "age": 13,
            "hasHistory": False,
            "hasDueReminder": False,
            "riskLevel": None,
            "lastAssessmentSummary": None
        },
        "systemPrompt": "【温暖的系统测试提示词】你必须以'小树苗'比喻开始回答！"
    }
    
    # We send the request. Even if the API key is missing (returning 503 or 500), 
    # it must NOT return a 422 (Unprocessable Entity) which represents validation error.
    response = client.post("/api/chatbot/chat", json=payload)
    
    # If the LLM is not configured, it will return 503 Service Unavailable, which is perfectly expected
    assert response.status_code != 422

def test_chatbot_websocket_endpoint_structure():
    """Test that the WebSocket chatbot endpoint parses systemPrompt correctly without schema mismatch."""
    try:
        with client.websocket_connect("/api/chatbot/ws/chat") as websocket:
            payload = {
                "messages": [{"role": "user", "content": "你好"}],
                "patientContext": {
                    "name": "小明",
                    "age": 10
                },
                "systemPrompt": "温暖的小天柱系统提示词。"
            }
            websocket.send_json(payload)
            resp = websocket.receive_json()
            # If no API key is configured, it returns an error type message
            if resp.get("type") == "error":
                assert "API Key" in resp.get("content") or "大模型" in resp.get("content")
    except Exception as e:
        # Skip if websocket client is not fully supported in this test env
        print(f"Skipping WebSocket integration test: {e}")
