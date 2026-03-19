import os
import sys

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from models import SessionReportReadiness, SessionReportRequest, SessionReportSectionInput
from utils import session_reporter

def build_fatigue_request():
    return SessionReportRequest(
        sessionId="session-fatigue-1",
        patientId="athlete-1",
        patientName="张三",
        sourceAssessmentIds=["posture-1", "voice-1"],
        readiness=SessionReportReadiness(
            readyCount=3,
            partialCount=0,
            missingTypes=["rom"],
            availableTypes=["posture", "medvoice", "fatigue"],
        ),
        posture=SessionReportSectionInput(
            title="体态评估",
            status="ready",
            preview="圆肩，躯干稳定性良好。",
            evidenceCount=2,
        ),
        medvoice=SessionReportSectionInput(
            title="语音病历",
            status="ready",
            preview="RPE 8, 感觉大腿非常酸痛，动作开始变形。",
            evidenceCount=3,
        ),
        fatigue=SessionReportSectionInput(
            title="运动疲劳/稳定性",
            status="ready",
            preview="稳定性得分: 65% | 抖动指数: 0.045",
            evidenceCount=2,
        ),
    )

def test_fatigue_prompt_contains_metrics():
    request = build_fatigue_request()
    prompt = session_reporter._build_session_report_prompt(request)
    
    assert "运动疲劳" in prompt
    assert "动作稳定性" in prompt
    assert "jitterIndex" in prompt
    assert "stabilityScore" in prompt
    assert "RPE" in prompt
    assert "稳定性得分: 65%" in prompt
    assert "抖动指数: 0.045" in prompt

def test_fallback_report_contains_fatigue():
    request = build_fatigue_request()
    fallback = session_reporter._build_fallback_markdown(request)
    
    assert "## 输入状态" in fallback
    assert "疲劳监测：ready" in fallback

if __name__ == "__main__":
    test_fatigue_prompt_contains_metrics()
    test_fallback_report_contains_fatigue()
    print("Fatigue integration tests passed!")
