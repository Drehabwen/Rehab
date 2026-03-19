from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from typing import List, Dict, Any, Optional
from datetime import datetime
import statistics
import time
import math
import uvicorn
import os
import sys
import json

# 加载环境变量
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

possible_env_paths = [
    os.path.join(current_dir, '.env'),
    os.path.join(project_root, '.env'),
]

for dotenv_path in possible_env_paths:
    if os.path.exists(dotenv_path):
        from dotenv import load_dotenv
        load_dotenv(dotenv_path)
        break

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
from utils.posture_analysis import analyze_posture, LANDMARKS
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

app = FastAPI(
    title="Vision3 AI Backend",
    description="Python backend for Vision3 Posture Analysis",
    version="1.0.0"
)

# Initialize Camera Manager
camera_manager = CameraManager()
medvoice_integrated = False

DEBUG_LOGS = os.getenv("DEBUG_LOGS", "false").lower() == "true"
STRICT_RBAC = os.getenv("STRICT_RBAC", "false").lower() == "true"

ROLE_PERMISSIONS: Dict[str, set[str]] = {
    "manager": {
        "settings.read.org",
        "system.read",
        "plan.publish.team",
        "report.create.team",
        "case.read",
        "case.approve",
        "report.publish",
        "report.export",
    },
    "operator": {
        "system.read",
        "assessment.create.team",
        "assessment.submit.team",
        "record.use",
        "structure.use",
        "case.read",
        "case.write",
        "case.submit",
    },
}

ROLE_ALIASES: Dict[str, str] = {
    "super_head_coach": "manager",
    "head_coach": "manager",
    "assistant_medic": "operator",
    "athlete_readonly": "operator",
}

WS_PERMISSION_MAP: Dict[str, str] = {
    "POSTURE_SYNC": "assessment.create.team",
    "JOINT_ANALYSIS": "assessment.create.team",
    "POSTURE_BATCH_ANALYSIS": "assessment.submit.team",
    "POSTURE_STEPPED_ANALYSIS": "assessment.submit.team",
    "POSTURE_DEEP_ANALYSIS": "report.create.team",
}


def debug_print(*args, **kwargs):
    if DEBUG_LOGS:
        print(*args, **kwargs)


def normalize_role(value: Optional[str]) -> str:
    role = (value or "").strip()
    if role in ROLE_ALIASES:
        role = ROLE_ALIASES[role]
    return role if role in ROLE_PERMISSIONS else ""


def build_auth_context(
    user_id: Optional[str],
    role: Optional[str],
    team_id: Optional[str],
) -> Dict[str, str]:
    normalized_role = normalize_role(role)
    if STRICT_RBAC and (not user_id or not normalized_role or not team_id):
        raise HTTPException(status_code=401, detail="Missing authentication context")
    resolved_user_id = (user_id or "system").strip() or "system"
    resolved_role = normalized_role or "manager"
    resolved_team_id = (team_id or "default-team").strip() or "default-team"
    if resolved_role not in ROLE_PERMISSIONS:
        raise HTTPException(status_code=403, detail="Unsupported role")
    return {
        "user_id": resolved_user_id,
        "role": resolved_role,
        "team_id": resolved_team_id,
    }


def get_http_auth_context(request: Request) -> Dict[str, str]:
    return build_auth_context(
        user_id=request.headers.get("x-user-id"),
        role=request.headers.get("x-user-role"),
        team_id=request.headers.get("x-team-id"),
    )


def get_ws_auth_context(websocket: WebSocket) -> Dict[str, str]:
    return build_auth_context(
        user_id=websocket.query_params.get("userId") or websocket.headers.get("x-user-id"),
        role=websocket.query_params.get("role") or websocket.headers.get("x-user-role"),
        team_id=websocket.query_params.get("teamId") or websocket.headers.get("x-team-id"),
    )


def ensure_permission(
    auth_context: Dict[str, str],
    permission: str,
    scope_strategy: str,
) -> None:
    role = auth_context["role"]
    team_id = auth_context["team_id"]
    if permission not in ROLE_PERMISSIONS.get(role, set()):
        raise HTTPException(status_code=403, detail="Permission denied")
    if scope_strategy == "org_admin_only" and role != "manager":
        raise HTTPException(status_code=403, detail="Org-level permission required")
    if scope_strategy in {"team_from_token", "self_from_token"} and not team_id:
        raise HTTPException(status_code=403, detail="Team scope required")


def write_audit_log(
    auth_context: Dict[str, str],
    action: str,
    target: str,
    success: bool,
) -> None:
    payload = {
        "type": "audit",
        "actorUserId": auth_context["user_id"],
        "actorRole": auth_context["role"],
        "teamId": auth_context["team_id"],
        "action": action,
        "target": target,
        "success": success,
        "timestamp": int(time.time() * 1000),
    }
    print(json.dumps(payload, ensure_ascii=False))


def load_cors_origins() -> List[str]:
    raw = os.getenv(
        "CORS_ALLOW_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    origins = [origin.strip() for origin in raw.split(",") if origin.strip()]
    return origins or ["http://localhost:5173"]

def build_time_series(frames):
    series = []
    # frames is a list of SteppedFrame, each containing timeSeriesLandmarks (List[List[Landmark]])
    for frame in frames:
        base_timestamp = frame.timestamp or int(time.time() * 1000)
        num_frames = len(frame.timeSeriesLandmarks)
        
        # Calculate fatigue metrics for this frame sequence if possible
        jitter_val = 0.0
        stability_val = 1.0
        if num_frames > 1:
            num_lms = len(frame.timeSeriesLandmarks[0])
            major_indices = [
                LANDMARKS["LEFT_SHOULDER"], LANDMARKS["RIGHT_SHOULDER"],
                LANDMARKS["LEFT_HIP"], LANDMARKS["RIGHT_HIP"],
                LANDMARKS["LEFT_EAR"], LANDMARKS["RIGHT_EAR"]
            ]
            jitter_indices = []
            for idx in major_indices:
                xs = [pts[idx].x for pts in frame.timeSeriesLandmarks]
                ys = [pts[idx].y for pts in frame.timeSeriesLandmarks]
                var_x = statistics.variance(xs) if len(xs) > 1 else 0.0
                var_y = statistics.variance(ys) if len(ys) > 1 else 0.0
                jitter_indices.append(math.sqrt(var_x**2 + var_y**2))
            avg_jitter = sum(jitter_indices) / len(jitter_indices)
            normalized_jitter = min(avg_jitter / 0.01, 1.0)
            jitter_val = round(normalized_jitter, 3)
            stability_val = round(1.0 - normalized_jitter, 3)

        for i, landmarks in enumerate(frame.timeSeriesLandmarks):
            analysis = analyze_posture(
                view=frame.view,
                landmarks=landmarks,
                width=frame.width,
                height=frame.height
            )
            metrics = analysis["metrics"].model_dump()
            metrics = {k: v for k, v in metrics.items() if isinstance(v, (int, float))}
            
            # Inject fatigue metrics
            metrics["jitterIndex"] = jitter_val
            metrics["stabilityScore"] = stability_val
            
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
async def video_feed(request: Request):
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "assessment.create.team", "team_from_token")
    return StreamingResponse(gen_frames(), 
                            media_type="multipart/x-mixed-replace; boundary=frame")

@app.post("/camera/start")
async def start_camera(request: Request):
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "assessment.create.team", "team_from_token")
    success = camera_manager.start()
    write_audit_log(auth_context, "camera.start", "camera_manager", bool(success))
    return {"status": "success" if success else "error"}

@app.post("/camera/stop")
async def stop_camera(request: Request):
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "assessment.create.team", "team_from_token")
    camera_manager.stop()
    write_audit_log(auth_context, "camera.stop", "camera_manager", True)
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
        auth_context = get_ws_auth_context(websocket)
    except HTTPException as e:
        await websocket.send_text(json.dumps({"type": "AUTH_ERROR", "detail": e.detail}, ensure_ascii=False))
        await websocket.close(code=1008)
        return
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
            required_permission = WS_PERMISSION_MAP.get(msg_type)
            if required_permission:
                try:
                    ensure_permission(auth_context, required_permission, "team_from_token")
                except HTTPException:
                    await websocket.send_text(json.dumps({"type": "AUTH_ERROR", "detail": "Permission denied"}, ensure_ascii=False))
                    continue

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
                        
                        # Calculate Jitter and Stability for Fatigue Detection
                        # We look at the variance of landmarks over the sync window (e.g., 1s)
                        jitter_indices = []
                        for i in range(num_lms):
                            # Variance of x and y for each landmark
                            xs = [f[i].x for f in request.timeSeriesLandmarks]
                            ys = [f[i].y for f in request.timeSeriesLandmarks]
                            var_x = statistics.variance(xs) if len(xs) > 1 else 0.0
                            var_y = statistics.variance(ys) if len(ys) > 1 else 0.0
                            jitter_indices.append(math.sqrt(var_x**2 + var_y**2))
                        
                        # Overall jitter is the average jitter of major joints (shoulders, hips, ears)
                        major_indices = [
                            LANDMARKS["LEFT_SHOULDER"], LANDMARKS["RIGHT_SHOULDER"],
                            LANDMARKS["LEFT_HIP"], LANDMARKS["RIGHT_HIP"],
                            LANDMARKS["LEFT_EAR"], LANDMARKS["RIGHT_EAR"]
                        ]
                        avg_jitter = sum(jitter_indices[i] for i in major_indices) / len(major_indices)
                        
                        # Perform analysis on averaged landmarks
                        result = await run_in_threadpool(
                            analyze_posture,
                            view=request.view,
                            landmarks=avg_landmarks,
                            width=request.width,
                            height=request.height
                        )
                        
                        # Update fatigue metrics in the result
                        # Normalize jitter: 0.005 is a typical jitter threshold for fatigue
                        normalized_jitter = min(avg_jitter / 0.01, 1.0)
                        result["metrics"].jitterIndex = round(normalized_jitter, 3)
                        # Stability score: 1.0 - normalized jitter (simplified)
                        result["metrics"].stabilityScore = round(1.0 - normalized_jitter, 3)
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
async def health_check(request: Request):
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "settings.read.org", "org_admin_only")
    write_audit_log(auth_context, "health.read", "system.health", True)
    return {
        "status": "healthy",
        "services": {
            "llm_key_configured": bool(os.getenv("DEEPSEEK_API_KEY")),
            "medvoice_integrated": medvoice_integrated,
        },
    }


@app.post("/api/treatment-plan/generate")
async def generate_plan(request: Request, payload: TreatmentPlanRequest) -> TreatmentPlanResponse:
    """Generate a treatment plan."""
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "plan.publish.team", "team_from_token")
    try:
        ensure_treatment_plan_config()
        assessment_data = await get_assessment_data(payload.assessmentId)
        content = await generate_treatment_plan(assessment_data)
        response = TreatmentPlanResponse(
            patientId=payload.patientId,
            assessmentId=payload.assessmentId,
            content=content,
            createdBy=payload.createdBy,
            createdAt=datetime.now(),
            updatedAt=datetime.now()
        )
        write_audit_log(auth_context, "treatment_plan.generate", payload.assessmentId, True)
        return response
    except TreatmentPlanConfigError as e:
        write_audit_log(auth_context, "treatment_plan.generate", payload.assessmentId, False)
        raise HTTPException(status_code=503, detail=str(e))
    except AssessmentDataUnavailableError as e:
        write_audit_log(auth_context, "treatment_plan.generate", payload.assessmentId, False)
        raise HTTPException(status_code=501, detail=str(e))
    except Exception as e:
        write_audit_log(auth_context, "treatment_plan.generate", payload.assessmentId, False)
        raise HTTPException(status_code=500, detail=f"Failed to generate treatment plan: {str(e)}")


@app.post("/api/treatment-plan/generate/stream")
async def generate_plan_stream(request: Request, payload: TreatmentPlanRequest):
    """Generate a treatment plan with streaming output."""
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "plan.publish.team", "team_from_token")
    assessment_data = None
    try:
        ensure_treatment_plan_config()
        assessment_data = await get_assessment_data(payload.assessmentId)
    except TreatmentPlanConfigError as e:
        write_audit_log(auth_context, "treatment_plan.generate_stream", payload.assessmentId, False)
        raise HTTPException(status_code=503, detail=str(e))
    except AssessmentDataUnavailableError as e:
        write_audit_log(auth_context, "treatment_plan.generate_stream", payload.assessmentId, False)
        raise HTTPException(status_code=501, detail=str(e))

    async def stream_response():
        try:
            async for chunk in generate_treatment_plan_stream(assessment_data):
                yield chunk
            write_audit_log(auth_context, "treatment_plan.generate_stream", payload.assessmentId, True)
        except Exception as e:
            write_audit_log(auth_context, "treatment_plan.generate_stream", payload.assessmentId, False)
            yield f"Failed to generate treatment plan: {str(e)}"

    return StreamingResponse(stream_response(), media_type="text/plain")


@app.post("/api/treatment-plan/generate-from-session-report")
async def generate_plan_from_session_report(request: Request, payload: SessionTreatmentPlanRequest) -> TreatmentPlanResponse:
    """Generate a treatment plan from a session-level comprehensive report."""
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "plan.publish.team", "team_from_token")
    try:
        ensure_treatment_plan_config()
        content = await generate_treatment_plan_from_session_report(payload.model_dump())
        response = TreatmentPlanResponse(
            patientId=payload.patientId,
            sessionId=payload.sessionId,
            sessionReportId=payload.sessionReportId,
            content=content,
            createdBy=payload.createdBy,
            createdAt=datetime.now(),
            updatedAt=datetime.now(),
        )
        write_audit_log(auth_context, "treatment_plan.generate_from_session_report", payload.sessionReportId, True)
        return response
    except TreatmentPlanConfigError as e:
        write_audit_log(auth_context, "treatment_plan.generate_from_session_report", payload.sessionReportId, False)
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        write_audit_log(auth_context, "treatment_plan.generate_from_session_report", payload.sessionReportId, False)
        raise HTTPException(status_code=500, detail=f"Failed to generate treatment plan from session report: {str(e)}")


@app.post("/api/treatment-plan/generate-from-session-report/stream")
async def generate_plan_stream_from_session_report(request: Request, payload: SessionTreatmentPlanRequest):
    """Generate a treatment plan from a session-level comprehensive report with streaming output."""
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "plan.publish.team", "team_from_token")
    try:
        ensure_treatment_plan_config()
    except TreatmentPlanConfigError as e:
        write_audit_log(auth_context, "treatment_plan.generate_from_session_report_stream", payload.sessionReportId, False)
        raise HTTPException(status_code=503, detail=str(e))

    async def stream_response():
        try:
            async for chunk in generate_treatment_plan_stream_from_session_report(payload.model_dump()):
                yield chunk
            write_audit_log(auth_context, "treatment_plan.generate_from_session_report_stream", payload.sessionReportId, True)
        except Exception as e:
            write_audit_log(auth_context, "treatment_plan.generate_from_session_report_stream", payload.sessionReportId, False)
            yield f"Failed to generate treatment plan from session report: {str(e)}"

    return StreamingResponse(stream_response(), media_type="text/plain")


@app.post("/api/session-report/generate")
async def generate_session_level_report(request: Request, payload: SessionReportRequest) -> SessionReportResponse:
    """Generate a session-level comprehensive report from posture / ROM / voice inputs."""
    auth_context = get_http_auth_context(request)
    ensure_permission(auth_context, "report.create.team", "team_from_token")
    try:
        response = await run_in_threadpool(generate_session_report, payload)
        write_audit_log(auth_context, "session_report.generate", payload.sessionId, True)
        return response
    except Exception as e:
        write_audit_log(auth_context, "session_report.generate", payload.sessionId, False)
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
    # Use port from config to avoid conflicts with zombie processes on 8000
    uvicorn.run(app, host="0.0.0.0", port=8002)
