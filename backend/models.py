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
    requestId: Optional[str] = None

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
    assessmentType: str = "standard"  # 'standard' or 'quick'
    requestId: Optional[str] = None

class SteppedAnalysisRequest(BaseModel):
    type: str = "POSTURE_STEPPED_ANALYSIS"
    frames: List[SteppedFrame]
    assessmentType: str = "standard"  # 'standard' or 'quick'
    mock: bool = False
    requestId: Optional[str] = None

class PostureReportResponse(BaseModel):
    type: str = "POSTURE_REPORT"
    markdown: str
    reportId: str
    timeSeries: Optional[List[Dict[str, Any]]] = None
    metrics: Dict[str, float] = {}
    auxiliaryDiagnosis: str = ""
    issues: List[Dict[str, Any]] = []
    timestamp: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
    assessmentType: str = "standard"
    isDeepReport: bool = False  # True for LLM deep report, False for basic report


class TreatmentPlanRequest(BaseModel):
    patientId: str
    assessmentId: str
    createdBy: str


class SessionTreatmentPlanRequest(BaseModel):
    patientId: str
    sessionId: str
    sessionReportId: str
    sessionReportMarkdown: str
    insights: List[str] = []
    recommendations: List[str] = []
    createdBy: str


class TreatmentPlanResponse(BaseModel):
    id: Optional[int] = None
    patientId: str
    assessmentId: Optional[str] = None
    sessionId: Optional[str] = None
    sessionReportId: Optional[str] = None
    version: int = 1
    content: str
    isCurrent: bool = True
    createdAt: datetime
    updatedAt: datetime
    createdBy: str


class TreatmentPlanStreamResponse(BaseModel):
    chunk: str
    done: bool = False


class SessionReportSectionInput(BaseModel):
    title: str
    status: str
    preview: Optional[str] = None
    evidenceCount: int = 0


class SessionReportReadiness(BaseModel):
    readyCount: int
    partialCount: int
    missingTypes: List[str] = []
    availableTypes: List[str] = []


class SessionReportRequest(BaseModel):
    sessionId: str
    patientId: str
    patientName: Optional[str] = None
    sourceAssessmentIds: List[str] = []
    readiness: SessionReportReadiness
    posture: Optional[SessionReportSectionInput] = None
    rom: Optional[SessionReportSectionInput] = None
    medvoice: Optional[SessionReportSectionInput] = None


class SessionReportResponse(BaseModel):
    id: str
    sessionId: str
    patientId: str
    markdown: str
    insights: List[str] = []
    recommendations: List[str] = []
    createdAt: int
    sourceAssessmentIds: List[str] = []
