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

    def get_point(index: int):
        if index >= len(landmarks):
            return {"x": 0, "y": 0}
        return get_pixel_coords(landmarks[index], width, height)

    # --- Side View Analysis ---
    if view == 'side':
        ear = get_point(LANDMARKS["LEFT_EAR"])
        shoulder = get_point(LANDMARKS["LEFT_SHOULDER"])
        hip = get_point(LANDMARKS["LEFT_HIP"])
        nose = get_point(LANDMARKS["NOSE"])
        
        # 1. Head Forward Analysis
        horizontal_dist = abs(ear["x"] - shoulder["x"])
        vertical_scale = abs(shoulder["y"] - ear["y"]) or 1
        forward_ratio = horizontal_dist / vertical_scale
        metrics.headForward = round(forward_ratio, 3)

        # Base Reference Line: Vertical through shoulder
        annotations.append(VisualAnnotation(
            type="line",
            points=[{"x": shoulder["x"], "y": 0}, {"x": shoulder["x"], "y": height}],
            color="rgba(59, 130, 246, 0.5)", # Blue
            dashed=True,
            label="肩峰垂线"
        ))

        if forward_ratio > 0.25:
            severity = 'severe' if forward_ratio > 0.45 else 'moderate'
            issues.append(PostureIssue(
                id='head-forward',
                type='head-forward',
                severity=severity,
                title='头前倾',
                description=f"耳垂位于肩峰前方 (偏移指数: {forward_ratio:.2f})",
                recommendation='建议进行颈部收缩训练（Chin Tucks），放松胸锁乳突肌和上斜方肌。',
                points=[ear, shoulder]
            ))
            annotations.append(VisualAnnotation(
                type="line",
                points=[ear, {"x": shoulder["x"], "y": ear["y"]}],
                color="#ef4444", # Red
                label=f"前倾: {forward_ratio:.2f}"
            ))

        # 2. Shoulder Rounded Analysis
        shoulder_hip_offset = abs(shoulder["x"] - hip["x"])
        trunk_height = abs(hip["y"] - shoulder["y"]) or 1
        kyphosis_ratio = shoulder_hip_offset / trunk_height
        metrics.shoulderRounded = round(kyphosis_ratio, 3)

        # 3. Vertical Plumb Line through Ankle
        l_ankle = get_point(LANDMARKS["LEFT_ANKLE"])
        r_ankle = get_point(LANDMARKS["RIGHT_ANKLE"])
        # Use the ankle with better visibility or just left for now if both are zero
        # In a real scenario, we'd check visibility. For now, let's use the one that exists.
        anchor_x = l_ankle["x"] if l_ankle["x"] > 0 else r_ankle["x"]
        
        annotations.append(VisualAnnotation(
            type="line",
            points=[{"x": anchor_x, "y": height * 0.05}, {"x": anchor_x, "y": height * 0.95}],
            color="rgba(255, 255, 0, 0.8)", # Yellow
            label="垂直参考线",
            lineWidth=2
        ))

        if kyphosis_ratio > 0.15:
            issues.append(PostureIssue(
                id='rounded-shoulders',
                type='posture',
                severity='mild',
                title='圆肩/含胸',
                description='肩关节相对于髋关节前移，可能伴随胸椎后凸。',
                recommendation='建议加强背部肌群（菱形肌、中下斜方肌），伸展胸大肌。',
                points=[shoulder, hip]
            ))
            annotations.append(VisualAnnotation(
                type="line",
                points=[shoulder, {"x": hip["x"], "y": shoulder["y"]}],
                color="#f59e0b", # Orange
                label=f"肩髋偏移: {kyphosis_ratio:.2f}"
            ))

    # --- Front/Back View Analysis ---
    elif view in ['front', 'back']:
        l_shoulder = get_point(LANDMARKS["LEFT_SHOULDER"])
        r_shoulder = get_point(LANDMARKS["RIGHT_SHOULDER"])
        l_hip = get_point(LANDMARKS["LEFT_HIP"])
        r_hip = get_point(LANDMARKS["RIGHT_HIP"])
        nose = get_point(LANDMARKS["NOSE"])

        # 1. Horizontal Shoulder Line
        annotations.append(VisualAnnotation(
            type="line",
            points=[l_shoulder, r_shoulder],
            color="rgba(0, 255, 255, 0.7)", # Cyan
            label="肩线",
            dash=[5, 5]
        ))

        # 2. Horizontal Hip Line
        annotations.append(VisualAnnotation(
            type="line",
            points=[l_hip, r_hip],
            color="rgba(0, 255, 255, 0.7)", # Cyan
            label="髋线",
            dash=[5, 5]
        ))

        # 3. Vertical Midline (Plumb Line)
        l_ankle = get_point(LANDMARKS["LEFT_ANKLE"])
        r_ankle = get_point(LANDMARKS["RIGHT_ANKLE"])
        mid_ankle_x = (l_ankle["x"] + r_ankle["x"]) / 2
        
        # 4. Shoulder alignment
        dx_s = abs(l_shoulder["x"] - r_shoulder["x"]) or 1
        dy_s = abs(l_shoulder["y"] - r_shoulder["y"])
        shoulder_slope = dy_s / dx_s
        metrics.shoulderAngle = round(math.atan(shoulder_slope) * (180 / math.pi), 1)

        # 1.5 Head Tilt Analysis (Front View)
        l_ear = get_point(LANDMARKS["LEFT_EAR"])
        r_ear = get_point(LANDMARKS["RIGHT_EAR"])
        dx_e = abs(l_ear["x"] - r_ear["x"]) or 1
        dy_e = abs(l_ear["y"] - r_ear["y"])
        ear_slope = dy_e / dx_e
        head_tilt_angle = round(math.atan(ear_slope) * (180 / math.pi), 1)
        
        if ear_slope > 0.03:
            is_left_high = l_ear["y"] < r_ear["y"]
            issues.append(PostureIssue(
                id='head-tilt',
                type='imbalance',
                severity='moderate' if ear_slope > 0.08 else 'mild',
                title='头部侧倾',
                description=f"头部向{'右' if is_left_high else '左'}侧倾斜约 {head_tilt_angle}°。",
                recommendation='建议进行颈部侧向拉伸，平衡两侧斜角肌力量。',
                points=[l_ear, r_ear]
            ))
            annotations.append(VisualAnnotation(
                type="line",
                points=[l_ear, r_ear],
                color="#8b5cf6", # Purple
                label=f"头倾斜: {head_tilt_angle}°"
            ))

        if shoulder_slope > 0.03:
            is_left_high = l_shoulder["y"] < r_shoulder["y"]
            issues.append(PostureIssue(
                id='uneven-shoulders',
                type='imbalance',
                severity='moderate' if shoulder_slope > 0.08 else 'mild',
                title='高低肩',
                description=f"{'左' if is_left_high else '右'}肩较高。可能由背包习惯或脊柱侧弯引起。",
                recommendation='建议平衡双侧斜方肌力量，检查是否有脊柱侧弯风险。',
                points=[l_shoulder, r_shoulder]
            ))
            annotations.append(VisualAnnotation(
                type="line",
                points=[l_shoulder, r_shoulder],
                color="#f59e0b", # Orange
                label=f"倾斜: {metrics.shoulderAngle}°"
            ))

        # 2. Hip alignment
        dx_h = abs(l_hip["x"] - r_hip["x"]) or 1
        dy_h = abs(l_hip["y"] - r_hip["y"])
        hip_slope = dy_h / dx_h
        metrics.hipAngle = round(math.atan(hip_slope) * (180 / math.pi), 1)

        if hip_slope > 0.03:
            is_left_high = l_hip["y"] < r_hip["y"]
            issues.append(PostureIssue(
                id='uneven-hips',
                type='imbalance',
                severity='moderate' if hip_slope > 0.08 else 'mild',
                title='骨盆侧倾',
                description=f"{'左' if is_left_high else '右'}侧骨盆较高。可能存在长短腿或核心肌力不平衡。",
                recommendation='建议加强臀中肌和核心肌群，必要时进行步态分析。',
                points=[l_hip, r_hip]
            ))
            annotations.append(VisualAnnotation(
                type="line",
                points=[l_hip, r_hip],
                color="#f59e0b",
                label=f"骨盆: {metrics.hipAngle}°"
            ))

        # 3. Midline alignment
        l_ankle = get_point(LANDMARKS["LEFT_ANKLE"])
        r_ankle = get_point(LANDMARKS["RIGHT_ANKLE"])
        mid_ankle_x = (l_ankle["x"] + r_ankle["x"]) / 2
        shoulder_width = abs(l_shoulder["x"] - r_shoulder["x"]) or 1
        deviation = nose["x"] - mid_ankle_x
        deviation_ratio = abs(deviation) / shoulder_width
        metrics.headDeviation = round(deviation_ratio, 3)

        # Midline Reference
        annotations.append(VisualAnnotation(
            type="line",
            points=[{"x": mid_ankle_x, "y": height * 0.05}, {"x": mid_ankle_x, "y": height * 0.95}],
            color="rgba(255, 255, 0, 0.8)", # Yellow
            lineWidth=2,
            label="身体中轴线"
        ))

        if deviation_ratio > 0.08:
            issues.append(PostureIssue(
                id='midline-shift',
                type='alignment',
                severity='moderate',
                title='身体中线偏移',
                description=f"身体重心向{'左' if deviation < 0 else '右'}侧偏移。",
                recommendation='建议进行核心稳定性训练和本体感觉训练。',
                points=[nose, {"x": mid_ankle_x, "y": nose["y"]}]
            ))
            annotations.append(VisualAnnotation(
                type="point",
                points=[nose],
                color="#ef4444",
                label="重心偏移"
            ))

    return {
        "metrics": metrics,
        "issues": issues,
        "annotations": annotations
    }
