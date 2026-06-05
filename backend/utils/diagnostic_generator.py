import math
from typing import Dict, Any, List


def generate_front_diagnostic(metrics: Dict[str, float], thresholds: Dict) -> str:
    """
    生成正面体态辅助诊断文本
    包含：高低肩、头部侧倾、骨盆倾斜、身体中线偏移
    """
    lines = []
    lines.append("📊 体态评估辅助诊断")
    lines.append("=" * 30)

    # Thresholds in config are slope values (dy/dx); convert to degrees for comparison
    mild_slope = thresholds.get('uneven_shoulders', {}).get('mild', 0.03)
    moderate_slope = thresholds.get('uneven_shoulders', {}).get('moderate', 0.08)
    threshold_mild = math.degrees(math.atan(mild_slope))
    threshold_moderate = math.degrees(math.atan(moderate_slope))

    shoulder_angle = metrics.get('shoulderAngle', 0)
    if shoulder_angle is not None and shoulder_angle != 0:
        severity = "✅ 正常" if abs(shoulder_angle) < threshold_mild else \
                   "⚠️ 轻度" if abs(shoulder_angle) < threshold_moderate else \
                   "❌ 明显异常"
        direction = "左高于右" if shoulder_angle > 0 else "右高于左"
        lines.append(f"【高低肩】{direction} {abs(shoulder_angle):.1f}° （{severity}）")
    else:
        lines.append("【高低肩】未检测到数据")

    # headRoll = ear-to-ear tilt angle (侧倾)
    head_roll = metrics.get('headRoll', 0)
    if head_roll is not None and head_roll != 0:
        severity = "✅ 正常" if abs(head_roll) < 3 else \
                   "⚠️ 轻度" if abs(head_roll) < 8 else \
                   "❌ 明显异常"
        direction = "右侧倾" if head_roll > 0 else "左侧倾"
        lines.append(f"【头部侧倾】{direction} {abs(head_roll):.1f}° （{severity}）")
    else:
        lines.append("【头部侧倾】未检测到数据")

    # headYaw = horizontal rotation (旋转)
    head_yaw = metrics.get('headYaw', 0)
    if head_yaw is not None and head_yaw != 0:
        severity = "✅ 正常" if abs(head_yaw) < 3 else \
                   "⚠️ 轻度" if abs(head_yaw) < 8 else \
                   "❌ 明显异常"
        direction = "右旋" if head_yaw > 0 else "左旋"
        lines.append(f"【头部旋转】{direction} {abs(head_yaw):.1f}° （{severity}）")

    hip_mild_slope = thresholds.get('uneven_hips', {}).get('mild', 0.03)
    hip_moderate_slope = thresholds.get('uneven_hips', {}).get('moderate', 0.08)
    hip_threshold_mild = math.degrees(math.atan(hip_mild_slope))
    hip_threshold_moderate = math.degrees(math.atan(hip_moderate_slope))
    hip_angle = metrics.get('hipAngle', 0)
    if hip_angle is not None and hip_angle != 0:
        severity = "✅ 正常" if abs(hip_angle) < hip_threshold_mild else \
                   "⚠️ 轻度" if abs(hip_angle) < hip_threshold_moderate else \
                   "❌ 明显异常"
        direction = "左高" if hip_angle > 0 else "右高"
        lines.append(f"【骨盆倾斜】{direction} {abs(hip_angle):.1f}° （{severity}）")
    else:
        lines.append("【骨盆倾斜】未检测到数据")

    # headDeviation from backend is a ratio (nose deviation / shoulder width), not degrees
    deviation_threshold = thresholds.get('midline_shift', {}).get('moderate', 0.08)
    deviation = metrics.get('headDeviation', 0)
    if deviation is not None and deviation != 0:
        severity = "✅ 正常" if abs(deviation) < deviation_threshold else "⚠️ 偏移"
        direction = "偏左" if deviation < 0 else "偏右"
        lines.append(f"【身体中线】{direction} {abs(deviation):.3f} （{severity}）")

    lines.append("")
    lines.append("=" * 30)
    issues: List[str] = []
    if shoulder_angle and abs(shoulder_angle) > threshold_mild:
        issues.append("高低肩")
    if head_roll and abs(head_roll) > 3:
        issues.append("头部侧倾")
    if hip_angle and abs(hip_angle) > hip_threshold_mild:
        issues.append("骨盆倾斜")

    if issues:
        lines.append(f"💡 综合评估：存在{('、'.join(issues))}，建议注意日常姿势。")
    else:
        lines.append("💡 综合评估：体态基本正常，继续保持良好姿势。")

    return '\n'.join(lines)
