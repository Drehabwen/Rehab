import json
import os
import logging
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
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
    return (os.getenv("DEEPSEEK_API_KEY") or os.getenv("VITE_DEEPSEEK_API_KEY") or "").strip()

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

@router.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            req_data = json.loads(data)
            
            messages_req = req_data.get("messages", [])
            system_prompt_frontend = req_data.get("systemPrompt", "你是一个温柔专业的儿童脊柱康复AI助手")
            
            api_key = _get_api_key()
            if not api_key:
                await websocket.send_text(json.dumps({"type": "error", "content": "未配置大模型 API Key"}))
                await websocket.close()
                return

            messages = [{"role": "system", "content": system_prompt_frontend}]
            for msg in messages_req:
                messages.append({"role": msg["role"], "content": msg["content"]})

            client = AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com")
            
            response = await client.chat.completions.create(
                model="deepseek-v4-flash",
                messages=messages,
                temperature=0.7,
                max_tokens=800,
                stream=True
            )

            full_content = ""
            
            async for chunk in response:
                delta = chunk.choices[0].delta
                if delta.content:
                    full_content += delta.content
                    await websocket.send_text(json.dumps({
                        "type": "token",
                        "content": delta.content
                    }))

            await websocket.send_text(json.dumps({
                "type": "done",
                "result": {
                    "type": "text",
                    "content": full_content,
                    "toolCall": None
                }
            }))
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_text(json.dumps({
                "type": "error",
                "content": f"对话生成异常: {str(e)}"
            }))
        except Exception:
            pass
        finally:
            await websocket.close()
