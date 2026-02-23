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
from dotenv import load_dotenv

load_dotenv()

# Add current directory to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import (
    AnalysisRequest, AnalysisResponse, PostureMetrics, 
    JointAnalysisRequest, JointAnalysisResponse,
    TemporalAnalysisRequest, HTMLReportResponse,
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
                    
                    # Generate HTML report using LLM
                    html_content = await run_in_threadpool(generate_posture_report, request.model_dump())
                    
                    # Construct response
                    report_response = HTMLReportResponse(
                        html=html_content,
                        reportId=str(uuid.uuid4())
                    )
                    
                    # Send back the HTML report
                    await websocket.send_text(report_response.model_dump_json())
                except Exception as e:
                    print(f"Error processing POSTURE_BATCH_ANALYSIS: {e}")

            elif message.get("type") == "POSTURE_STEPPED_ANALYSIS":
                try:
                    request = SteppedAnalysisRequest(**message)
                    frames = request.frames
                    
                    if request.mock:
                        html_content = "<div class='p-8 text-center text-slate-400'>[MOCK] AI Report Generated</div>"
                        print("Generated MOCK report", flush=True)
                    elif len(frames) == 0:
                        html_content = "<div class='p-8 text-center text-slate-400'>未采集到任何视角数据，请重新采集。</div>"
                    else:
                        print(f"Received stepped analysis for {len(frames)} views")
                        # Use the new llm_reporter which handles multi-view Agent logic
                        html_content = await run_in_threadpool(generate_posture_report, {"frames": [f.model_dump() for f in frames]})
                    
                    # Build time series for charts (if we have frames)
                    time_series = []
                    if frames and len(frames) > 0:
                        try:
                            time_series = build_time_series(frames)
                        except Exception as e:
                            print(f"Error building time series: {e}", flush=True)

                    # Construct response
                    report_response = HTMLReportResponse(
                        html=html_content,
                        reportId=str(uuid.uuid4()),
                        timeSeries=time_series
                    )
                    
                    # Send back the HTML report
                    await websocket.send_text(report_response.model_dump_json())
                except Exception as e:
                    print(f"Error processing POSTURE_STEPPED_ANALYSIS: {e}")
                    import traceback
                    traceback.print_exc()
                
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
    # Use port 8002 to avoid conflicts with zombie processes on 8000
    uvicorn.run(app, host="0.0.0.0", port=8002)
