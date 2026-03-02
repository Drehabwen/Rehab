from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from typing import List, Dict, Any, Optional
import statistics
import time
import uvicorn
import os
import sys
import json

# 加载环境变量
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
if os.path.exists(dotenv_path):
    from dotenv import load_dotenv
    load_dotenv(dotenv_path)

from config import config

# Add current directory to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import (
    AnalysisRequest, AnalysisResponse, PostureMetrics, 
    JointAnalysisRequest, JointAnalysisResponse,
    TemporalAnalysisRequest, PostureReportResponse,
    SteppedAnalysisRequest, Landmark
)
from utils.posture_analysis import analyze_posture
from utils.joint_analysis import calculate_joint_angle
from utils.camera_stream import CameraManager
from utils.llm_reporter import generate_posture_report
from utils.narrator import process_time_series
import uuid

app = FastAPI(
    title="Vision3 AI Backend",
    description="Python backend for Vision3 Posture Analysis",
    version="1.0.0"
)

# Initialize Camera Manager
camera_manager = CameraManager()

def build_time_series(frames):
    series = []
    # frames is a list of SteppedFrame, each containing timeSeriesLandmarks (List[List[Landmark]])
    for frame in frames:
        base_timestamp = frame.timestamp or int(time.time() * 1000)
        num_frames = len(frame.timeSeriesLandmarks)
        
        for i, landmarks in enumerate(frame.timeSeriesLandmarks):
            analysis = analyze_posture(
                view=frame.view,
                landmarks=landmarks,
                width=frame.width,
                height=frame.height
            )
            metrics = analysis["metrics"].model_dump()
            metrics = {k: v for k, v in metrics.items() if isinstance(v, (int, float))}
            
            # Synthesize timestamp: assume 30fps (33ms per frame), ending at base_timestamp
            timestamp = base_timestamp - (num_frames - 1 - i) * 33
            
            series.append({"timestamp": timestamp, "view": frame.view, **metrics})
            
    series.sort(key=lambda item: item.get("timestamp", 0))
    return series

def compute_averages(series):
    sums: Dict[str, float] = {}
    counts: Dict[str, int] = {}
    for item in series:
        for key, value in item.items():
            if key in ("timestamp", "view"):
                continue
            if isinstance(value, (int, float)):
                sums[key] = sums.get(key, 0.0) + float(value)
                counts[key] = counts.get(key, 0) + 1
    return {key: sums[key] / counts[key] for key in sums}

def select_stability_key(series):
    preferred = ["swayOffset", "headDeviation", "headForward", "shoulderAngle", "hipAngle", "shoulderRounded", "headPitch", "headYaw", "headRoll"]
    for key in preferred:
        if any(isinstance(item.get(key), (int, float)) for item in series):
            return key
    for item in series:
        for key, value in item.items():
            if key in ("timestamp", "view"):
                continue
            if isinstance(value, (int, float)):
                return key
    return None

def compute_stability(series):
    key = select_stability_key(series)
    if not key:
        return {"swayArea": 0.0, "maxDeviation": 0.0, "sd": 0.0, "velocity": 0.0}
    values = [float(item[key]) for item in series if isinstance(item.get(key), (int, float))]
    if not values:
        return {"swayArea": 0.0, "maxDeviation": 0.0, "sd": 0.0, "velocity": 0.0}
    mean = sum(values) / len(values)
    sd = statistics.pstdev(values) if len(values) > 1 else 0.0
    max_deviation = max(abs(v - mean) for v in values)
    velocity = sum(abs(values[i] - values[i - 1]) for i in range(1, len(values))) / (len(values) - 1) if len(values) > 1 else 0.0
    sway_area = sum(abs(v - mean) for v in values)
    return {
        "swayArea": sway_area,
        "maxDeviation": max_deviation,
        "sd": sd,
        "velocity": velocity
    }

# --- Video Stream ---

def gen_frames():
    camera_manager.start()
    try:
        while True:
            frame = camera_manager.get_video_frame()
            if frame is None:
                continue
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
    finally:
        # We don't necessarily want to stop the camera for every disconnect 
        # but for this simple version we'll manage it via API
        pass

@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(gen_frames(), 
                            media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/camera/start")
async def start_camera():
    success = camera_manager.start()
    return {"status": "success" if success else "error"}

@app.post("/camera/stop")
async def stop_camera():
    camera_manager.stop()
    return {"status": "success"}

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket ---

@app.websocket("/ws/analyze")
async def websocket_endpoint(websocket: WebSocket):
    print("WebSocket connection attempt...", flush=True)
    await websocket.accept()
    print("WebSocket connection established", flush=True)
    try:
        while True:
            # Add timeout to prevent blocking forever if client is silent
            # But client sends data, so let's just read
            data = await websocket.receive_text()
            print(f"[DEBUG] Received WebSocket message: {data[:200]}...", flush=True)
            print(f"Received raw data len: {len(data)}", flush=True)
            
            try:
                message = json.loads(data)
            except json.JSONDecodeError as e:
                print(f"JSON Decode Error: {e}", flush=True)
                continue
            
            msg_type = message.get("type")
            print(f"Message type: {msg_type}", flush=True)

            if msg_type == "POSTURE_SYNC":
                print("Processing POSTURE_SYNC...", flush=True)
                try:
                    # Validate and parse using Pydantic
                    request = AnalysisRequest(**message)
                    print(f"Pydantic validation success for POSTURE_SYNC", flush=True)
                    
                    # Process time-series data using narrator
                    # Convert Pydantic models to dicts for narrator
                    # landmarks_sequence = [[lm.model_dump() for lm in frame] for frame in request.timeSeriesLandmarks]
                    # analysis_result = process_time_series(request.view, landmarks_sequence)
                    # Skip heavy processing for now to test echo
                    
                    # For real-time feedback (skeleton/metrics), use the LAST frame of the sequence
                    # or the average. Let's use the average for stability.
                    avg_landmarks = []
                    num_frames = len(request.timeSeriesLandmarks)
                    if num_frames > 0:
                        num_lms = len(request.timeSeriesLandmarks[0])
                        for i in range(num_lms):
                            avg_x = sum(f[i].x for f in request.timeSeriesLandmarks) / num_frames
                            avg_y = sum(f[i].y for f in request.timeSeriesLandmarks) / num_frames
                            avg_z = sum(f[i].z or 0 for f in request.timeSeriesLandmarks) / num_frames
                            avg_landmarks.append(Landmark(x=avg_x, y=avg_y, z=avg_z))
                    
                    print(f"Calculated average landmarks for {num_frames} frames", flush=True)

                    # Perform analysis on averaged landmarks
                    result = analyze_posture(
                        view=request.view,
                        landmarks=avg_landmarks,
                        width=request.width,
                        height=request.height
                    )
                    # result['metrics'] is a Pydantic model, use model_dump() to get dict
                    print(f"Analysis complete. Metrics: {result['metrics']}", flush=True)
                    
                    # Construct response
                    response = AnalysisResponse(
                        metrics=result["metrics"],
                        issues=result["issues"],
                        annotations=result.get("annotations", [])
                    )
                    
                    # Send back the results
                    resp_json = response.model_dump_json()
                    await websocket.send_text(resp_json)
                    print(f"Sent POSTURE_SYNC response len: {len(resp_json)}", flush=True)
                except Exception as e:
                    print(f"Error processing POSTURE_SYNC: {e}", flush=True)
                    import traceback
                    traceback.print_exc()
                
            elif msg_type == "JOINT_ANALYSIS":
                try:
                    # Validate and parse using Pydantic
                    request = JointAnalysisRequest(**message)
                    
                    results = []
                    # Pre-convert landmarks to dict once for performance
                    landmarks_dict = [lm.model_dump() for lm in request.landmarks]
                    world_landmarks_dict = [lm.model_dump() for lm in request.worldLandmarks] if request.worldLandmarks else None
                    
                    for m in request.measurements:
                        angle = calculate_joint_angle(
                            joint_type=m.jointType,
                            direction=m.direction,
                            landmarks=landmarks_dict,
                            width=request.width,
                            height=request.height,
                            side=m.side,
                            world_landmarks=world_landmarks_dict
                        )
                        results.append({"id": m.id, "angle": angle})
                    
                    # Construct response
                    response = JointAnalysisResponse(
                        results=results
                    )
                    
                    # Send back the results
                    await websocket.send_text(response.model_dump_json())
                except Exception as e:
                    print(f"Error processing JOINT_ANALYSIS: {e}")
            
            elif message.get("type") == "POSTURE_BATCH_ANALYSIS":
                try:
                    # Validate and parse using Pydantic
                    request = TemporalAnalysisRequest(**message)
                    print(f"Received batch analysis for view: {request.view}")
                    
                    # Generate Markdown report using LLM
                    markdown_content = await run_in_threadpool(generate_posture_report, request.model_dump())
                    
                    # Construct response
                    report_response = PostureReportResponse(
                        markdown=markdown_content,
                        reportId=str(uuid.uuid4())
                    )
                    
                    # Send back the Markdown report
                    await websocket.send_text(report_response.model_dump_json())
                except Exception as e:
                    print(f"Error processing POSTURE_BATCH_ANALYSIS: {e}")

            elif message.get("type") == "POSTURE_STEPPED_ANALYSIS":
                try:
                    print(f"[DEBUG] Received POSTURE_STEPPED_ANALYSIS message", flush=True)
                    request = SteppedAnalysisRequest(**message)
                    frames = request.frames
                    assessment_type = request.assessmentType or "standard"
                    print(f"[DEBUG] Number of frames: {len(frames)}, Assessment type: {assessment_type}", flush=True)
                    
                    # Generate auxiliary diagnosis (basic report) without LLM
                    auxiliary_diagnosis = ""
                    if request.mock:
                        auxiliary_diagnosis = "### [MOCK] 基础评估报告\n\n- **稳定性**: 优秀\n- **体态**: 正常\n\n这是测试用的模拟报告。"
                        print("Generated MOCK auxiliary diagnosis", flush=True)
                    elif len(frames) == 0:
                        auxiliary_diagnosis = "> **⚠️ 警告**：未采集到任何视角数据，请重新采集。"
                        print("[DEBUG] No frames received", flush=True)
                    else:
                        print(f"Received stepped analysis for {len(frames)} views")
                        print(f"[DEBUG] Frame details: {[f'view={f.view}, landmarks={len(f.timeSeriesLandmarks)}' for f in frames]}", flush=True)
                        
                        # Generate basic report from narration (without LLM)
                        narrations = []
                        for frame in frames:
                            try:
                                # Convert Landmark objects to dictionaries
                                landmarks_sequence = []
                                for frame_landmarks in frame.timeSeriesLandmarks:
                                    landmark_dicts = [
                                        {"x": lm.x, "y": lm.y, "z": lm.z, "visibility": lm.visibility}
                                        for lm in frame_landmarks
                                    ]
                                    landmarks_sequence.append(landmark_dicts)
                                
                                res = process_time_series(frame.view, landmarks_sequence)
                                if res.get("narration"):
                                    narrations.append(f"### {frame.view} 视角分析\n\n{res['narration']}")
                            except Exception as e:
                                print(f"[ERROR] Failed to process frame {frame.view}: {e}", flush=True)
                                import traceback
                                traceback.print_exc()
                        
                        auxiliary_diagnosis = "\n\n---\n\n".join(narrations) if narrations else "基础分析完成，暂无异常发现。"
                        print(f"[DEBUG] Generated auxiliary diagnosis: {len(auxiliary_diagnosis)} chars", flush=True)
                    
                    time_series = []
                    if frames and len(frames) > 0:
                        try:
                            time_series = build_time_series(frames)
                            print(f"[DEBUG] Built time series with {len(time_series)} entries", flush=True)
                        except Exception as e:
                            print(f"Error building time series: {e}", flush=True)
                    
                    # Calculate basic metrics from time series
                    metrics = None
                    issues = []
                    if time_series and len(time_series) > 0:
                        try:
                            metrics = compute_averages(time_series)
                            print(f"[DEBUG] Computed averages: {metrics}", flush=True)
                            
                            # Generate basic issues from metrics
                            if metrics.get('shoulderAngle', 0) and abs(metrics['shoulderAngle']) > config.POSTURE_THRESHOLDS['uneven_shoulders']['mild']:
                                issues.append({
                                    'id': 'shoulder_imbalance',
                                    'type': 'alignment',
                                    'severity': 'moderate' if abs(metrics['shoulderAngle']) > config.POSTURE_THRESHOLDS['uneven_shoulders']['moderate'] else 'mild',
                                    'title': '肩膀不平衡',
                                    'description': f'左右肩膀高度差异约 {abs(metrics["shoulderAngle"]):.1f}°',
                                    'recommendation': '注意保持正确坐姿，避免单侧承重'
                                })
                            if metrics.get('headDeviation', 0) and abs(metrics['headDeviation']) > config.POSTURE_THRESHOLDS['midline_shift']['moderate']:
                                issues.append({
                                    'id': 'head_deviation',
                                    'type': 'alignment',
                                    'severity': 'moderate',
                                    'title': '头部偏移',
                                    'description': f'头部相对于中线偏移约 {abs(metrics["headDeviation"]):.1f}cm',
                                    'recommendation': '注意保持头部中立位，避免长时间侧倾'
                                })
                            if metrics.get('headForward', 0) and metrics['headForward'] > config.POSTURE_THRESHOLDS['head_forward']['moderate']:
                                issues.append({
                                    'id': 'head_forward',
                                    'type': 'forward_head',
                                    'severity': 'moderate' if metrics['headForward'] > config.POSTURE_THRESHOLDS['head_forward']['severe'] else 'mild',
                                    'title': '头前伸',
                                    'description': f'头部前倾约 {metrics["headForward"]:.1f}cm',
                                    'recommendation': '注意调整屏幕高度，保持头部中立位'
                                })
                            print(f"[DEBUG] Generated {len(issues)} basic issues", flush=True)
                        except Exception as e:
                            print(f"Error computing metrics: {e}", flush=True)
                    
                    report_response = PostureReportResponse(
                        markdown="",  # Deep report is empty initially
                        reportId=str(uuid.uuid4()),
                        timeSeries=time_series,
                        metrics=metrics,
                        issues=issues if issues else None,
                        auxiliaryDiagnosis=auxiliary_diagnosis,  # Basic report
                        assessmentType=assessment_type
                    )
                    
                    print(f"--- SENDING POSTURE_REPORT (Basic) ---", flush=True)
                    print(f"Auxiliary diagnosis length: {len(auxiliary_diagnosis)}", flush=True)
                    print(f"Content snippet: {auxiliary_diagnosis[:100]}...", flush=True)
                    
                    await websocket.send_text(report_response.model_dump_json())
                    print("POSTURE_REPORT (Basic) sent successfully", flush=True)
                except Exception as e:
                    print(f"Error processing POSTURE_STEPPED_ANALYSIS: {e}")
                    import traceback
                    traceback.print_exc()
            
            elif msg_type == "POSTURE_DEEP_ANALYSIS":
                try:
                    print(f"[POSTURE_DEEP_ANALYSIS] Received deep analysis request", flush=True)
                    
                    # Support both single frame and multi-frame requests
                    frames_data = message.get("frames", [])
                    assessment_type = message.get("assessmentType", "quick")
                    
                    if not frames_data:
                        # Fallback to single frame format
                        request = AnalysisRequest(**message)
                        frames_data = [{
                            "view": request.view,
                            "timeSeriesLandmarks": request.timeSeriesLandmarks
                        }]
                        assessment_type = "quick"
                    
                    # Send ACK immediately
                    ack_payload = {"type": "POSTURE_ACK", "status": "processing"}
                    if message.get("requestId"):
                        ack_payload["requestId"] = message["requestId"]
                    await websocket.send_text(json.dumps(ack_payload))
                    print(f"[POSTURE_DEEP_ANALYSIS] Sent POSTURE_ACK", flush=True)
                    
                    # Generate LLM deep report (STREAMING MODE)
                    markdown_content = ""
                    try:
                        print(f"[POSTURE_DEEP_ANALYSIS] Generating LLM report for {len(frames_data)} frames...", flush=True)
                        
                        # Process all frames
                        from utils.llm_reporter import posture_agent
                        posture_agent.clear()
                        
                        for frame_data in frames_data:
                            res = process_time_series(frame_data["view"], frame_data["timeSeriesLandmarks"])
                            posture_agent.analyze_view(res["narration"], res["stats"])
                        
                        # Stream the report
                        async for chunk in posture_agent.generate_final_report_stream(assessment_type, websocket):
                            markdown_content = chunk
                        
                        print(f"[POSTURE_DEEP_ANALYSIS] Stream completed. Final content: {len(markdown_content)} chars", flush=True)
                        
                    except Exception as llm_error:
                        print(f"[POSTURE_DEEP_ANALYSIS] LLM stream failed: {llm_error}", flush=True)
                        import traceback
                        traceback.print_exc()
                        markdown_content = f"API 链接失败：{str(llm_error)}"
                    
                    # Send final complete message
                    deep_report = PostureReportResponse(
                        markdown=markdown_content,
                        reportId=str(uuid.uuid4()),
                        timeSeries=[],
                        metrics={},
                        auxiliaryDiagnosis="",
                        issues=[],
                        assessmentType="quick",
                        isDeepReport=True
                    )
                    await websocket.send_text(deep_report.model_dump_json())
                    print(f"[POSTURE_DEEP_ANALYSIS] Deep report completion sent", flush=True)
                    
                except Exception as e:
                    print(f"[POSTURE_DEEP_ANALYSIS] Error: {e}", flush=True)
                    import traceback
                    traceback.print_exc()
                    error_response = PostureReportResponse(
                        markdown=f"生成深度报告失败：{str(e)}",
                        reportId=str(uuid.uuid4()),
                        auxiliaryDiagnosis="",
                        assessmentType="quick",
                        isDeepReport=True
                    )
                    await websocket.send_text(error_response.model_dump_json())
                
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

# --- HTTP Routes ---

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Integration with MedVoice AI
try:
    medvoice_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Deeprehab-MedVoice-AI--", "src")
    if os.path.exists(medvoice_path):
        sys.path.append(medvoice_path)
        from api_server import app as medvoice_app
        app.mount("/medvoice", medvoice_app)
        print("MedVoice AI modules integrated at /medvoice")
except Exception as e:
    print(f"MedVoice AI integration failed: {e}")

if __name__ == "__main__":
    import uvicorn
    # Use port from config to avoid conflicts with zombie processes on 8000
    uvicorn.run(app, host="0.0.0.0", port=8002)
