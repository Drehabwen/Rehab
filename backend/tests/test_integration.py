import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from main import app, build_time_series, compute_averages, compute_stability
from models import (
    AnalysisRequest,
    AnalysisResponse,
    Landmark,
    PostureMetrics,
    PostureReportResponse,
    SteppedFrame,
    TemporalAnalysisRequest,
)
from utils.joint_analysis import calculate_joint_angle
from utils.posture_analysis import analyze_posture


def make_landmarks(count: int = 33):
    return [
        Landmark(x=0.5 + i * 0.001, y=0.5 + i * 0.002, z=0.5, visibility=0.9)
        for i in range(count)
    ]


def make_time_series_landmarks(frame_count: int = 1):
    return [make_landmarks() for _ in range(frame_count)]


def make_stepped_frame(view: str = "front", timestamp: int = 1000, frame_count: int = 10):
    return SteppedFrame(
        view=view,
        width=640,
        height=480,
        timeSeriesLandmarks=make_time_series_landmarks(frame_count),
        timestamp=timestamp,
    )


class TestAnalysisEndpoints:
    @pytest_asyncio.fixture(scope="function")
    async def client(self):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            yield ac

    @pytest.mark.asyncio
    async def test_health_check(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "healthy"


class TestTimeSeriesProcessing:
    def test_build_time_series(self):
        frames = [make_stepped_frame(frame_count=10, timestamp=1450)]

        series = build_time_series(frames)

        assert len(series) == 10
        assert all("timestamp" in item for item in series)
        assert all("view" in item for item in series)
        assert all(item["view"] == "front" for item in series)

        timestamps = [item["timestamp"] for item in series]
        assert timestamps == sorted(timestamps)
        assert series[0]["timestamp"] == 1450 - (9 * 33)
        assert series[-1]["timestamp"] == 1450

    def test_build_time_series_empty(self):
        assert build_time_series([]) == []

    def test_compute_averages(self):
        series = [
            {"timestamp": 1000, "view": "front", "swayOffset": 10.0, "shoulderAngle": 0.5},
            {"timestamp": 1050, "view": "front", "swayOffset": 12.0, "shoulderAngle": 0.6},
            {"timestamp": 1100, "view": "front", "swayOffset": 8.0, "shoulderAngle": 0.4},
        ]

        averages = compute_averages(series)

        assert averages["swayOffset"] == pytest.approx(10.0, rel=1e-2)
        assert averages["shoulderAngle"] == pytest.approx(0.5, rel=1e-2)

    def test_compute_averages_empty(self):
        assert compute_averages([]) == {}

    def test_compute_stability(self):
        series = [
            {"timestamp": 1000, "view": "front", "swayOffset": 10.0},
            {"timestamp": 1050, "view": "front", "swayOffset": 15.0},
            {"timestamp": 1100, "view": "front", "swayOffset": 5.0},
        ]

        stability = compute_stability(series)

        assert stability["swayArea"] > 0
        assert stability["maxDeviation"] > 0
        assert stability["sd"] > 0
        assert stability["velocity"] > 0

    def test_compute_stability_empty(self):
        stability = compute_stability([])

        assert stability == {
            "swayArea": 0.0,
            "maxDeviation": 0.0,
            "sd": 0.0,
            "velocity": 0.0,
        }

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
        result = analyze_posture(
            view="front",
            landmarks=make_landmarks(),
            width=640,
            height=480,
        )

        assert "metrics" in result
        assert "issues" in result
        assert isinstance(result["metrics"], PostureMetrics)
        assert isinstance(result["issues"], list)

    def test_analyze_posture_side_view(self):
        result = analyze_posture(
            view="side",
            landmarks=make_landmarks(),
            width=640,
            height=480,
        )

        assert "metrics" in result
        assert "issues" in result

    def test_analyze_posture_insufficient_landmarks(self):
        result = analyze_posture(
            view="front",
            landmarks=make_landmarks(count=2),
            width=640,
            height=480,
        )

        assert "metrics" in result
        assert "issues" in result


class TestJointAnalysis:
    def test_calculate_joint_angle(self):
        angle = calculate_joint_angle(
            joint_type="shoulder",
            direction="flexion",
            landmarks=[lm.model_dump() for lm in make_landmarks()],
            width=640,
            height=480,
            side="left",
        )

        assert isinstance(angle, float)
        assert 0 <= angle <= 180

    def test_calculate_joint_angle_world_landmarks(self):
        world_landmarks = [
            Landmark(x=i * 0.01, y=i * 0.02, z=i * 0.01, visibility=0.9)
            for i in range(33)
        ]

        angle = calculate_joint_angle(
            joint_type="elbow",
            direction="flexion",
            landmarks=[lm.model_dump() for lm in make_landmarks()],
            width=640,
            height=480,
            side="right",
            world_landmarks=[lm.model_dump() for lm in world_landmarks],
        )

        assert isinstance(angle, float)


class TestPydanticModels:
    def test_analysis_request_validation(self):
        request = AnalysisRequest(
            type="POSTURE_SYNC",
            view="front",
            width=640,
            height=480,
            timeSeriesLandmarks=[
                [landmark.model_dump() for landmark in make_landmarks()]
            ],
        )

        assert request.view == "front"
        assert len(request.timeSeriesLandmarks) == 1
        assert len(request.timeSeriesLandmarks[0]) == 33

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
            head_axes=[{"x": 0.5, "y": 0.5}, {"x": 0.6, "y": 0.5}],
        )

        response = AnalysisResponse(metrics=metrics, issues=[])
        assert response.metrics.swayOffset == 10.0
        assert response.metrics.headPitch == 5.0

    def test_temporal_analysis_request(self):
        frames = [make_stepped_frame(frame_count=5, timestamp=1200)]

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
                "velocity": 0.1,
            },
        )

        assert request.view == "front"
        assert request.frames is not None
        assert len(request.frames) == 1
        assert request.stability is not None
        assert request.stability.sd == 0.5

    def test_posture_report_response(self):
        response = PostureReportResponse(
            markdown="# Report",
            reportId="test-id-123",
        )

        assert response.markdown.startswith("#")
        assert response.reportId == "test-id-123"


class TestDataFlowIntegration:
    def test_end_to_end_posture_sync(self):
        request = AnalysisRequest(
            type="POSTURE_SYNC",
            view="front",
            width=640,
            height=480,
            timeSeriesLandmarks=[
                [landmark.model_dump() for landmark in make_landmarks()]
            ],
        )

        result = analyze_posture(
            view=request.view,
            landmarks=request.timeSeriesLandmarks[0],
            width=request.width,
            height=request.height,
        )

        response = AnalysisResponse(metrics=result["metrics"], issues=result["issues"])

        assert response.metrics is not None
        assert isinstance(response.metrics.head_axes, list)
        assert len(response.metrics.head_axes) >= 2

    def test_end_to_end_batch_analysis(self):
        frames = [make_stepped_frame(frame_count=10, timestamp=1300)]
        request = TemporalAnalysisRequest(
            type="POSTURE_BATCH_ANALYSIS",
            view="front",
            frames=frames,
        )

        assert request.frames is not None
        series = build_time_series(request.frames)
        averages = compute_averages(series)
        stability = compute_stability(series)

        assert len(series) == 10
        assert "swayOffset" in averages or len(averages) > 0
        assert stability["sd"] >= 0

    def test_multi_view_batch_analysis(self):
        frames = [
            make_stepped_frame(view="front", timestamp=1000, frame_count=5),
            make_stepped_frame(view="side", timestamp=1200, frame_count=5),
            make_stepped_frame(view="back", timestamp=1400, frame_count=5),
        ]

        request = TemporalAnalysisRequest(
            type="POSTURE_BATCH_ANALYSIS",
            view="front",
            frames=frames,
        )

        assert request.frames is not None
        series = build_time_series(request.frames)

        views = {item["view"] for item in series}
        assert len(series) == 15
        assert views == {"front", "side", "back"}
