from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from typing import List, Dict, Any, Optional
from datetime import datetime
import statistics
import time
import uvicorn
import os
import sys
import json

# 鍔犺浇鐜鍙橀噺
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
    SteppedAnalysisRequest, Landmark,
    TreatmentPlanRequest, TreatmentPlanResponse, TreatmentPlanStreamResponse,
    SessionTreatmentPlanRequest,
    SessionReportRequest, SessionReportResponse,
)
from utils.posture_analysis import analyze_posture
from utils.joint_analysis import calculate_joint_angle
from utils.camera_stream import CameraManager
from utils.llm_reporter import generate_posture_report, posture_agent
from utils.narrator import process_time_series
from utils.treatment_plan_service import (
    generate_treatment_plan,
    generate_treatment_plan_from_session_report,
    generate_treatment_plan_stream,
    generate_treatment_plan_stream_from_session_report,
    get_assessment_data,
    ensure_treatment_plan_config,
    TreatmentPlanConfigError,
    AssessmentDataUnavailableError,
)
from utils.session_reporter import generate_session_report
import uuid
from routers import integration
from routers import wechat_chatbot_fast

app = FastAPI(
    title="Vision3 AI Backend",
    description="Python backend for Vision3 Posture Analysis",
    version="1.0.0"
)
app.include_router(integration.router)
app.include_router(wechat_chatbot_fast.router)

# Initialize Camera Manager
camera_manager = CameraManager()
medvoice_integrated = False

DEBUG_LOGS = os.getenv("DEBUG_LOGS", "false").lower() == "true"


def debug_print(*args, **kwargs):
    if DEBUG_LOGS:
        print(*args, **kwargs)


def load_cors_origins() -> List[str]:
    raw = os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:5175,http://127.0.0.1:5175",
    )
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:5173", "http://localhost:5174"]

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

def serialize_landmark_series(time_series_landmarks):
    return [
        [
            lm.model_dump() if hasattr(lm, "model_dump") else lm
            for lm in frame
        ]
        for frame in time_series_landmarks
    ]

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


def build_basic_issues(metrics: Optional[Dict[str, float]]) -> List[Dict[str, Any]]:
    issues: List[Dict[str, Any]] = []
    if not metrics:
        return issues

    if metrics.get('shoulderAngle', 0) and abs(metrics['shoulderAngle']) > config.POSTURE_THRESHOLDS['uneven_shoulders']['mild']:
        issues.append({
            'id': 'shoulder_imbalance',
            'type': 'alignment',
            'severity': 'moderate' if abs(metrics['shoulderAngle']) > config.POSTURE_THRESHOLDS['uneven_shoulders']['moderate'] else 'mild',
            'title': 'Shoulder Imbalance',
            'description': f'Shoulder height difference is about {abs(metrics["shoulderAngle"]):.1f} degrees.',
            'recommendation': 'Maintain neutral posture and avoid one-sided load for long periods.'
        })

    if metrics.get('headDeviation', 0) and abs(metrics['headDeviation']) > config.POSTURE_THRESHOLDS['midline_shift']['moderate']:
        issues.append({
            'id': 'head_deviation',
            'type': 'alignment',
            'severity': 'moderate',
            'title': 'Head Deviation',
            'description': f'Head shift relative to body midline is about {abs(metrics["headDeviation"]):.1f} cm.',
            'recommendation': 'Keep your head centered and reduce prolonged side-lean posture.'
        })

    if metrics.get('headForward', 0) and metrics['headForward'] > config.POSTURE_THRESHOLDS['head_forward']['moderate']:
        issues.append({
            'id': 'head_forward',
            'type': 'forward_head',
            'severity': 'moderate' if metrics['headForward'] > config.POSTURE_THRESHOLDS['head_forward']['severe'] else 'mild',
            'title': 'Forward Head',
            'description': f'Forward head distance is about {metrics["headForward"]:.1f} cm.',
            'recommendation': 'Adjust monitor height and maintain a neutral head position.'
        })

    return issues


async def build_posture_base_payload(
    frames: List[Any],
    provided_auxiliary_diagnosis: Optional[str] = None
):
    auxiliary_diagnosis = provided_auxiliary_diagnosis or ""
    if not frames:
        return auxiliary_diagnosis or "> Warning: no captured frame data. Please retry capture.", [], None, []

    if not auxiliary_diagnosis:
        narrations = []
        for frame in frames:
            try:
                res = await run_in_threadpool(
                    process_time_series,
                    frame.view,
                    serialize_landmark_series(frame.timeSeriesLandmarks)
                )
                if res.get("narration"):
                    narrations.append(f"### {frame.view} 瑙嗚鍒嗘瀽\n\n{res['narration']}")
            except Exception as e:
                debug_print(f"[ERROR] Failed to process frame {frame.view}: {e}", flush=True)

        auxiliary_diagnosis = "\n\n---\n\n".join(narrations) if narrations else "Basic analysis completed with no obvious abnormal findings."

    time_series: List[Dict[str, Any]] = []
    try:
        time_series = await run_in_threadpool(build_time_series, frames)
        debug_print(f"[DEBUG] Built time series with {len(time_series)} entries", flush=True)
    except Exception as e:
        debug_print(f"Error building time series: {e}", flush=True)

    metrics = None
    if time_series:
        try:
            metrics = compute_averages(time_series)
            debug_print(f"[DEBUG] Computed averages: {metrics}", flush=True)
        except Exception as e:
            debug_print(f"Error computing metrics: {e}", flush=True)

    issues = build_basic_issues(metrics)
    debug_print(f"[DEBUG] Generated {len(issues)} basic issues", flush=True)
    return auxiliary_diagnosis, time_series, metrics, issues

# --- Video Stream ---

def gen_frames():
    camera_manager.start()
    try:
        while True:
            frame = camera_manager.get_video_frame()
            if frame is None:
                time.sleep(0.01)
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
    allow_origins=load_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WebSocket ---

@app.websocket("/ws/analyze")
async def websocket_endpoint(websocket: WebSocket):
    debug_print("WebSocket connection attempt...", flush=True)
    await websocket.accept()
    debug_print("WebSocket connection established", flush=True)
    try:
        while True:
            # Add timeout to prevent blocking forever if client is silent
            # But client sends data, so let's just read
            data = await websocket.receive_text()
            debug_print(f"[DEBUG] Received WebSocket message: {data[:200]}...", flush=True)
            debug_print(f"Received raw data len: {len(data)}", flush=True)
            
            try:
                message = json.loads(data)
            except json.JSONDecodeError as e:
                debug_print(f"JSON Decode Error: {e}", flush=True)
                continue
            
            msg_type = message.get("type")
            debug_print(f"Message type: {msg_type}", flush=True)

            if msg_type == "POSTURE_SYNC":
                debug_print("Processing POSTURE_SYNC...", flush=True)
                try:
                    # Validate and parse using Pydantic
                    request = AnalysisRequest(**message)
                    debug_print(f"Pydantic validation success for POSTURE_SYNC", flush=True)
                    
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
                        sum_x = [0.0] * num_lms
                        sum_y = [0.0] * num_lms
                        sum_z = [0.0] * num_lms

                        for frame_landmarks in request.timeSeriesLandmarks:
                            for i, landmark in enumerate(frame_landmarks):
                                sum_x[i] += landmark.x
                                sum_y[i] += landmark.y
                                sum_z[i] += landmark.z or 0.0

                        inv_num_frames = 1.0 / num_frames
                        avg_landmarks = [
                            Landmark(
                                x=sum_x[i] * inv_num_frames,
                                y=sum_y[i] * inv_num_frames,
                                z=sum_z[i] * inv_num_frames,
                            )
                            for i in range(num_lms)
                        ]
                    
                    debug_print(f"Calculated average landmarks for {num_frames} frames", flush=True)

                    # Perform analysis on averaged landmarks
                    result = await run_in_threadpool(
                        analyze_posture,
                        view=request.view,
                        landmarks=avg_landmarks,
                        width=request.width,
                        height=request.height
                    )
                    # result['metrics'] is a Pydantic model, use model_dump() to get dict
                    debug_print(f"Analysis complete. Metrics: {result['metrics']}", flush=True)
                    
                    # Construct response
                    response = AnalysisResponse(
                        metrics=result["metrics"],
                        issues=result["issues"],
                        annotations=result.get("annotations", [])
                    )
                    
                    # Send back the results
                    resp_json = response.model_dump_json()
                    await websocket.send_text(resp_json)
                    debug_print(f"Sent POSTURE_SYNC response len: {len(resp_json)}", flush=True)
                except Exception as e:
                    debug_print(f"Error processing POSTURE_SYNC: {e}", flush=True)
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
                    debug_print(f"Error processing JOINT_ANALYSIS: {e}")
            
            elif message.get("type") == "POSTURE_BATCH_ANALYSIS":
                try:
                    # Validate and parse using Pydantic
                    request = TemporalAnalysisRequest(**message)
                    debug_print(f"Received batch analysis for view: {request.view}")
                    
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
                    debug_print(f"Error processing POSTURE_BATCH_ANALYSIS: {e}")

            elif message.get("type") == "POSTURE_STEPPED_ANALYSIS":
                try:
                    debug_print(f"[DEBUG] Received POSTURE_STEPPED_ANALYSIS message", flush=True)
                    request = SteppedAnalysisRequest(**message)
                    frames = request.frames
                    assessment_type = request.assessmentType or "standard"
                    debug_print(f"[DEBUG] Number of frames: {len(frames)}, Assessment type: {assessment_type}", flush=True)
                    
                    # Generate auxiliary diagnosis (basic report) without LLM
                    auxiliary_diagnosis = ""
                    if request.mock:
                        auxiliary_diagnosis = "### [MOCK] Basic assessment report\n\n- Stability: Good\n- Posture: Normal\n\nThis is a mock report for testing."
                        debug_print("Generated MOCK auxiliary diagnosis", flush=True)
                    elif len(frames) == 0:
                        auxiliary_diagnosis = "> Warning: no captured frame data. Please retry capture."
                        debug_print("[DEBUG] No frames received", flush=True)
                    else:
                        debug_print(f"Received stepped analysis for {len(frames)} views")
                        debug_print(f"[DEBUG] Frame details: {[f'view={f.view}, landmarks={len(f.timeSeriesLandmarks)}' for f in frames]}", flush=True)

                    (
                        auxiliary_diagnosis,
                        time_series,
                        metrics,
                        issues,
                    ) = await build_posture_base_payload(frames, auxiliary_diagnosis)
                    
                    markdown_content = auxiliary_diagnosis or ""

                    report_response = PostureReportResponse(
                        markdown=markdown_content,
                        reportId=str(uuid.uuid4()),
                        timeSeries=time_series,
                        metrics=metrics or {},
                        auxiliaryDiagnosis=auxiliary_diagnosis,
                        issues=issues or [],
                        assessmentType=assessment_type
                    )
                    
                    debug_print(f"--- SENDING POSTURE_REPORT ---", flush=True)
                    debug_print(f"Markdown length: {len(markdown_content)}", flush=True)
                    debug_print(f"Content snippet: {markdown_content[:100]}...", flush=True)
                    
                    await websocket.send_text(report_response.model_dump_json())
                    debug_print("POSTURE_REPORT sent successfully", flush=True)
                except Exception as e:
                    debug_print(f"Error processing POSTURE_STEPPED_ANALYSIS: {e}")
                    import traceback
                    traceback.print_exc()
            
            elif msg_type == "POSTURE_DEEP_ANALYSIS":
                # Handle deep analysis request with streaming LLM output
                try:
                    debug_print(f"[POSTURE_DEEP_ANALYSIS] Received deep analysis request", flush=True)
                    request = SteppedAnalysisRequest(
                        type="POSTURE_STEPPED_ANALYSIS",
                        frames=message.get("frames", []),
                        assessmentType=message.get("assessmentType", "quick"),
                        requestId=message.get("requestId")
                    )
                    
                    # Send ACK immediately
                    ack_payload = {"type": "POSTURE_ACK", "status": "processing"}
                    if request.requestId:
                        ack_payload["requestId"] = request.requestId
                    await websocket.send_text(json.dumps(ack_payload))
                    debug_print(f"[POSTURE_DEEP_ANALYSIS] Sent POSTURE_ACK", flush=True)
                    
                    # Generate LLM deep report (STREAMING MODE)
                    markdown_content = ""
                    auxiliary_diagnosis = message.get("auxiliaryDiagnosis") or ""
                    (
                        auxiliary_diagnosis,
                        time_series,
                        metrics,
                        issues,
                    ) = await build_posture_base_payload(request.frames, auxiliary_diagnosis)
                    try:
                        debug_print(f"[POSTURE_DEEP_ANALYSIS] Generating LLM report (streaming)...", flush=True)
                        debug_print(f"[POSTURE_DEEP_ANALYSIS] Calling generate_final_report_stream...", flush=True)

                        posture_agent.clear()
                        for frame in request.frames:
                            res = await run_in_threadpool(
                                process_time_series,
                                frame.view,
                                serialize_landmark_series(frame.timeSeriesLandmarks)
                            )
                            posture_agent.analyze_view(res["narration"], res["stats"])

                        # Stream the report
                        async for chunk in posture_agent.generate_final_report_stream(request.assessmentType, websocket):
                            markdown_content = chunk  # Keep the last chunk (full content)
                        
                        debug_print(f"[POSTURE_DEEP_ANALYSIS] Stream completed. Final content: {len(markdown_content)} chars", flush=True)
                        
                    except Exception as llm_error:
                        debug_print(f"[POSTURE_DEEP_ANALYSIS] LLM stream failed: {llm_error}", flush=True)
                        import traceback
                        traceback.print_exc()
                        markdown_content = f"API call failed: {str(llm_error)}"
                    
                    # Send final complete message
                    deep_report = PostureReportResponse(
                        markdown=markdown_content,
                        reportId=str(uuid.uuid4()),
                        timeSeries=time_series,
                        metrics=metrics or {},
                        auxiliaryDiagnosis=auxiliary_diagnosis,
                        issues=issues,
                        assessmentType=request.assessmentType,
                        isDeepReport=True
                    )
                    await websocket.send_text(deep_report.model_dump_json())
                    debug_print(f"[POSTURE_DEEP_ANALYSIS] Deep report completion sent", flush=True)
                    
                except Exception as e:
                    debug_print(f"[POSTURE_DEEP_ANALYSIS] Error: {e}", flush=True)
                    import traceback
                    traceback.print_exc()
                    error_response = PostureReportResponse(
                        markdown=f"Failed to generate deep report: {str(e)}",
                        reportId=str(uuid.uuid4()),
                        auxiliaryDiagnosis="",
                        assessmentType=message.get("assessmentType", "quick"),
                        isDeepReport=True
                    )
                    await websocket.send_text(error_response.model_dump_json())
                
    except WebSocketDisconnect:
        debug_print("WebSocket disconnected")
    except Exception as e:
        debug_print(f"WebSocket error: {e}")
        await websocket.close()

# --- HTTP Routes ---

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "services": {
            "llm_key_configured": bool(os.getenv("DEEPSEEK_API_KEY")),
            "medvoice_integrated": medvoice_integrated,
        },
    }


@app.post("/api/treatment-plan/generate")
async def generate_plan(request: TreatmentPlanRequest) -> TreatmentPlanResponse:
    """Generate a treatment plan."""
    try:
        ensure_treatment_plan_config()
        assessment_data = await get_assessment_data(request.assessmentId)
        content = await generate_treatment_plan(assessment_data)
        return TreatmentPlanResponse(
            patientId=request.patientId,
            assessmentId=request.assessmentId,
            content=content,
            createdBy=request.createdBy,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
    except TreatmentPlanConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except AssessmentDataUnavailableError as e:
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate treatment plan: {str(e)}")


@app.post("/api/treatment-plan/generate/stream")
async def generate_plan_stream(request: TreatmentPlanRequest):
    """Generate a treatment plan with streaming output."""
    assessment_data = None
    try:
        ensure_treatment_plan_config()
        assessment_data = await get_assessment_data(request.assessmentId)
    except TreatmentPlanConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except AssessmentDataUnavailableError as e:
        raise HTTPException(status_code=501, detail=str(e))

    async def stream_response():
        try:
            async for chunk in generate_treatment_plan_stream(assessment_data):
                yield chunk
        except Exception as e:
            yield f"Failed to generate treatment plan: {str(e)}"

    return StreamingResponse(stream_response(), media_type="text/plain")


@app.post("/api/treatment-plan/generate-from-session-report")
async def generate_plan_from_session_report(request: SessionTreatmentPlanRequest) -> TreatmentPlanResponse:
    """Generate a treatment plan from a session-level comprehensive report."""
    try:
        ensure_treatment_plan_config()
        content = await generate_treatment_plan_from_session_report(request.model_dump())
        return TreatmentPlanResponse(
            patientId=request.patientId,
            sessionId=request.sessionId,
            sessionReportId=request.sessionReportId,
            content=content,
            createdBy=request.createdBy,
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
        )
    except TreatmentPlanConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate treatment plan from session report: {str(e)}")


@app.post("/api/treatment-plan/generate-from-session-report/stream")
async def generate_plan_stream_from_session_report(request: SessionTreatmentPlanRequest):
    """Generate a treatment plan from a session-level comprehensive report with streaming output."""
    try:
        ensure_treatment_plan_config()
    except TreatmentPlanConfigError as e:
        raise HTTPException(status_code=503, detail=str(e))

    async def stream_response():
        try:
            async for chunk in generate_treatment_plan_stream_from_session_report(request.model_dump()):
                yield chunk
        except Exception as e:
            yield f"Failed to generate treatment plan from session report: {str(e)}"

    return StreamingResponse(stream_response(), media_type="text/plain")


@app.post("/api/session-report/generate")
async def generate_session_level_report(request: SessionReportRequest) -> SessionReportResponse:
    """Generate a session-level comprehensive report from posture / ROM / voice inputs."""
    try:
        return await run_in_threadpool(generate_session_report, request)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate session report: {str(e)}")

# Integration with MedVoice AI
try:
    medvoice_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Deeprehab-MedVoice-AI--", "src")
    if os.path.exists(medvoice_path):
        sys.path.append(medvoice_path)
        from api_server import app as medvoice_app
        app.mount("/medvoice", medvoice_app)
        medvoice_integrated = True
        debug_print("MedVoice AI modules integrated at /medvoice")
except Exception as e:
    debug_print(f"MedVoice AI integration failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

