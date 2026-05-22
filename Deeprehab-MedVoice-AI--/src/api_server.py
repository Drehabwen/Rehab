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

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# 瀵煎叆鏍稿績妯″潡
try:
    from core.voice import VoiceRecorder, VoiceRecognizer, HAS_PYAUDIO
    from core.nlp_processor import NLPProcessor
    from core.case_structurer import CaseStructurer
    from core.document_generator import DocumentGenerator
    from core.case_manager import CaseManager
except ImportError:
    from voice import VoiceRecorder, VoiceRecognizer, HAS_PYAUDIO
    from nlp_processor import NLPProcessor
    from case_structurer import CaseStructurer
    from document_generator import DocumentGenerator
    from case_manager import CaseManager

app = FastAPI(
    title="AIsci API",
    description="鏅鸿兘鍖荤枟鍔╃悊绯荤粺鍚庣鎺ュ彛",
    version="1.0.0"
)

# 閰嶇疆 CORS
def load_cors_origins() -> List[str]:
    raw = os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:5173"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=load_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def load_runtime_env():
    if load_dotenv is None:
        return

    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)
    repo_root = os.path.dirname(project_root)

    possible_env_paths = [
        os.path.join(repo_root, ".env"),
        os.path.join(project_root, ".env"),
        os.path.join(current_dir, ".env"),
        os.path.join(repo_root, "backend", ".env"),
    ]

    for env_path in possible_env_paths:
        if os.path.exists(env_path):
            load_dotenv(env_path, override=False)


def env_first(*keys: str) -> str:
    for key in keys:
        value = os.getenv(key)
        if value and value.strip():
            return value.strip()
    return ""


load_runtime_env()

# 鍔犺浇閰嶇疆
def load_config():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(current_dir)

    config = {
        "hospital_name": "XX社区卫生服务中心",
        "doctor_name": "王医生",
        "audio_sample_rate": 16000,
        "audio_channels": 1,
        "cases_dir": "./cases",
        "exports_dir": "./exports",
        "asr_appid": "",
        "asr_api_key": "",
        "asr_api_secret": "",
    }

    possible_paths = [
        os.path.join(os.getcwd(), "config.json"),
        os.path.join(current_dir, "config.json"),
        os.path.join(project_root, "config.json"),
        os.path.join(os.path.dirname(project_root), "config.json"),
    ]

    for config_path in possible_paths:
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as file:
                    logger.info(f"正在加载配置文件: {config_path}")
                    config.update(json.load(file))
                    break
            except Exception as exc:
                logger.error(f"解析配置文件失败 {config_path}: {exc}")

    config["asr_appid"] = env_first("XFYUN_ASR_APPID", "XFYUN_APPID", "APPID") or str(
        config.get("asr_appid") or ""
    ).strip()
    config["asr_api_key"] = env_first("XFYUN_ASR_API_KEY", "XFYUN_API_KEY", "APIKey") or str(
        config.get("asr_api_key") or ""
    ).strip()
    config["asr_api_secret"] = env_first(
        "XFYUN_ASR_API_SECRET",
        "XFYUN_API_SECRET",
        "APISecret",
    ) or str(config.get("asr_api_secret") or "").strip()
    return config

config = load_config()

# 鍒濆鍖栫粍浠?
print(f"DEBUG: api_server initializing components with config keys: {list(config.keys()) if config else 'None'}")
recorder = VoiceRecorder(config)
nlp_processor = NLPProcessor(config)
case_structurer = CaseStructurer(nlp_processor)
doc_generator = DocumentGenerator(config)
case_manager = CaseManager(config)

# 鎸傝浇 Web 鍓嶇闈欐€佹枃浠?
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

# --- 鏁版嵁妯″瀷瀹氫箟 ---

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

# --- 璺敱瀹氫箟 ---

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "asr_configured": bool(
                config.get("asr_appid") and config.get("asr_api_key") and config.get("asr_api_secret")
            ),
            "local_recording_supported": bool(HAS_PYAUDIO),
        },
    }

# --- 鏈湴褰曢煶鎺ュ彛 ---

@app.post("/api/record/start")
async def start_local_record():
    try:
        # 杩欓噷鍙互浣跨敤 on_update 鏉ラ€氳繃 websocket 鎴栧叾浠栨柟寮忔帹閫佸疄鏃舵枃鏈?        # 鐩墠鍏堢畝鍗曞疄鐜?        recorder.start_recording()
        return {"status": "success", "message": "宸插紑鍚湰鍦伴害鍏嬮褰曢煶"}
    except Exception as e:
        logger.error(f"寮€鍚綍闊冲け璐? {e}")
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
        logger.error(f"鍋滄褰曢煶澶辫触: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/transcribe")
async def transcribe_audio(request: TranscribeRequest):
    logger.info(f"鏀跺埌杞綍璇锋眰锛屾牸寮? {request.format}, 鏁版嵁澶у皬: {len(request.audio_data)}")
    try:
        audio_bytes = base64.b64decode(request.audio_data)
        logger.info(f"Base64瑙ｇ爜鎴愬姛锛屽瓧鑺傛暟: {len(audio_bytes)}")
        
        with tempfile.NamedTemporaryFile(suffix=f'.{request.format}', delete=False) as temp_file:
            temp_file.write(audio_bytes)
            temp_file_path = temp_file.name
        
        logger.info(f"涓存椂鏂囦欢宸插垱寤? {temp_file_path}")
        try:
            transcript = recorder.transcribe_file(temp_file_path)
            logger.info(f"杞綍瀹屾垚锛岀粨鏋滈暱搴? {len(transcript) if transcript else 0}")
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
        logger.error(f'杞綍澶辫触: {str(e)}')
        # 杩斿洖鏇磋缁嗙殑閿欒淇℃伅
        return {
            'status': 'error',
            'message': str(e),
            'detail': str(e)
        }

@app.post("/api/structure")
async def structure_case(request: StructureRequest):
    try:
        # 浣跨敤鍚堝苟鍚庣殑鏂规硶锛屾敮鎸?Vision3 鏁版嵁鍜?SOAP 妯″紡
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
        logger.error(f'鐥呬緥缁撴瀯鍖栧け璐? {str(e)}')
        raise HTTPException(status_code=500, detail=f'鐥呬緥缁撴瀯鍖栧け璐? {str(e)}')

@app.post("/api/generate")
async def generate_medical_record(request: GenerateRequest):
    try:
        # 鍚堝苟淇℃伅
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
        logger.error(f'鐥呭巻鐢熸垚澶辫触: {str(e)}')
        raise HTTPException(status_code=500, detail=f'鐥呭巻鐢熸垚澶辫触: {str(e)}')

@app.post("/api/export")
async def export_document(request: ExportRequest):
    try:
        case_data = request.case_data
        
        # 缁熶竴鏄犲皠瀛楁锛岀‘淇濆鍑烘ā鍧楄兘鎷垮埌姝ｇ‘鐨勬暟鎹?
        if not case_data.get("patient_name") and case_data.get("name"):
            case_data["patient_name"] = case_data["name"]
        
        # 纭繚 case_id 瀛樺湪锛堢敤浜庢枃浠跺悕鐢熸垚锛?
        if "case_id" not in case_data:
            case_data["case_id"] = "EXPORT_" + datetime.now().strftime("%H%M%S")

        logger.info(f"姝ｅ湪瀵煎嚭 {request.export_format} 鏍煎紡锛屾偅鑰? {case_data.get('patient_name')}")

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
        logger.error(f'瀵煎嚭澶辫触: {str(e)}')
        raise HTTPException(status_code=500, detail=f'瀵煎嚭澶辫触: {str(e)}')

@app.post("/api/save")
async def save_case_data(request: SaveRequest):
    try:
        # 涓轰簡閫傞厤 CaseManager锛屾垜浠渶瑕佺‘淇濅竴浜涘瓧娈靛瓨鍦?        case_data = request.case_data
        
        # 鏄犲皠瀛楁鍚嶄互閫傞厤 CaseManager 鐨勯獙璇侀€昏緫
        if "patient_name" not in case_data and "name" in case_data:
            case_data["patient_name"] = case_data["name"]
        
        # 濡傛灉娌℃湁璇婃柇瀛楁锛屼粠缁撴瀯鍖栨暟鎹腑鎻愬彇
        if "diagnosis" not in case_data and "璇婃柇" in case_data:
            case_data["diagnosis"] = case_data["璇婃柇"]
            
        # 鏄犲皠涓昏瘔瀛楁浠ラ€氳繃 CaseManager 鐨勯獙璇?
        if "chief_complaint" not in case_data and "涓昏瘔" in case_data:
            case_data["chief_complaint"] = case_data["涓昏瘔"]

        # 纭繚鏈夊氨璇婃棩鏈?
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
        logger.error(f'淇濆瓨澶辫触: {str(e)}')
        raise HTTPException(status_code=500, detail=f'淇濆瓨澶辫触: {str(e)}')

@app.websocket("/ws/stream_transcribe")
async def websocket_stream_transcribe(websocket: WebSocket):
    await websocket.accept()
    logger.info("鏀跺埌鍓嶇娴佸紡杞綍 WebSocket 杩炴帴")
    
    # 鍑嗗 ASR
    asr = VoiceRecognizer(config)
    loop = asyncio.get_running_loop()
    result_queue = asyncio.Queue()
    
    def on_update(text):
        loop.call_soon_threadsafe(result_queue.put_nowait, {"type": "update", "text": text})
        
    def on_complete(text):
        loop.call_soon_threadsafe(result_queue.put_nowait, {"type": "complete", "text": text})
        
    def on_error(error):
        loop.call_soon_threadsafe(result_queue.put_nowait, {"type": "error", "message": str(error)})

    # 鍚姩 ASR (鍚庡彴杩愯锛岀鐢ㄦ湰鍦伴害鍏嬮)
    asr.start(on_update=on_update, on_complete=on_complete, on_error=on_error, use_pyaudio=False)
    
    # 骞跺彂澶勭悊锛氬彂閫佺粨鏋滃拰鎺ユ敹闊抽
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
            logger.error(f"鍙戦€佹祦寮忕粨鏋滃け璐? {e}")

    send_task = asyncio.create_task(send_results())
    
    try:
        total_bytes = 0
        last_log_time = asyncio.get_event_loop().time()
        
        while True:
            # 鎺ユ敹鍓嶇鍙戦€佺殑浜岃繘鍒堕煶棰戝垏鐗囨垨鎺у埗鎸囦护
            message = await websocket.receive()
            
            if "bytes" in message:
                audio_chunk = message["bytes"]
                # 鏁版嵁璐ㄩ噺鏍￠獙锛氭鏌ユ槸鍚﹀叏涓?0 (闈欓煶鎴栭噰闆嗗け璐?
                if len(audio_chunk) > 0:
                    # 妫€鏌ラ煶閲忓ぇ灏?                    audio_data = np.frombuffer(audio_chunk, dtype=np.int16)
                    peak = np.abs(audio_data).max() if len(audio_data) > 0 else 0
                    
                    if peak > 0:
                        total_bytes += len(audio_chunk)
                        asr.push_audio(audio_chunk)
                        
                        # 濡傛灉闊抽噺澶皬锛岃褰曡鍛?
                        if peak < 500:  # 缁忛獙鍊硷細澶皬鍙兘瀵艰嚧杞啓閿欒
                            if asyncio.get_event_loop().time() - last_log_time >= 5.0:
                                logger.warning(f"闊抽淇″彿寰急 (Peak: {peak})锛屽彲鑳藉鑷磋浆鍐欎笉鍑嗘垨鍑虹幇鑻辨枃")
                    else:
                        if asyncio.get_event_loop().time() - last_log_time >= 5.0:
                            logger.warning("鎺ユ敹鍒扮函闈欓煶鏁版嵁锛岃妫€鏌ラ害鍏嬮鏉冮檺鎴栬澶?")
            elif "text" in message:
                data = json.loads(message["text"])
                if data.get("command") == "stop":
                    logger.info("鏀跺埌鍓嶇鍋滄鎸囦护锛屾鍦ㄧ粨鏉?ASR 浠诲姟...")
                    asr.stop()
                    break
    except WebSocketDisconnect:
        logger.info("鍓嶇 WebSocket 宸叉柇寮€锛屾竻鐞嗚祫婧?..")
        asr.stop()
    except Exception as e:
        logger.error(f"娴佸紡杞綍閾捐矾寮傚父: {e}", exc_info=True)
        asr.stop()
        try:
            await websocket.send_json({"status": "error", "message": f"閾捐矾鏁呴殰: {str(e)}"})
        except: pass
    finally:
        send_task.cancel()
        logger.info("娴佸紡杞綍娴佺▼缁撴潫")

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
        logger.error(f'鑾峰彇鐥呬緥鍒楄〃澶辫触: {str(e)}')
        raise HTTPException(status_code=500, detail=f'鑾峰彇鐥呬緥鍒楄〃澶辫触: {str(e)}')

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
            raise HTTPException(status_code=404, detail="鏈壘鍒拌鐥呬緥")
    except Exception as e:
        logger.error(f'鑾峰彇鐥呬緥璇︽儏澶辫触: {str(e)}')
        raise HTTPException(status_code=500, detail=f'鑾峰彇鐥呬緥璇︽儏澶辫触: {str(e)}')

@app.websocket("/ws/record")
async def websocket_record(websocket: WebSocket):
    await websocket.accept()
    logger.info("鏀跺埌鍓嶇鍚庣涓诲褰曢煶 WebSocket 杩炴帴")
    
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
            logger.error(f"WS 鍙戦€佷换鍔″紓甯? {e}")

    send_task = None
    
    try:
        while True:
            data = await websocket.receive_json()
            command = data.get("command")
            
            if command == "start":
                if recorder.is_recording:
                    await websocket.send_json({"status": "error", "message": "录音已在运行中"})
                    continue
                
                logger.info("鍚姩鍚庣鏈湴楹﹀厠椋庡綍闊?..")
                
                try:
                    # 浣跨敤鏇存柊鍚庣殑 start_recording 鎺ュ彛
                    recorder.start_recording(
                        on_update=on_update,
                        on_complete=on_complete,
                        on_error=on_error,
                        on_power=on_power
                    )
                    
                    send_task = asyncio.create_task(send_updates())
                    await websocket.send_json({"status": "started"})
                except Exception as e:
                    logger.error(f"鍚姩褰曢煶澶辫触: {e}", exc_info=True)
                    await websocket.send_json({"status": "error", "message": f"鍚姩褰曢煶澶辫触: {str(e)}"})
                
            elif command == "stop":
                if recorder.is_recording:
                    logger.info("停止后端本地麦克风录音")
                    final_text = recorder.stop_recording()
                    # stop_recording 浼氳Е鍙?on_complete锛屼笉闇€瑕佹墜鍔ㄥ彂瀹屾垚娑堟伅
                else:
                    await websocket.send_json({"status": "error", "message": "当前未处于录音状态"})
                    
    except WebSocketDisconnect:
        logger.info("鍓嶇 WebSocket 宸叉柇寮€")
    except Exception as e:
        logger.error(f"WebSocket 娴佺▼寮傚父: {e}", exc_info=True)
    finally:
        if recorder.is_recording:
            recorder.stop_recording()
        if send_task:
            send_task.cancel()
        logger.info("鍚庣褰曢煶 WebSocket 娴佺▼缁撴潫")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=5000)
