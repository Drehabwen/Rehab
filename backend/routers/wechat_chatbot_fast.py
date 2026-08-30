"""
Python 端 Chatbot 路由（备选 + 健康检查）

主 LLM 网关是 chatbotagent Node (:8002)，Vite 代理 /api/chatbot/* → :8002。
本模块仅保留：
  - GET  /health   → 健康检查（DeepSeek key 是否配好）
  - POST /chat     → HTTP 非流式对话（Node 挂了时的降级备选）

WS /ws/chat 已移除 —— 流式对话统一走 Node :8002，避免双 WS 端点混淆。
"""

import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import AsyncOpenAI

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chatbot", tags=["chatbot"])

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    patientContext: Dict[str, Any]
    availableTools: Optional[List[str]] = None
    systemPrompt: Optional[str] = None

def _get_api_key() -> str:
    return (os.getenv("DEEPSEEK_API_KEY") or "").strip()

@router.get("/health")
async def health_endpoint():
    api_key = _get_api_key()
    return {"llm": bool(api_key)}

@router.post("/chat")
async def chat_endpoint(req: ChatRequest):
    api_key = _get_api_key()
    if not api_key:
        raise HTTPException(status_code=503, detail="LLM API Key not configured")

    system_prompt = req.systemPrompt or "你是一个温柔专业的儿童脊柱康复AI助手"
    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.messages:
        messages.append({"role": msg["role"], "content": msg["content"]})

    try:
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com")
        response = await client.chat.completions.create(
            model="deepseek-v4-flash",
            messages=messages,
            temperature=0.7,
            max_tokens=800,
        )
        content = response.choices[0].message.content or ""
        return {"type": "text", "content": content, "toolCall": None}
    except Exception as e:
        logger.error(f"[Chatbot] LLM chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
