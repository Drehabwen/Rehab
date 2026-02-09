from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import os
import json
import base64
import tempfile
import asyncio
import numpy as np
from datetime import datetime
import logging
import uvicorn

# 导入核心模块
try:
    from core.voice import VoiceRecorder, VoiceRecognizer
    from core.nlp_processor import NLPProcessor
    from core.case_structurer import CaseStructurer
    from core.document_generator import DocumentGenerator
    from core.case_manager import CaseManager
except ImportError:
    from voice import VoiceRecorder, VoiceRecognizer
    from nlp_processor import NLPProcessor
    from case_structurer import CaseStructurer
    from document_generator import DocumentGenerator
    from case_manager import CaseManager

app = FastAPI(
    title="AIsci API",
    description="智能医疗助理系统后端接口",
    version="1.0.0"
)

# 配置 CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载配置
def load_config():
    # 尝试多个可能的路径
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    
    possible_paths = [
        os.path.join(os.getcwd(), "config.json"),
        os.path.join(current_dir, "config.json"),
        os.path.join(project_root, "config.json"),
        os.path.join(os.path.dirname(project_root), "config.json")
    ]
    
    for config_path in possible_paths:
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as f:
                    logger.info(f"正在加载配置文件: {config_path}")
                    return json.load(f)
            except Exception as e:
                logger.error(f"解析配置文件失败 {config_path}: {e}")
    
    logger.warning("未找到配置文件 config.json，将使用默认配置")
    return {
        "hospital_name": "XX社区卫生服务中心",
        "doctor_name": "王医生",
        "audio_sample_rate": 16000,
        "audio_channels": 1,
        "cases_dir": "./cases",
        "exports_dir": "./exports",
        "asr_appid": "",
        "asr_api_key": "",
        "asr_api_secret": ""
    }

config = load_config()

# 初始化组件
print(f"DEBUG: api_server initializing components with config keys: {list(config.keys()) if config else 'None'}")
recorder = VoiceRecorder(config)
nlp_processor = NLPProcessor(config)
case_structurer = CaseStructurer(nlp_processor)
doc_generator = DocumentGenerator(config)
case_manager = CaseManager(config)

# 挂载 Web 前端静态文件
# 假设 api_server.py 在 src/ 目录下，web 在 src/web/ 目录下
current_dir = os.path.dirname(os.path.abspath(__file__))
web_dir = os.path.join(current_dir, "web")

if os.path.exists(web_dir):
    app.mount("/static", StaticFiles(directory=web_dir), name="static")

@app.get("/")
async def read_root():
    index_path = os.path.join(web_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "AIsci API Server is running"}

# --- 数据模型定义 ---

class TranscribeRequest(BaseModel):
    audio_data: str  # base64
    format: Optional[str] = "wav"

class StructureRequest(BaseModel):
    transcript: str
    vision3_data: Optional[Dict[str, Any]] = None
    mode: Optional[str] = "standard"
    separate_speakers: Optional[bool] = True

class GenerateRequest(BaseModel):
    structured_case: Dict[str, Any]
    patient_info: Optional[Dict[str, Any]] = {}
    doctor_info: Optional[Dict[str, Any]] = {}

class ExportRequest(BaseModel):
    case_data: Dict[str, Any]
    export_format: Optional[str] = "docx"

class SaveRequest(BaseModel):
    case_data: Dict[str, Any]

# --- 路由定义 ---

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

# --- 本地录音接口 ---

@app.post("/api/record/start")
async def start_local_record():
    try:
        # 这里可以使用 on_update 来通过 websocket 或其他方式推送实时文本
        # 目前先简单实现
        recorder.start_recording()
        return {"status": "success", "message": "已开启本地麦克风录音"}
    except Exception as e:
        logger.error(f"开启录音失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/record/stop")
async def stop_local_record():
    try:
        transcript = recorder.stop_recording()
        return {
            "status": "success",
            "data": {
                "transcript": transcript,
                "timestamp": datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"停止录音失败: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    logger.info(f"收到转录请求，格式: {request.format}, 数据大小: {len(request.audio_data)}")
    try:
        audio_bytes = base64.b64decode(request.audio_data)
        logger.info(f"Base64解码成功，字节数: {len(audio_bytes)}")
        
        with tempfile.NamedTemporaryFile(suffix=f'.{request.format}', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        logger.info(f"临时文件已创建: {temp_file_path}")
        try:
            transcript = recorder.transcribe_file(temp_file_path)
            logger.info(f"转录完成，结果长度: {len(transcript) if transcript else 0}")
            return {
                'status': 'success',
                'data': {
                    'transcript': transcript,
                    'timestamp': datetime.now().isoformat()
                }
            }
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
    
    except Exception as e:
        logger.error(f'转录失败: {str(e)}')
        # 返回更详细的错误信息
        return {
            'status': 'error',
            'message': str(e),
            'detail': str(e)
        }

@app.post("/api/structure")
async def structure_case(request: StructureRequest):
    try:
        # 使用合并后的方法，支持 Vision3 数据和 SOAP 模式
        analyzed_dialogue, structured_case = case_structurer.analyze_and_structure(
            request.transcript, 
            vision3_data=request.vision3_data,
            mode=request.mode
        )
        
        return {
            'status': 'success',
            'data': {
                'analyzed_dialogue': analyzed_dialogue,
                'structured_case': structured_case,
                'timestamp': datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f'病例结构化失败: {str(e)}')
        raise HTTPException(status_code=500, detail=f'病例结构化失败: {str(e)}')

@app.post("/api/generate")
async def generate_medical_record(request: GenerateRequest):
    try:
        # 合并信息
        case_data = {**request.structured_case, **request.patient_info}
        config_info = {**config, **request.doctor_info}
        
        medical_record = case_structurer.generate_report(case_data, config_info)
        
        return {
            'status': 'success',
            'data': {
                'medical_record': medical_record,
                'timestamp': datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f'病历生成失败: {str(e)}')
        raise HTTPException(status_code=500, detail=f'病历生成失败: {str(e)}')

@app.post("/api/export")
async def export_document(request: ExportRequest):
    try:
        case_data = request.case_data
        
        # 统一映射字段，确保导出模块能拿到正确的数据
        if not case_data.get("patient_name") and case_data.get("name"):
            case_data["patient_name"] = case_data["name"]
        
        # 确保 case_id 存在（用于文件名生成）
        if "case_id" not in case_data:
            case_data["case_id"] = "EXPORT_" + datetime.now().strftime("%H%M%S")

        logger.info(f"正在导出 {request.export_format} 格式，患者: {case_data.get('patient_name')}")

        if request.export_format == "pdf":
            file_path = doc_generator.generate_pdf(case_data)
        elif request.export_format == "html":
            file_path = doc_generator.generate_html(case_data)
        else:
            file_path = doc_generator.generate_word(case_data)
            
        return {
            'status': 'success',
            'data': {
                'file_path': file_path,
                'file_name': os.path.basename(file_path),
                'timestamp': datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f'导出失败: {str(e)}')
        raise HTTPException(status_code=500, detail=f'导出失败: {str(e)}')

@app.post("/api/save")
async def save_case_data(request: SaveRequest):
    try:
        # 为了适配 CaseManager，我们需要确保一些字段存在
        case_data = request.case_data
        
        # 映射字段名以适配 CaseManager 的验证逻辑
        if "patient_name" not in case_data and "name" in case_data:
            case_data["patient_name"] = case_data["name"]
        
        # 如果没有诊断字段，从结构化数据中提取
        if "diagnosis" not in case_data and "诊断" in case_data:
            case_data["diagnosis"] = case_data["诊断"]
            
        # 映射主诉字段以通过 CaseManager 的验证
        if "chief_complaint" not in case_data and "主诉" in case_data:
            case_data["chief_complaint"] = case_data["主诉"]

        # 确保有就诊日期
        if "visit_date" not in case_data:
            case_data["visit_date"] = datetime.now().strftime("%Y-%m-%d")

        success, result = case_manager.save_case(case_data)
        if success:
            return {
                'status': 'success',
                'data': {
                    'case_id': result,
                    'timestamp': datetime.now().isoformat()
                }
            }
        else:
            raise Exception(result)
            
    except Exception as e:
        logger.error(f'保存失败: {str(e)}')
        raise HTTPException(status_code=500, detail=f'保存失败: {str(e)}')

@app.websocket("/ws/stream_transcribe")
async def websocket_stream_transcribe(websocket: WebSocket):
    await websocket.accept()
    logger.info("收到前端流式转录 WebSocket 连接")
    
    # 准备 ASR
    asr = VoiceRecognizer(config)
    loop = asyncio.get_running_loop()
    result_queue = asyncio.Queue()
    
    def on_update(text):
        loop.call_soon_threadsafe(result_queue.put_nowait, {"type": "update", "text": text})
        
    def on_complete(text):
        loop.call_soon_threadsafe(result_queue.put_nowait, {"type": "complete", "text": text})
        
    def on_error(error):
        loop.call_soon_threadsafe(result_queue.put_nowait, {"type": "error", "message": str(error)})

    # 启动 ASR (后台运行，禁用本地麦克风)
    asr.start(on_update=on_update, on_complete=on_complete, on_error=on_error, use_pyaudio=False)
    
    # 并发处理：发送结果和接收音频
    async def send_results():
        try:
            while True:
                res = await result_queue.get()
                if res["type"] == "update":
                    await websocket.send_json({"status": "update", "text": res["text"]})
                elif res["type"] == "complete":
                    await websocket.send_json({"status": "complete", "text": res["text"]})
                elif res["type"] == "error":
                    await websocket.send_json({"status": "error", "message": res["message"]})
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"发送流式结果失败: {e}")

    send_task = asyncio.create_task(send_results())
    
    try:
        total_bytes = 0
        last_log_time = asyncio.get_event_loop().time()
        
        while True:
            # 接收前端发送的二进制音频切片或控制指令
            message = await websocket.receive()
            
            if "bytes" in message:
                audio_chunk = message["bytes"]
                # 数据质量校验：检查是否全为 0 (静音或采集失败)
                if len(audio_chunk) > 0:
                    # 检查音量大小
                    audio_data = np.frombuffer(audio_chunk, dtype=np.int16)
                    peak = np.abs(audio_data).max() if len(audio_data) > 0 else 0
                    
                    if peak > 0:
                        total_bytes += len(audio_chunk)
                        asr.push_audio(audio_chunk)
                        
                        # 如果音量太小，记录警告
                        if peak < 500: # 经验值：太小可能导致转写错误
                             if asyncio.get_event_loop().time() - last_log_time >= 5.0:
                                 logger.warning(f"音频信号微弱 (Peak: {peak})，可能导致转写不准或出现英文")
                    else:
                        if asyncio.get_event_loop().time() - last_log_time >= 5.0:
                             logger.warning("接收到纯静音数据，请检查麦克风权限或设备")
            elif "text" in message:
                data = json.loads(message["text"])
                if data.get("command") == "stop":
                    logger.info("收到前端停止指令，正在结束 ASR 任务...")
                    asr.stop()
                    break
    except WebSocketDisconnect:
        logger.info("前端 WebSocket 已断开，清理资源...")
        asr.stop()
    except Exception as e:
        logger.error(f"流式转录链路异常: {e}", exc_info=True)
        asr.stop()
        try:
            await websocket.send_json({"status": "error", "message": f"链路故障: {str(e)}"})
        except: pass
    finally:
        send_task.cancel()
        logger.info("流式转录流程结束")

@app.get("/api/cases")
async def get_cases():
    try:
        cases = case_manager.list_cases()
        return {
            'status': 'success',
            'data': {
                'cases': cases,
                'count': len(cases)
            }
        }
    except Exception as e:
        logger.error(f'获取病例列表失败: {str(e)}')
        raise HTTPException(status_code=500, detail=f'获取病例列表失败: {str(e)}')

@app.get("/api/cases/{case_id}")
async def get_case_detail(case_id: str):
    try:
        case_data = case_manager.load_case(case_id)
        if case_data:
            return {
                'status': 'success',
                'data': {
                    'case': case_data,
                    'timestamp': datetime.now().isoformat()
                }
            }
        else:
            raise HTTPException(status_code=404, detail="未找到该病例")
    except Exception as e:
        logger.error(f'获取病例详情失败: {str(e)}')
        raise HTTPException(status_code=500, detail=f'获取病例详情失败: {str(e)}')

@app.websocket("/ws/record")
async def websocket_record(websocket: WebSocket):
    await websocket.accept()
    logger.info("收到前端后端主导录音 WebSocket 连接")
    
    queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def on_update(text):
        loop.call_soon_threadsafe(queue.put_nowait, {"type": "update", "text": text})
        
    def on_complete(text):
        loop.call_soon_threadsafe(queue.put_nowait, {"type": "complete", "text": text})
        
    def on_error(error):
        logger.error(f"ASR Core Error: {error}")
        loop.call_soon_threadsafe(queue.put_nowait, {"type": "error", "message": str(error)})

    def on_power(power):
        loop.call_soon_threadsafe(queue.put_nowait, {"type": "power", "power": power})

    async def send_updates():
        try:
            while True:
                msg = await queue.get()
                if msg["type"] == "update":
                    await websocket.send_json({"status": "update", "text": msg["text"]})
                elif msg["type"] == "complete":
                    await websocket.send_json({"status": "complete", "text": msg["text"]})
                elif msg["type"] == "error":
                    await websocket.send_json({"status": "error", "message": msg["message"]})
                elif msg["type"] == "power":
                    await websocket.send_json({"status": "power", "power": msg["power"]})
        except Exception as e:
            logger.error(f"WS 发送任务异常: {e}")

    send_task = None
    
    try:
        while True:
            data = await websocket.receive_json()
            command = data.get("command")
            
            if command == "start":
                if recorder.is_recording:
                    await websocket.send_json({"status": "error", "message": "录音已在运行中"})
                    continue
                
                logger.info("启动后端本地麦克风录音...")
                
                try:
                    # 使用更新后的 start_recording 接口
                    recorder.start_recording(
                        on_update=on_update,
                        on_complete=on_complete,
                        on_error=on_error,
                        on_power=on_power
                    )
                    
                    send_task = asyncio.create_task(send_updates())
                    await websocket.send_json({"status": "started"})
                except Exception as e:
                    logger.error(f"启动录音失败: {e}", exc_info=True)
                    await websocket.send_json({"status": "error", "message": f"启动录音失败: {str(e)}"})
                
            elif command == "stop":
                if recorder.is_recording:
                    logger.info("停止后端本地麦克风录音")
                    final_text = recorder.stop_recording()
                    # stop_recording 会触发 on_complete，不需要手动发完成消息
                else:
                    await websocket.send_json({"status": "error", "message": "未在录音状态"})
                    
    except WebSocketDisconnect:
        logger.info("前端 WebSocket 已断开")
    except Exception as e:
        logger.error(f"WebSocket 流程异常: {e}", exc_info=True)
    finally:
        if recorder.is_recording:
            recorder.stop_recording()
        if send_task:
            send_task.cancel()
        logger.info("后端录音 WebSocket 流程结束")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
