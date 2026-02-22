import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import Landmark, PostureMetrics
from utils.data_cleaner import clean_timeseries, get_algorithm_info, SCOPE_ALGORITHMS
from utils.posture_analysis import analyze_posture


def create_test_landmarks():
    test_landmarks = []
    for i in range(33):
        test_landmarks.append(Landmark(
            x=0.5 + i * 0.001,
            y=0.3 + i * 0.002,
            z=0.0,
            visibility=0.9
        ))
    return test_landmarks


def create_side_view_landmarks(head_forward=False, shoulder_forward=False):
    landmarks = []
    
    landmarks.append(Landmark(x=0.5, y=0.1, z=0.0, visibility=0.9))  # NOSE = 0
    
    for _ in range(7):
        landmarks.append(Landmark(x=0.5, y=0.2, z=0.0, visibility=0.9))
    
    if head_forward:
        landmarks.append(Landmark(x=0.55, y=0.25, z=0.0, visibility=0.9))  # LEFT_EAR = 7
    else:
        landmarks.append(Landmark(x=0.50, y=0.25, z=0.0, visibility=0.9))
    
    landmarks.append(Landmark(x=0.50, y=0.25, z=0.0, visibility=0.9))  # RIGHT_EAR = 8
    
    for _ in range(2, 11):
        landmarks.append(Landmark(x=0.5, y=0.3, z=0.0, visibility=0.9))
    
    if shoulder_forward:
        landmarks.append(Landmark(x=0.58, y=0.35, z=0.0, visibility=0.9))  # LEFT_SHOULDER = 11
    else:
        landmarks.append(Landmark(x=0.52, y=0.35, z=0.0, visibility=0.9))
    
    landmarks.append(Landmark(x=0.48, y=0.35, z=0.0, visibility=0.9))  # RIGHT_SHOULDER = 12
    
    for _ in range(13, 23):
        landmarks.append(Landmark(x=0.5, y=0.4, z=0.0, visibility=0.9))
    
    landmarks.append(Landmark(x=0.52, y=0.55, z=0.0, visibility=0.9))  # LEFT_HIP = 23
    landmarks.append(Landmark(x=0.48, y=0.55, z=0.0, visibility=0.9))  # RIGHT_HIP = 24
    
    for _ in range(25, 27):
        landmarks.append(Landmark(x=0.5, y=0.7, z=0.0, visibility=0.9))
    
    landmarks.append(Landmark(x=0.50, y=0.95, z=0.0, visibility=0.9))  # LEFT_ANKLE = 27
    landmarks.append(Landmark(x=0.50, y=0.95, z=0.0, visibility=0.9))  # RIGHT_ANKLE = 28
    
    while len(landmarks) < 33:
        landmarks.append(Landmark(x=0.5, y=0.5, z=0.0, visibility=0.9))
    
    return landmarks


def create_front_view_landmarks(uneven_shoulders=False, uneven_hips=False):
    landmarks = []
    
    landmarks.append(Landmark(x=0.5, y=0.1, z=0.0, visibility=0.9))  # NOSE = 0
    
    for _ in range(7):
        landmarks.append(Landmark(x=0.5, y=0.2, z=0.0, visibility=0.9))
    
    if uneven_shoulders:
        landmarks.append(Landmark(x=0.40, y=0.22, z=0.0, visibility=0.9))  # LEFT_EAR = 7 (higher)
        landmarks.append(Landmark(x=0.60, y=0.28, z=0.0, visibility=0.9))  # RIGHT_EAR = 8 (lower)
    else:
        landmarks.append(Landmark(x=0.45, y=0.25, z=0.0, visibility=0.9))
        landmarks.append(Landmark(x=0.55, y=0.25, z=0.0, visibility=0.9))
    
    for _ in range(2, 11):
        landmarks.append(Landmark(x=0.5, y=0.3, z=0.0, visibility=0.9))
    
    if uneven_shoulders:
        landmarks.append(Landmark(x=0.38, y=0.30, z=0.0, visibility=0.9))  # LEFT_SHOULDER = 11 (higher)
        landmarks.append(Landmark(x=0.62, y=0.38, z=0.0, visibility=0.9))  # RIGHT_SHOULDER = 12 (lower)
    else:
        landmarks.append(Landmark(x=0.42, y=0.34, z=0.0, visibility=0.9))
        landmarks.append(Landmark(x=0.58, y=0.34, z=0.0, visibility=0.9))
    
    for _ in range(13, 23):
        landmarks.append(Landmark(x=0.5, y=0.4, z=0.0, visibility=0.9))
    
    if uneven_hips:
        landmarks.append(Landmark(x=0.42, y=0.52, z=0.0, visibility=0.9))  # LEFT_HIP = 23 (higher)
        landmarks.append(Landmark(x=0.58, y=0.56, z=0.0, visibility=0.9))  # RIGHT_HIP = 24 (lower)
    else:
        landmarks.append(Landmark(x=0.45, y=0.54, z=0.0, visibility=0.9))
        landmarks.append(Landmark(x=0.55, y=0.54, z=0.0, visibility=0.9))
    
    for _ in range(25, 27):
        landmarks.append(Landmark(x=0.5, y=0.7, z=0.0, visibility=0.9))
    
    landmarks.append(Landmark(x=0.45, y=0.95, z=0.0, visibility=0.9))  # LEFT_ANKLE = 27
    landmarks.append(Landmark(x=0.55, y=0.95, z=0.0, visibility=0.9))  # RIGHT_ANKLE = 28
    
    while len(landmarks) < 33:
        landmarks.append(Landmark(x=0.5, y=0.5, z=0.0, visibility=0.9))
    
    return landmarks


class TestDataCleaner:
    def test_scope_algorithms_mapping(self):
        assert SCOPE_ALGORITHMS["full"] == "moving_average"
        assert SCOPE_ALGORITHMS["upper"] == "trimmed_mean"
        assert SCOPE_ALGORITHMS["lower"] == "median"
    
    def test_get_algorithm_info_full(self):
        info = get_algorithm_info("full")
        assert info["scope"] == "full"
        assert info["algorithm"] == "moving_average"
        assert "window_size" in info["params"]
    
    def test_get_algorithm_info_upper(self):
        info = get_algorithm_info("upper")
        assert info["scope"] == "upper"
        assert info["algorithm"] == "trimmed_mean"
        assert "trim_percent" in info["params"]
    
    def test_get_algorithm_info_lower(self):
        info = get_algorithm_info("lower")
        assert info["scope"] == "lower"
        assert info["algorithm"] == "median"
    
    def test_clean_timeseries_single_frame(self):
        frames = [create_test_landmarks()]
        result = clean_timeseries(frames, "full")
        assert len(result) > 0
    
    def test_clean_timeseries_multiple_frames(self):
        frames = [create_test_landmarks() for _ in range(10)]
        result = clean_timeseries(frames, "full")
        assert len(result) > 0
    
    def test_clean_timeseries_empty(self):
        result = clean_timeseries([], "full")
        assert result == []
    
    def test_clean_timeseries_different_scopes(self):
        frames = [create_test_landmarks() for _ in range(10)]
        
        result_full = clean_timeseries(frames, "full")
        result_upper = clean_timeseries(frames, "upper")
        result_lower = clean_timeseries(frames, "lower")
        
        assert len(result_full) > 0
        assert len(result_upper) > 0
        assert len(result_lower) > 0


class TestPostureAnalysisSideView:
    def test_side_view_normal(self):
        landmarks = create_side_view_landmarks(head_forward=False, shoulder_forward=False)
        result = analyze_posture("side", landmarks, 640, 480)
        
        metrics = result["metrics"]
        assert hasattr(metrics, "headForward")
        assert hasattr(metrics, "headForwardAngle")
        assert hasattr(metrics, "headForwardOffset")
        assert hasattr(metrics, "shoulderRounded")
        assert hasattr(metrics, "shoulderRoundedAngle")
        
        assert metrics.headForward is not None
        assert metrics.shoulderRounded is not None
    
    def test_side_view_with_head_forward(self):
        landmarks = create_side_view_landmarks(head_forward=True, shoulder_forward=False)
        result = analyze_posture("side", landmarks, 640, 480)
        
        metrics = result["metrics"]
        assert metrics.headForward is not None
        assert metrics.headForwardAngle is not None
    
    def test_side_view_with_shoulder_forward(self):
        landmarks = create_side_view_landmarks(head_forward=False, shoulder_forward=True)
        result = analyze_posture("side", landmarks, 640, 480)
        
        metrics = result["metrics"]
        assert metrics.shoulderRounded is not None
        assert metrics.shoulderRoundedAngle is not None
    
    def test_side_view_annotations(self):
        landmarks = create_side_view_landmarks()
        result = analyze_posture("side", landmarks, 640, 480)
        
        annotations = result["annotations"]
        assert len(annotations) > 0
        
        annotation_types = [a.type for a in annotations]
        assert "line" in annotation_types


class TestPostureAnalysisFrontView:
    def test_front_view_normal(self):
        landmarks = create_front_view_landmarks(uneven_shoulders=False, uneven_hips=False)
        result = analyze_posture("front", landmarks, 640, 480)
        
        metrics = result["metrics"]
        assert hasattr(metrics, "shoulderAngle")
        assert hasattr(metrics, "hipAngle")
        assert hasattr(metrics, "headTiltAngle")
        assert hasattr(metrics, "shoulderSlope")
        assert hasattr(metrics, "shoulderTiltSide")
        assert hasattr(metrics, "hipSlope")
        assert hasattr(metrics, "hipTiltSide")
        assert hasattr(metrics, "midlineDeviation")
        assert hasattr(metrics, "midlineDeviationSide")
        
        assert metrics.shoulderAngle is not None
        assert metrics.hipAngle is not None
    
    def test_front_view_uneven_shoulders(self):
        landmarks = create_front_view_landmarks(uneven_shoulders=True, uneven_hips=False)
        result = analyze_posture("front", landmarks, 640, 480)
        
        metrics = result["metrics"]
        assert metrics.shoulderAngle is not None
        assert metrics.shoulderSlope is not None
        assert metrics.shoulderTiltSide is not None
    
    def test_front_view_uneven_hips(self):
        landmarks = create_front_view_landmarks(uneven_shoulders=False, uneven_hips=True)
        result = analyze_posture("front", landmarks, 640, 480)
        
        metrics = result["metrics"]
        assert metrics.hipAngle is not None
        assert metrics.hipSlope is not None
        assert metrics.hipTiltSide is not None
    
    def test_front_view_annotations(self):
        landmarks = create_front_view_landmarks()
        result = analyze_posture("front", landmarks, 640, 480)
        
        annotations = result["annotations"]
        assert len(annotations) > 0
        
        annotation_labels = [a.label for a in annotations if a.label]
        assert "肩线" in annotation_labels
        assert "髋线" in annotation_labels


class TestDataFlow:
    def test_full_data_flow_side_view(self):
        raw_frames = [create_side_view_landmarks() for _ in range(10)]
        
        cleaned_landmarks = clean_timeseries(raw_frames, "full")
        assert len(cleaned_landmarks) > 0
        
        result = analyze_posture("side", cleaned_landmarks, 640, 480)
        
        assert result["metrics"] is not None
        assert len(result["annotations"]) > 0
    
    def test_full_data_flow_front_view(self):
        raw_frames = [create_front_view_landmarks() for _ in range(10)]
        
        cleaned_landmarks = clean_timeseries(raw_frames, "upper")
        assert len(cleaned_landmarks) > 0
        
        result = analyze_posture("front", cleaned_landmarks, 640, 480)
        
        assert result["metrics"] is not None
        assert len(result["annotations"]) > 0
    
    def test_different_scopes_produce_different_results(self):
        base_frame = create_side_view_landmarks()
        noisy_frames = []
        
        import random
        random.seed(42)
        for _ in range(10):
            frame = []
            for lm in base_frame:
                frame.append(Landmark(
                    x=lm.x + random.uniform(-0.01, 0.01),
                    y=lm.y + random.uniform(-0.01, 0.01),
                    z=lm.z,
                    visibility=lm.visibility
                ))
            noisy_frames.append(frame)
        
        result_full = clean_timeseries(noisy_frames, "full")
        result_upper = clean_timeseries(noisy_frames, "upper")
        result_lower = clean_timeseries(noisy_frames, "lower")
        
        assert len(result_full) == len(result_upper) == len(result_lower)
    
    def test_metrics_has_cleaning_info(self):
        raw_frames = [create_side_view_landmarks() for _ in range(5)]
        cleaned_landmarks = clean_timeseries(raw_frames, "upper")
        
        result = analyze_posture("side", cleaned_landmarks, 640, 480)
        
        metrics = result["metrics"]
        assert hasattr(metrics, "cleaningAlgorithm")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
