import math
from backend.utils.posture_analysis import calculate_head_pose_axes, compute_axis_length

def test_head_pose_axes_generation():
    nose_3d = {"x": 0.5, "y": 0.5, "z": 0.0}
    left_ear_3d = {"x": 0.4, "y": 0.5, "z": 0.1}
    right_ear_3d = {"x": 0.6, "y": 0.5, "z": 0.1}
    origin_2d = {"x": 500.0, "y": 500.0}
    axis_len = 80.0

    axes = calculate_head_pose_axes(nose_3d, left_ear_3d, right_ear_3d, origin_2d, axis_len)

    assert len(axes) == 4
    assert abs(axes[1]["y"] - origin_2d["y"]) < 0.001
    assert axes[1]["x"] > origin_2d["x"]

def test_head_pose_axes_scaling():
    nose_3d = {"x": 0.5, "y": 0.5, "z": 0.0}
    left_ear_3d = {"x": 0.45, "y": 0.5, "z": 0.1}
    right_ear_3d = {"x": 0.55, "y": 0.5, "z": 0.1}
    origin_2d = {"x": 500.0, "y": 500.0}

    axis_len_near = compute_axis_length(160.0, 1000, 1000)
    axis_len_far = compute_axis_length(80.0, 1000, 1000)

    axes_near = calculate_head_pose_axes(nose_3d, left_ear_3d, right_ear_3d, origin_2d, axis_len_near)
    axes_far = calculate_head_pose_axes(nose_3d, left_ear_3d, right_ear_3d, origin_2d, axis_len_far)

    len_near = math.hypot(axes_near[1]["x"] - origin_2d["x"], axes_near[1]["y"] - origin_2d["y"])
    len_far = math.hypot(axes_far[1]["x"] - origin_2d["x"], axes_far[1]["y"] - origin_2d["y"])

    assert len_near > len_far
