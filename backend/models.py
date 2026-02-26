from pydantic import BaseModel, Field, ConfigDict
from typing import List, Dict, Any, Optional
from datetime import datetime

class Landmark(BaseModel):
    x: float
    y: float
    z: Optional[float] = 0.0
    visibility: Optional[float] = 1.0

class SteppedFrame(BaseModel):
    view: str
    width: int
    height: int
    timeSeriesLandmarks: List[List[Landmark]]
    image: Optional[str] = None
    timestamp: Optional[int] = None

class AnalysisRequest(BaseModel):
    type: str = Field(..., description="Message type, e.g., 'POSTURE_SYNC'")
    view: str = Field(..., description="Camera view: 'front', 'back', or 'side'")
    width: int
    height: int
    timeSeriesLandmarks: List[List[Landmark]]
    image: Optional[str] = Field(None, description="Base64 encoded image data for snapshot analysis")

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
    swayOffset: Optional[float] = None  # Added for stability tracking

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

class TemporalStability(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    swayArea: float
    maxDeviation: float
    sd: float = Field(..., alias="sd") # Map sd from frontend to sd in backend
    velocity: float

class TemporalAnalysisRequest(BaseModel):
    type: str = "POSTURE_BATCH_ANALYSIS"
    view: str
    duration: Optional[float] = None
    frameCount: Optional[int] = None
    averages: Optional[Dict[str, Any]] = None
    stability: Optional[TemporalStability] = None
    timeSeries: Optional[List[Dict[str, Any]]] = None
    frames: Optional[List[SteppedFrame]] = None # Added for batch processing from frames

class SteppedAnalysisRequest(BaseModel):
    type: str = "POSTURE_STEPPED_ANALYSIS"
    frames: List[SteppedFrame]
    mock: bool = False

class PostureReportResponse(BaseModel):
    type: str = "POSTURE_REPORT"
    markdown: str
    reportId: str
    timeSeries: Optional[List[Dict[str, Any]]] = None
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
