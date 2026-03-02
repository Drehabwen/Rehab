from typing import Dict, Any


def generate_fallback_report(analysis_data: Dict[str, Any]) -> str:
    """
    生成降级报告 - 当 LLM 不可用时基于规则生成
    """
    report_lines = []
    report_lines.append("### ⚠️ 体态评估报告（快速评估模式）")
    report_lines.append("")
    report_lines.append("> **说明**：由于服务暂时不可用，以下为基于规则引擎的快速评估结果。")
    report_lines.append("> 建议稍后重新评估以获得更详细的 AI 分析。")
    report_lines.append("")

    frames = analysis_data.get("frames", [])

    if frames:
        try:
            from utils.posture_analysis import analyze_posture
            from backend.main import compute_averages, build_time_series

            time_series = build_time_series(frames)
            metrics = compute_averages(time_series)

            report_lines.append("---")
            report_lines.append("")
            report_lines.append("#### 📊 检测指标")
            report_lines.append("")

            if metrics.get("shoulderAngle"):
                angle = abs(metrics["shoulderAngle"])
                severity = "正常" if angle < 1.5 else "轻度异常" if angle < 3.5 else "明显异常"
                direction = "左肩高于右肩" if metrics["shoulderAngle"] > 0 else "右肩高于左肩"
                report_lines.append(f"- **高低肩**: {direction} {angle:.1f}° ({severity})")

            if metrics.get("hipAngle"):
                angle = abs(metrics["hipAngle"])
                severity = "正常" if angle < 1.5 else "轻度异常" if angle < 3.5 else "明显异常"
                direction = "左骨盆高于右骨盆" if metrics["hipAngle"] > 0 else "右骨盆高于左骨盆"
                report_lines.append(f"- **骨盆倾斜**: {direction} {angle:.1f}° ({severity})")

            if metrics.get("headDeviation"):
                dev = abs(metrics["headDeviation"])
                severity = "正常" if dev < 0.05 else "轻度偏移" if dev < 0.1 else "明显偏移"
                direction = "身体偏左" if metrics["headDeviation"] < 0 else "身体偏右"
                report_lines.append(f"- **身体中线**: {direction} ({severity})")

            if metrics.get("headYaw"):
                angle = abs(metrics["headYaw"])
                severity = "正常" if angle < 3 else "轻度异常" if angle < 8 else "明显异常"
                direction = "头部向左侧倾" if metrics["headYaw"] > 0 else "头部向右侧倾"
                report_lines.append(f"- **头部侧倾**: {direction} {angle:.1f}° ({severity})")

            report_lines.append("")
            report_lines.append("---")
            report_lines.append("")
            report_lines.append("#### 💡 建议")
            report_lines.append("")

            issues_count = sum([
                abs(metrics.get("shoulderAngle", 0)) > 1.5,
                abs(metrics.get("hipAngle", 0)) > 1.5,
                abs(metrics.get("headDeviation", 0)) > 0.05,
                abs(metrics.get("headYaw", 0)) > 3
            ])

            if issues_count == 0:
                report_lines.append("检测结果基本正常，请继续保持良好的生活姿势。")
            else:
                report_lines.append(f"检测到 {issues_count} 项异常指标，建议：")
                report_lines.append("1. 保持正确坐姿，避免长期单侧受力")
                report_lines.append("2. 适量进行核心肌群训练")
                report_lines.append("3. 如有不适，建议咨询专业康复师")

        except Exception as e:
            report_lines.append(f"无法生成指标分析: {str(e)}")

    return "\n".join(report_lines)
