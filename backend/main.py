from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import uvicorn
import os
import sys
import json

# Add current directory to path to allow imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import AnalysisRequest, AnalysisResponse, PostureMetrics, JointAnalysisRequest, JointAnalysisResponse
from utils.posture_analysis import analyze_posture
from utils.joint_analysis import calculate_joint_angle
from utils.camera_stream import CameraManager

app = FastAPI(
    title="Vision3 AI Backend",
    description="Python backend for Vision3 Posture Analysis",
    version="1.0.0"
)

# Initialize Camera Manager
camera_manager = CameraManager()

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
    await websocket.accept()
    print("WebSocket connection established")
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message.get("type") == "POSTURE_SYNC":
                # Validate and parse using Pydantic
                request = AnalysisRequest(**message)
                
                # Perform analysis
                result = analyze_posture(
                    view=request.view,
                    landmarks=[lm.dict() for lm in request.landmarks],
                    width=request.width,
                    height=request.height
                )
                
                # Construct response
                response = AnalysisResponse(
                    metrics=result["metrics"],
                    issues=result["issues"]
                )
                
                # Send back the results
                await websocket.send_text(response.json())
                
            elif message.get("type") == "JOINT_ANALYSIS":
                try:
                    # Validate and parse using Pydantic
                    request = JointAnalysisRequest(**message)
                    
                    results = []
                    # Pre-convert landmarks to dict once for performance
                    landmarks_dict = [lm.dict() for lm in request.landmarks]
                    world_landmarks_dict = [lm.dict() for lm in request.worldLandmarks] if request.worldLandmarks else None
                    
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
                    await websocket.send_text(response.json())
                except Exception as e:
                    print(f"Error processing JOINT_ANALYSIS: {e}")
                
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
        print("MedVoice AI modules found, ready for integration.")
except Exception as e:
    print(f"MedVoice AI integration skipped: {e}")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
