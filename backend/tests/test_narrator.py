import pytest
import numpy as np
from utils.narrator import PostureNarrator, process_time_series


class TestPostureNarratorCenterCoordinates:
    
    def test_center_coordinates_empty_sequence(self):
        result = PostureNarrator.center_coordinates([])
        assert result == []
    
    def test_center_coordinates_single_frame(self):
        frame = [{"x": 1.0, "y": 2.0, "z": 3.0, "visibility": 1.0} for _ in range(33)]
        result = PostureNarrator.center_coordinates([frame], origin_idx=24)
        assert len(result) == 1
        assert result[0][24]["x"] == 0.0
        assert result[0][24]["y"] == 0.0
        assert result[0][24]["z"] == 0.0
    
    def test_center_coordinates_default_origin(self):
        frame = [{"x": i * 0.1, "y": i * 0.2, "z": i * 0.3, "visibility": 1.0} for i in range(33)]
        result = PostureNarrator.center_coordinates([frame])
        origin = result[0][24]
        assert origin["x"] == 0.0
        assert origin["y"] == 0.0
        assert origin["z"] == 0.0
    
    def test_center_coordinates_custom_origin(self):
        frame = [{"x": i * 0.1, "y": i * 0.2, "z": i * 0.3, "visibility": 1.0} for i in range(33)]
        result = PostureNarrator.center_coordinates([frame], origin_idx=0)
        origin = result[0][0]
        assert origin["x"] == 0.0
        assert origin["y"] == 0.0
        assert origin["z"] == 0.0
    
    def test_center_coordinates_multi_frame(self):
        sequence = [
            [{"x": 1.0 + i * 0.1, "y": 2.0 + i * 0.1, "z": 3.0 + i * 0.1, "visibility": 1.0} for _ in range(33)]
            for i in range(10)
        ]
        result = PostureNarrator.center_coordinates(sequence)
        assert len(result) == 10
        for frame in result:
            assert frame[24]["x"] == 0.0
            assert frame[24]["y"] == 0.0
            assert frame[24]["z"] == 0.0
    
    def test_center_coordinates_preserves_visibility(self):
        frame = [{"x": 1.0, "y": 2.0, "z": 3.0, "visibility": 0.8} for _ in range(33)]
        result = PostureNarrator.center_coordinates([frame])
        for lm in result[0]:
            assert lm["visibility"] == 0.8


class TestPostureNarratorCalculateStatistics:
    
    def test_calculate_statistics_empty_sequence(self):
        result = PostureNarrator.calculate_statistics([])
        assert result == {}
    
    def test_calculate_statistics_single_frame(self):
        frame = [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
        result = PostureNarrator.calculate_statistics([frame])
        assert "nose" in result
        assert result["nose"]["mean"]["x"] == 0.5
        assert result["nose"]["std"]["x"] == 0.0
        assert result["nose"]["trend"]["x"] == 0.0
        assert result["nose"]["mean"]["y"] == 0.5
        assert result["nose"]["mean"]["z"] == 0.5
        assert result["nose"]["std"]["y"] == 0.0
        assert result["nose"]["std"]["z"] == 0.0
        assert result["nose"]["trend"]["y"] == 0.0
        assert result["nose"]["trend"]["z"] == 0.0
    
    def test_calculate_statistics_multi_frame_constant(self):
        frames = [
            [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
            for _ in range(30)
        ]
        result = PostureNarrator.calculate_statistics(frames)
        assert result["nose"]["mean"]["x"] == 0.5
        assert abs(result["nose"]["std"]["x"]) < 0.01
        assert abs(result["nose"]["trend"]["x"]) < 0.01
    
    def test_calculate_statistics_multi_frame_linear_trend(self):
        frames = [
            [{"x": 0.1 + i * 0.01, "y": 0.2, "z": 0.3, "visibility": 1.0} for _ in range(33)]
            for i in range(30)
        ]
        result = PostureNarrator.calculate_statistics(frames)
        assert result["nose"]["mean"]["x"] > 0.1
        assert result["nose"]["std"]["x"] > 0
        assert result["nose"]["trend"]["x"] > 0
    
    def test_calculate_statistics_all_keypoints(self):
        frames = [
            [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
            for _ in range(10)
        ]
        result = PostureNarrator.calculate_statistics(frames)
        expected_landmarks = ["nose", "left_shoulder", "right_shoulder", "left_hip", "right_hip", 
                             "left_knee", "right_knee", "left_ankle", "right_ankle"]
        for lm_name in expected_landmarks:
            assert lm_name in result
            assert "mean" in result[lm_name]
            assert "std" in result[lm_name]
            assert "trend" in result[lm_name]
    
    def test_calculate_statistics_variance_calculation(self):
        frames = [
            [{"x": 0.5 + (i % 2) * 0.1, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
            for i in range(20)
        ]
        result = PostureNarrator.calculate_statistics(frames)
        assert result["nose"]["std"]["x"] > 0.04
        assert result["nose"]["std"]["y"] < 0.01


class TestPostureNarratorNarrate:
    
    def test_narrate_empty_stats(self):
        result = PostureNarrator.narrate("front", {})
        assert result == "评估视角: front"
    
    def test_narrate_single_landmark(self):
        stats = {
            "nose": {
                "mean": {"x": 0.1234, "y": 0.5678, "z": 0.9012},
                "std": {"x": 0.0123, "y": 0.0234, "z": 0.0345},
                "trend": {"x": 0.000123, "y": 0.000234, "z": 0.000345}
            }
        }
        result = PostureNarrator.narrate("front", stats)
        assert "评估视角: front" in result
        assert "Nose" in result
        assert "0.1234" in result
        assert "0.0123" in result
        assert "0.000123" in result
    
    def test_narrate_multiple_landmarks(self):
        stats = {
            "nose": {
                "mean": {"x": 0.1, "y": 0.2, "z": 0.3},
                "std": {"x": 0.01, "y": 0.02, "z": 0.03},
                "trend": {"x": 0.001, "y": 0.002, "z": 0.003}
            },
            "left_shoulder": {
                "mean": {"x": 0.4, "y": 0.5, "z": 0.6},
                "std": {"x": 0.04, "y": 0.05, "z": 0.06},
                "trend": {"x": 0.004, "y": 0.005, "z": 0.006}
            }
        }
        result = PostureNarrator.narrate("side", stats)
        assert "评估视角: side" in result
        assert "Nose" in result
        assert "Left Shoulder" in result
        assert "平均位置" in result
        assert "稳定性" in result
        assert "移动趋势" in result


class TestProcessTimeSeries:
    
    def test_process_time_series_full_pipeline(self):
        landmarks_sequence = [
            [{"x": 0.5 + i * 0.01, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
            for i in range(30)
        ]
        result = process_time_series("front", landmarks_sequence)
        
        assert result["view"] == "front"
        assert "stats" in result
        assert "narration" in result
        assert "nose" in result["stats"]
        assert "评估视角: front" in result["narration"]
    
    def test_process_time_series_empty_sequence(self):
        result = process_time_series("back", [])
        assert result["view"] == "back"
        assert result["stats"] == {}
        assert result["narration"] == "评估视角: back"
    
    def test_process_time_series_different_views(self):
        landmarks_sequence = [
            [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
            for _ in range(10)
        ]
        
        front_result = process_time_series("front", landmarks_sequence)
        side_result = process_time_series("side", landmarks_sequence)
        back_result = process_time_series("back", landmarks_sequence)
        
        assert front_result["view"] == "front"
        assert side_result["view"] == "side"
        assert back_result["view"] == "back"
        assert "评估视角: front" in front_result["narration"]
        assert "评估视角: side" in side_result["narration"]
        assert "评估视角: back" in back_result["narration"]


class TestEdgeCases:
    
    def test_insufficient_landmarks_in_frame(self):
        frame = [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(10)]
        result = PostureNarrator.center_coordinates([frame], origin_idx=24)
        assert len(result) == 1
        assert result[0] == frame
    
    def test_visibility_not_in_landmark(self):
        frame = [{"x": 0.5, "y": 0.5, "z": 0.5} for _ in range(33)]
        result = PostureNarrator.center_coordinates([frame])
        assert "visibility" in result[0][0]
        assert result[0][0]["visibility"] == 0
    
    def test_large_sequence(self):
        frames = [
            [{"x": 0.5, "y": 0.5, "z": 0.5, "visibility": 1.0} for _ in range(33)]
            for _ in range(120)
        ]
        result = PostureNarrator.calculate_statistics(frames)
        assert "nose" in result
        assert result["nose"]["std"]["x"] < 0.01
