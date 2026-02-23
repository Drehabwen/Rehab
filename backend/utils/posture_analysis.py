import math
import numpy as np
from typing import List, Dict, Any, Optional
from models import Landmark, PostureIssue, PostureMetrics, AnalysisResponse, VisualAnnotation

LANDMARKS = {
    "NOSE": 0,
    "LEFT_SHOULDER": 11,
    "RIGHT_SHOULDER": 12,
    "LEFT_EAR": 7,
    "RIGHT_EAR": 8,
    "LEFT_HIP": 23,
    "RIGHT_HIP": 24,
    "LEFT_ANKLE": 27,
    "RIGHT_ANKLE": 28,
}

def normalize_3d(vector: Dict[str, float]) -> Dict[str, float]:
    length = math.sqrt(vector["x"] ** 2 + vector["y"] ** 2 + vector["z"] ** 2) or 1.0
    return {
        "x": vector["x"] / length,
        "y": vector["y"] / length,
        "z": vector["z"] / length
    }

def cross_3d(a: Dict[str, float], b: Dict[str, float]) -> Dict[str, float]:
    return {
        "x": a["y"] * b["z"] - a["z"] * b["y"],
        "y": a["z"] * b["x"] - a["x"] * b["z"],
        "z": a["x"] * b["y"] - a["y"] * b["x"]
    }

def compute_axis_length(ear_len: float, width: int, height: int) -> float:
    base_len = max(width, height) * 0.06
    scaled_len = ear_len * 0.9
    return max(base_len, scaled_len)

def calculate_head_pose_axes(
    nose_3d: Dict[str, float],
    left_ear_3d: Dict[str, float],
    right_ear_3d: Dict[str, float],
    origin_2d: Dict[str, float],
    axis_len: float
) -> List[Dict[str, float]]:
    x_axis = normalize_3d({
        "x": right_ear_3d["x"] - left_ear_3d["x"],
        "y": right_ear_3d["y"] - left_ear_3d["y"],
        "z": right_ear_3d["z"] - left_ear_3d["z"]
    })
    z_axis = normalize_3d({
        "x": nose_3d["x"] - (left_ear_3d["x"] + right_ear_3d["x"]) / 2,
        "y": nose_3d["y"] - (left_ear_3d["y"] + right_ear_3d["y"]) / 2,
        "z": nose_3d["z"] - (left_ear_3d["z"] + right_ear_3d["z"]) / 2
    })
    y_axis = normalize_3d(cross_3d(z_axis, x_axis))

    def project(axis: Dict[str, float]) -> Dict[str, float]:
        return {
            "x": origin_2d["x"] + axis["x"] * axis_len,
            "y": origin_2d["y"] + axis["y"] * axis_len
        }

    return [
        {"x": origin_2d["x"], "y": origin_2d["y"]},
        project(x_axis),
        project(y_axis),
        project(z_axis)
    ]

def get_pixel_coords(landmark: Landmark, width: int, height: int) -> Dict[str, float]:
    return {
        "x": landmark.x * width,
        "y": landmark.y * height
    }

def analyze_posture(
    view: str,
    landmarks: List[Landmark],
    width: int,
    height: int
) -> Dict[str, Any]:
    issues = []
    annotations = []
    metrics = PostureMetrics()

    def get_landmark(index: int) -> Optional[Landmark]:
        if index >= len(landmarks):
            return None
        return landmarks[index]

    def get_point(index: int):
        if index >= len(landmarks):
            return {"x": 0, "y": 0}
        return get_pixel_coords(landmarks[index], width, height)

    def get_point_3d(index: int):
        lm = get_landmark(index)
        if not lm:
            return {"x": 0.0, "y": 0.0, "z": 0.0}
        return {"x": lm.x, "y": lm.y, "z": lm.z if lm.z is not None else 0.0}

    left_ear_lm = get_landmark(LANDMARKS["LEFT_EAR"])
    right_ear_lm = get_landmark(LANDMARKS["RIGHT_EAR"])
    nose_lm = get_landmark(LANDMARKS["NOSE"])

    if left_ear_lm and right_ear_lm and nose_lm:
        left_ear_3d = get_point_3d(LANDMARKS["LEFT_EAR"])
        right_ear_3d = get_point_3d(LANDMARKS["RIGHT_EAR"])
        nose_3d = get_point_3d(LANDMARKS["NOSE"])

        ear_mid_3d = {
            "x": (left_ear_3d["x"] + right_ear_3d["x"]) / 2,
            "y": (left_ear_3d["y"] + right_ear_3d["y"]) / 2,
            "z": (left_ear_3d["z"] + right_ear_3d["z"]) / 2
        }

        head_vec = {
            "x": nose_3d["x"] - ear_mid_3d["x"],
            "y": nose_3d["y"] - ear_mid_3d["y"],
            "z": nose_3d["z"] - ear_mid_3d["z"]
        }

        if abs(head_vec["z"]) < 1e-6:
            yaw = 0.0
            pitch = 0.0
        else:
            yaw = math.degrees(math.atan2(head_vec["x"], -head_vec["z"]))
            pitch = math.degrees(math.atan2(head_vec["y"], -head_vec["z"]))

        roll = math.degrees(math.atan2(
            left_ear_lm.y - right_ear_lm.y,
            left_ear_lm.x - right_ear_lm.x
        ))

        metrics.headYaw = round(yaw, 1)
        metrics.headPitch = round(pitch, 1)
        metrics.headRoll = round(roll, 1)

        left_ear_2d = get_point(LANDMARKS["LEFT_EAR"])
        right_ear_2d = get_point(LANDMARKS["RIGHT_EAR"])
        nose_2d = get_point(LANDMARKS["NOSE"])
        ear_mid_2d = {
            "x": (left_ear_2d["x"] + right_ear_2d["x"]) / 2,
            "y": (left_ear_2d["y"] + right_ear_2d["y"]) / 2
        }
        ear_vec = {
            "x": right_ear_2d["x"] - left_ear_2d["x"],
            "y": right_ear_2d["y"] - left_ear_2d["y"]
        }
        ear_len = math.hypot(ear_vec["x"], ear_vec["y"]) or 1.0
        axis_len = compute_axis_length(ear_len, width, height)
        metrics.head_axes = calculate_head_pose_axes(
            nose_3d,
            left_ear_3d,
            right_ear_3d,
            ear_mid_2d,
            axis_len
        )

    # --- Side View Analysis ---
    if view == 'side':
        # 根据拍摄方向选择对应侧的关键点
        # 左侧位：使用左耳、左肩、左髋
        # 右侧位：使用右耳、右肩、右髋
        use_left = True  # 默认使用左侧
        
        if use_left:
            ear = get_point(LANDMARKS["LEFT_EAR"])
            shoulder = get_point(LANDMARKS["LEFT_SHOULDER"])
            hip = get_point(LANDMARKS["LEFT_HIP"])
            ankle = get_point(LANDMARKS["LEFT_ANKLE"])
        else:
            ear = get_point(LANDMARKS["RIGHT_EAR"])
            shoulder = get_point(LANDMARKS["RIGHT_SHOULDER"])
            hip = get_point(LANDMARKS["RIGHT_HIP"])
            ankle = get_point(LANDMARKS["RIGHT_ANKLE"])
        
        nose = get_point(LANDMARKS["NOSE"])
        
        # 1. Head Forward Analysis (头前伸/头前倾)
        # 核心计算：只算数据，把分析交给 LLM
        
        # 计算耳垂到肩峰的垂直参考线的水平距离
        ear_shoulder_x_diff = ear["x"] - shoulder["x"]
        
        # 使用躯干长度归一化
        trunk_length = abs(hip["y"] - shoulder["y"]) or 1
        ear_shoulder_normalized = ear_shoulder_x_diff / trunk_length
        
        # 头前伸角度
        head_forward_angle = math.degrees(math.atan(abs(ear_shoulder_x_diff) / trunk_length))
        
        # 更新指标（原始数据 + 角度）
        metrics.headForward = round(abs(ear_shoulder_normalized), 3)
        
        # 保存详细数据供 LLM 分析
        metrics.headForwardAngle = round(head_forward_angle, 1)
        metrics.headForwardOffset = round(ear_shoulder_x_diff, 4)
        metrics.headForwardTrunkRatio = round(abs(ear_shoulder_x_diff) / trunk_length, 4)
        
        # 绘制可视化参考线
        annotations.append(VisualAnnotation(
            type="line",
            points=[{"x": shoulder["x"], "y": 0}, {"x": shoulder["x"], "y": height}],
            color="rgba(59, 130, 246, 0.5)",
            dashed=True,
            label="肩峰垂线"
        ))
        
        annotations.append(VisualAnnotation(
            type="line",
            points=[{"x": 0, "y": ear["y"]}, {"x": width, "y": ear["y"]}],
            color="rgba(139, 92, 246, 0.4)",
            dashed=True,
            label="耳垂水平线"
        ))
        
        annotations.append(VisualAnnotation(
            type="line",
            points=[ear, {"x": shoulder["x"], "y": ear["y"]}],
            color="rgba(236, 72, 153, 0.6)",
            label=f"头前伸偏移: {ear_shoulder_x_diff:.3f}"
        ))

        # 2. (圆肩/ Shoulder Rounded Analysis含胸)
        # 核心计算：只算数据，把分析交给 LLM
        
        shoulder_hip_offset = shoulder["x"] - hip["x"]
        trunk_height = abs(hip["y"] - shoulder["y"]) or 1
        kyphosis_ratio = abs(shoulder_hip_offset) / trunk_height
        
        ear_shoulder_dist = math.hypot(ear["x"] - shoulder["x"], ear["y"] - shoulder["y"])
        shoulder_hip_dist = math.hypot(shoulder["x"] - hip["x"], shoulder["y"] - hip["y"])
        
        metrics.shoulderRounded = round(kyphosis_ratio, 3)
        
        shoulder_rounded_angle = math.degrees(math.atan(kyphosis_ratio))
        
        metrics.shoulderRoundedAngle = round(shoulder_rounded_angle, 1)
        metrics.shoulderRoundedOffset = round(shoulder_hip_offset, 4)
        metrics.shoulderRoundedTrunkRatio = round(kyphosis_ratio, 4)
        
        if ankle and ankle["x"] > 0:
            anchor_x = ankle["x"]
        else:
            anchor_x = hip["x"]
        
        annotations.append(VisualAnnotation(
            type="line",
            points=[{"x": anchor_x, "y": height * 0.05}, {"x": anchor_x, "y": height * 0.95}],
            color="rgba(255, 255, 0, 0.8)",
            label="垂直参考线(踝)",
            lineWidth=2
        ))
        
        # 添加躯干中心线
        trunk_center_x = (shoulder["x"] + hip["x"]) / 2
        annotations.append(VisualAnnotation(
            type="line",
            points=[{"x": trunk_center_x, "y": shoulder["y"]}, {"x": trunk_center_x, "y": hip["y"]}],
            color="rgba(147, 51, 234, 0.5)",
            label="躯干中心线",
            dashed=True
        ))

    # --- Front/Back View Analysis ---
    elif view in ['front', 'back']:
        l_shoulder = get_point(LANDMARKS["LEFT_SHOULDER"])
        r_shoulder = get_point(LANDMARKS["RIGHT_SHOULDER"])
        l_hip = get_point(LANDMARKS["LEFT_HIP"])
        r_hip = get_point(LANDMARKS["RIGHT_HIP"])
        nose = get_point(LANDMARKS["NOSE"])
        
        annotations.append(VisualAnnotation(
            type="line",
            points=[l_shoulder, r_shoulder],
            color="rgba(0, 255, 255, 0.7)",
            label="肩线",
            dash=[5, 5]
        ))

        annotations.append(VisualAnnotation(
            type="line",
            points=[l_hip, r_hip],
            color="rgba(0, 255, 255, 0.7)",
            label="髋线",
            dash=[5, 5]
        ))

        l_ankle = get_point(LANDMARKS["LEFT_ANKLE"])
        r_ankle = get_point(LANDMARKS["RIGHT_ANKLE"])
        mid_ankle_x = (l_ankle["x"] + r_ankle["x"]) / 2
        
        dx_s = abs(l_shoulder["x"] - r_shoulder["x"]) or 1
        dy_s = abs(l_shoulder["y"] - r_shoulder["y"])
        shoulder_slope = dy_s / dx_s
        metrics.shoulderAngle = round(math.atan(shoulder_slope) * (180 / math.pi), 1)
        metrics.shoulderSlope = round(shoulder_slope, 4)
        metrics.shoulderTiltSide = "left" if l_shoulder["y"] < r_shoulder["y"] else "right"

        l_ear = get_point(LANDMARKS["LEFT_EAR"])
        r_ear = get_point(LANDMARKS["RIGHT_EAR"])
        dx_e = abs(l_ear["x"] - r_ear["x"]) or 1
        dy_e = abs(l_ear["y"] - r_ear["y"])
        ear_slope = dy_e / dx_e
        head_tilt_angle = round(math.atan(ear_slope) * (180 / math.pi), 1)
        
        metrics.headTiltAngle = head_tilt_angle
        metrics.headTiltSlope = round(ear_slope, 4)
        metrics.headTiltSide = "left" if l_ear["y"] < r_ear["y"] else "right"
        
        annotations.append(VisualAnnotation(
            type="line",
            points=[l_ear, r_ear],
            color="rgba(139, 92, 246, 0.6)",
            dashed=True,
            label=f"头倾斜: {head_tilt_angle}°"
        ))

        annotations.append(VisualAnnotation(
            type="line",
            points=[l_shoulder, r_shoulder],
            color="rgba(245, 158, 11, 0.6)",
            label=f"肩倾斜: {metrics.shoulderAngle}°"
        ))

        dx_h = abs(l_hip["x"] - r_hip["x"]) or 1
        dy_h = abs(l_hip["y"] - r_hip["y"])
        hip_slope = dy_h / dx_h
        metrics.hipAngle = round(math.atan(hip_slope) * (180 / math.pi), 1)
        metrics.hipSlope = round(hip_slope, 4)
        metrics.hipTiltSide = "left" if l_hip["y"] < r_hip["y"] else "right"

        annotations.append(VisualAnnotation(
            type="line",
            points=[l_hip, r_hip],
            color="rgba(16, 185, 129, 0.6)",
            label=f"骨盆: {metrics.hipAngle}°"
        ))

        shoulder_width = abs(l_shoulder["x"] - r_shoulder["x"]) or 1
        deviation = nose["x"] - mid_ankle_x
        deviation_ratio = abs(deviation) / shoulder_width
        metrics.headDeviation = round(deviation_ratio, 3)
        metrics.midlineDeviation = round(deviation_ratio, 4)
        metrics.midlineDeviationSide = "left" if deviation < 0 else "right"

        annotations.append(VisualAnnotation(
            type="line",
            points=[{"x": mid_ankle_x, "y": height * 0.05}, {"x": mid_ankle_x, "y": height * 0.95}],
            color="rgba(255, 255, 0, 0.8)",
            lineWidth=2,
            label="身体中轴线"
        ))

    return {
        "metrics": metrics,
        "issues": issues,
        "annotations": annotations
    }
