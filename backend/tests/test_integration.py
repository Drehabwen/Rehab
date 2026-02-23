import pytest
import asyncio
import json
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from main import app, build_time_series, compute_averages, compute_stability
from models import (
    AnalysisRequest, AnalysisResponse, PostureMetrics,
    TemporalAnalysisRequest, HTMLReportResponse,
    SteppedAnalysisRequest, SteppedFrame
)
from utils.posture_analysis import analyze_posture
from utils.joint_analysis import calculate_joint_angle


class TestAnalysisEndpoints:
    @pytest_asyncio.fixture(scope="function")
    async def client(self):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_health_check(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestTimeSeriesProcessing:
    def test_build_time_series(self):
        from models import SteppedFrame, Landmark
        
        frames = [
            SteppedFrame(
                view="front",
                landmarks=[
                    Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9)
                    for i in range(33)
                ],
                width=640,
                height=480,
                timestamp=1000 + i * 50
            )
            for i in range(10)
        ]
        
        series = build_time_series(frames)
        
        assert len(series) == 10
        assert all("timestamp" in item for item in series)
        assert all("view" in item for item in series)
        assert all(item["view"] == "front" for item in series)
        
        timestamps = [item["timestamp"] for item in series]
        assert timestamps == sorted(timestamps)
        
        assert series[0]["timestamp"] == 1000
        assert series[-1]["timestamp"] == 1450

    def test_build_time_series_empty(self):
        series = build_time_series([])
        assert series == []

    def test_compute_averages(self):
        series = [
            {"timestamp": 1000, "view": "front", "swayOffset": 10.0, "shoulderAngle": 0.5},
            {"timestamp": 1050, "view": "front", "swayOffset": 12.0, "shoulderAngle": 0.6},
            {"timestamp": 1100, "view": "front", "swayOffset": 8.0, "shoulderAngle": 0.4},
        ]
        
        averages = compute_averages(series)
        
        assert "swayOffset" in averages
        assert "shoulderAngle" in averages
        assert averages["swayOffset"] == pytest.approx(10.0, rel=1e-2)
        assert averages["shoulderAngle"] == pytest.approx(0.5, rel=1e-2)

    def test_compute_averages_empty(self):
        averages = compute_averages([])
        assert averages == {}

    def test_compute_stability(self):
        series = [
            {"timestamp": 1000, "view": "front", "swayOffset": 10.0},
            {"timestamp": 1050, "view": "front", "swayOffset": 15.0},
            {"timestamp": 1100, "view": "front", "swayOffset": 5.0},
        ]
        
        stability = compute_stability(series)
        
        assert "swayArea" in stability
        assert "maxDeviation" in stability
        assert "sd" in stability
        assert "velocity" in stability
        
        assert stability["swayArea"] > 0
        assert stability["maxDeviation"] > 0
        assert stability["sd"] > 0
        assert stability["velocity"] > 0

    def test_compute_stability_empty(self):
        stability = compute_stability([])
        
        assert stability["swayArea"] == 0.0
        assert stability["maxDeviation"] == 0.0
        assert stability["sd"] == 0.0
        assert stability["velocity"] == 0.0

    def test_compute_stability_constant_values(self):
        series = [
            {"timestamp": 1000, "view": "front", "swayOffset": 10.0},
            {"timestamp": 1050, "view": "front", "swayOffset": 10.0},
            {"timestamp": 1100, "view": "front", "swayOffset": 10.0},
        ]
        
        stability = compute_stability(series)
        
        assert stability["swayArea"] == pytest.approx(0.0, abs=1e-5)
        assert stability["maxDeviation"] == pytest.approx(0.0, abs=1e-5)
        assert stability["sd"] == pytest.approx(0.0, abs=1e-5)
        assert stability["velocity"] == pytest.approx(0.0, abs=1e-5)


class TestPostureAnalysis:
    def test_analyze_posture_front_view(self):
        from models import Landmark
        
        landmarks = [
            Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9)
            for i in range(33)
        ]
        
        result = analyze_posture(
            view="front",
            landmarks=landmarks,
            width=640,
            height=480
        )
        
        assert "metrics" in result
        assert "issues" in result
        assert isinstance(result["metrics"], PostureMetrics)
        assert isinstance(result["issues"], list)

    def test_analyze_posture_side_view(self):
        from models import Landmark
        
        landmarks = [
            Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9)
            for i in range(33)
        ]
        
        result = analyze_posture(
            view="side",
            landmarks=landmarks,
            width=640,
            height=480
        )
        
        assert "metrics" in result
        assert "issues" in result

    def test_analyze_posture_insufficient_landmarks(self):
        from models import Landmark
        
        landmarks = [
            Landmark(x=0.5, y=0.5, z=0.5, visibility=0.9),
            Landmark(x=0.55, y=0.55, z=0.55, visibility=0.9)
        ]
        
        result = analyze_posture(
            view="front",
            landmarks=landmarks,
            width=640,
            height=480
        )
        
        assert "metrics" in result
        assert "issues" in result


class TestJointAnalysis:
    def test_calculate_joint_angle(self):
        from models import Landmark
        
        landmarks = [
            Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9)
            for i in range(33)
        ]
        
        angle = calculate_joint_angle(
            joint_type="shoulder",
            direction="flexion",
            landmarks=[lm.model_dump() for lm in landmarks],
            width=640,
            height=480,
            side="left"
        )
        
        assert isinstance(angle, float)
        assert 0 <= angle <= 180

    def test_calculate_joint_angle_world_landmarks(self):
        from models import Landmark
        
        landmarks = [
            Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9)
            for i in range(33)
        ]
        
        world_landmarks = [
            Landmark(x=i * 0.01, y=i * 0.02, z=i * 0.01, visibility=0.9)
            for i in range(33)
        ]
        
        angle = calculate_joint_angle(
            joint_type="elbow",
            direction="flexion",
            landmarks=[lm.model_dump() for lm in landmarks],
            width=640,
            height=480,
            side="right",
            world_landmarks=[lm.model_dump() for lm in world_landmarks]
        )
        
        assert isinstance(angle, float)


class TestPydanticModels:
    def test_analysis_request_validation(self):
        from models import Landmark
        
        data = {
            "type": "POSTURE_SYNC",
            "view": "front",
            "landmarks": [
                Landmark(x=0.5, y=0.5, z=0.5, visibility=0.9).model_dump()
                for _ in range(33)
            ],
            "width": 640,
            "height": 480
        }
        
        request = AnalysisRequest(**data)
        assert request.view == "front"
        assert len(request.landmarks) == 33

    def test_analysis_response_structure(self):
        metrics = PostureMetrics(
            swayOffset=10.0,
            headDeviation=5.0,
            headForward=2.0,
            shoulderAngle=0.5,
            hipAngle=1.2,
            shoulderRounded=0.3,
            headPitch=5.0,
            headYaw=-3.0,
            headRoll=2.0,
            head_axes=[{"x": 0.5, "y": 0.5}, {"x": 0.6, "y": 0.5}]
        )
        
        response = AnalysisResponse(metrics=metrics, issues=[])
        assert response.metrics.swayOffset == 10.0
        assert response.metrics.headPitch == 5.0

    def test_temporal_analysis_request(self):
        from models import Landmark
        
        frames = [
            SteppedFrame(
                view="front",
                landmarks=[
                    Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9)
                    for i in range(33)
                ],
                width=640,
                height=480,
                timestamp=1000 + i * 50
            )
            for i in range(5)
        ]
        
        request = TemporalAnalysisRequest(
            view="front",
            frames=frames,
            duration=5.0,
            frameCount=5,
            averages={"swayOffset": 10.0},
            stability={
                "swayArea": 1.0,
                "maxDeviation": 2.0,
                "sd": 0.5,
                "velocity": 0.1
            }
        )
        
        assert request.view == "front"
        assert len(request.frames) == 5

    def test_html_report_response(self):
        response = HTMLReportResponse(
            html="<html><body>Report</body></html>",
            reportId="test-id-123"
        )
        
        assert response.html.startswith("<html>")
        assert response.reportId == "test-id-123"


class TestDataFlowIntegration:
    def test_end_to_end_posture_sync(self):
        from models import Landmark
        
        request_data = {
            "type": "POSTURE_SYNC",
            "view": "front",
            "landmarks": [
                Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9).model_dump()
                for i in range(33)
            ],
            "width": 640,
            "height": 480
        }
        
        request = AnalysisRequest(**request_data)
        result = analyze_posture(
            view=request.view,
            landmarks=request.landmarks,
            width=request.width,
            height=request.height
        )
        
        response = AnalysisResponse(metrics=result["metrics"], issues=result["issues"])
        
        assert response.metrics is not None
        assert isinstance(response.metrics.head_axes, list)
        assert len(response.metrics.head_axes) >= 2

    def test_end_to_end_batch_analysis(self):
        from models import Landmark
        
        frames = [
            SteppedFrame(
                view="front",
                landmarks=[
                    Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9)
                    for i in range(33)
                ],
                width=640,
                height=480,
                timestamp=1000 + i * 50
            )
            for i in range(10)
        ]
        
        request_data = {
            "type": "POSTURE_BATCH_ANALYSIS",
            "view": "front",
            "frames": [f.model_dump() for f in frames]
        }
        
        request = TemporalAnalysisRequest(**request_data)
        
        series = build_time_series(request.frames)
        averages = compute_averages(series)
        stability = compute_stability(series)
        
        assert len(series) == 10
        assert "swayOffset" in averages or len(averages) > 0
        assert stability["sd"] >= 0

    def test_multi_view_batch_analysis(self):
        from models import Landmark
        
        frames = []
        for view in ["front", "side", "back"]:
            for i in range(5):
                frames.append(SteppedFrame(
                    view=view,
                    landmarks=[
                        Landmark(x=0.5 + j * 0.001, y=0.5 + j * 0.002, z=0.5, visibility=0.9)
                        for j in range(33)
                    ],
                    width=640,
                    height=480,
                    timestamp=1000 + len(frames) * 50
                ))
        
        request_data = {
            "type": "POSTURE_BATCH_ANALYSIS",
            "view": "front",
            "frames": [f.model_dump() for f in frames]
        }
        
        request = TemporalAnalysisRequest(**request_data)
        series = build_time_series(request.frames)
        
        views = set(item["view"] for item in series)
        assert len(views) == 3
        assert "front" in views
        assert "side" in views
        assert "back" in views
