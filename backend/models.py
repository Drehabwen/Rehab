from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class Landmark(BaseModel):
    x: float
    y: float
    z: Optional[float] = 0.0
    visibility: Optional[float] = 1.0

class AnalysisRequest(BaseModel):
    type: str = Field(..., description="Message type, e.g., 'POSTURE_SYNC'")
    view: str = Field(..., description="Camera view: 'front', 'back', or 'side'")
    width: int
    height: int
    landmarks: List[Landmark]

class PostureIssue(BaseModel):
    id: str
    type: str
    severity: str  # 'mild', 'moderate', 'severe'
    title: str
    description: str
    recommendation: str
    points: Optional[List[Dict[str, float]]] = None

class PostureMetrics(BaseModel):
    shoulderAngle: Optional[float] = None
    hipAngle: Optional[float] = None
    headDeviation: Optional[float] = None
    headForward: Optional[float] = None
    shoulderRounded: Optional[float] = None
    headPitch: Optional[float] = None
    headYaw: Optional[float] = None
    headRoll: Optional[float] = None
    head_axes: Optional[List[Dict[str, float]]] = None  # Added for head pose visualization

class JointMeasurementRequest(BaseModel):
    id: str
    jointType: str
    direction: str
    side: Optional[str] = None

class JointAnalysisRequest(BaseModel):
    type: str = Field(..., description="Message type, e.g., 'JOINT_ANALYSIS'")
    width: int
    height: int
    landmarks: List[Landmark]
    worldLandmarks: Optional[List[Landmark]] = None
    measurements: List[JointMeasurementRequest]

class JointMeasurementResult(BaseModel):
    id: str
    angle: Optional[float] = None

class JointAnalysisResponse(BaseModel):
    type: str = "JOINT_RESULT"
    results: List[JointMeasurementResult]
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))

class VisualAnnotation(BaseModel):
    type: str  # 'line', 'point', 'angle', 'text'
    points: List[Dict[str, float]]
    color: str = "red"
    label: Optional[str] = None
    dashed: bool = False
    dash: Optional[List[int]] = None # Added to support custom dash patterns
    lineWidth: int = 2

class AnalysisResponse(BaseModel):
    type: str = "ANALYSIS_RESULT"
    metrics: PostureMetrics
    issues: List[PostureIssue]
    annotations: List[VisualAnnotation] = []
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
