import numpy as np
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class PostureNarrator:
    """
    Translates raw skeletal keypoint time-series data into natural language descriptions
    and statistical summaries for LLM consumption.
    """
    
    # Mediapipe Landmark Mapping (subset for analysis)
    LANDMARKS = {
        0: "nose",
        11: "left_shoulder", 12: "right_shoulder",
        23: "left_hip", 24: "right_hip",
        25: "left_knee", 26: "right_knee",
        27: "left_ankle", 28: "right_ankle"
    }

    @staticmethod
    def center_coordinates(landmarks_sequence: List[List[Dict[str, float]]], origin_idx: int = 24) -> List[List[Dict[str, float]]]:
        """
        Centers landmarks relative to a specific origin point (default: right_hip/pelvis).
        landmarks_sequence: [frame_0, frame_1, ...] where each frame is a list of 33 landmarks.
        """
        centered_sequence = []
        for frame in landmarks_sequence:
            if not frame or len(frame) <= origin_idx:
                centered_sequence.append(frame)
                continue
            
            origin = frame[origin_idx]
            origin_x, origin_y, origin_z = origin['x'], origin['y'], origin['z']
            
            centered_frame = []
            for lm in frame:
                centered_frame.append({
                    'x': lm['x'] - origin_x,
                    'y': lm['y'] - origin_y,
                    'z': lm['z'] - origin_z,
                    'visibility': lm.get('visibility', 0)
                })
            centered_sequence.append(centered_frame)
        return centered_sequence

    @staticmethod
    def calculate_statistics(centered_sequence: List[List[Dict[str, float]]]) -> Dict[str, Any]:
        """
        Calculates mean, std, and trend slope for key landmarks.
        """
        stats = {}
        if not centered_sequence:
            return stats

        # Convert to numpy for easier manipulation [frames, landmarks, coordinates]
        # coordinates: 0=x, 1=y, 2=z
        data = []
        for frame in centered_sequence:
            frame_data = [[lm['x'], lm['y'], lm['z']] for lm in frame]
            data.append(frame_data)
        
        np_data = np.array(data) # Shape: (frames, 33, 3)
        
        for idx, name in PostureNarrator.LANDMARKS.items():
            if idx >= np_data.shape[1]: continue
            
            lm_data = np_data[:, idx, :] # Shape: (frames, 3)
            
            # Means
            means = np.mean(lm_data, axis=0)
            # Standard Deviations (stability)
            stds = np.std(lm_data, axis=0)
            
            # Trends (slope of linear regression for each axis)
            slopes = []
            if len(lm_data) > 1:
                x_axis = np.arange(len(lm_data))
                for i in range(3):
                    try:
                        slope, _ = np.polyfit(x_axis, lm_data[:, i], 1)
                        slopes.append(float(slope))
                    except Exception:
                        slopes.append(0.0)
            else:
                slopes = [0.0, 0.0, 0.0]
            
            stats[name] = {
                "mean": {"x": float(means[0]), "y": float(means[1]), "z": float(means[2])},
                "std": {"x": float(stds[0]), "y": float(stds[1]), "z": float(stds[2])},
                "trend": {"x": float(slopes[0]), "y": float(slopes[1]), "z": float(slopes[2])}
            }
            
        return stats

    @staticmethod
    def narrate(view: str, stats: Dict[str, Any]) -> str:
        """
        Converts statistics into a natural language description.
        """
        descriptions = []
        descriptions.append(f"评估视角：{view}")
        
        for name, data in stats.items():
            m = data["mean"]
            s = data["std"]
            t = data["trend"]
            
            desc = (f"- {name.replace('_', ' ').title()}: "
                    f"平均位置 ({m['x']:.4f}, {m['y']:.4f}, {m['z']:.4f}), "
                    f"稳定性 (标准差 X:{s['x']:.4f}, Y:{s['y']:.4f}), "
                    f"移动趋势 (斜率 X:{t['x']:.6f})")
            descriptions.append(desc)
            
        return "\n".join(descriptions)

    @staticmethod
    def calculate_shoulder_angle(stats: Dict[str, Any]) -> float:
        """
        Calculate shoulder angle (高低肩度数) from statistics.
        Positive = right shoulder higher, Negative = left shoulder higher
        """
        if 'left_shoulder' not in stats or 'right_shoulder' not in stats:
            return 0.0
        
        left_y = stats['left_shoulder']['mean']['y']
        right_y = stats['right_shoulder']['mean']['y']
        
        # Calculate angle in degrees
        # Y axis is inverted in image coordinates (top is 0)
        shoulder_diff = left_y - right_y
        angle = np.degrees(np.arctan(abs(shoulder_diff)))
        
        # Determine direction
        if shoulder_diff > 0:
            return angle  # Right shoulder higher
        else:
            return -angle  # Left shoulder higher

    @staticmethod
    def calculate_head_rotation(stats: Dict[str, Any]) -> float:
        """
        Calculate head rotation angle (头旋转度数) from nose position.
        Based on nose deviation from midline
        """
        if 'nose' not in stats:
            return 0.0
        
        nose_x = stats['nose']['mean']['x']
        # Approximate rotation based on nose horizontal deviation
        # Assuming 10cm nose deviation = 45 degrees rotation
        rotation = np.degrees(np.arctan(abs(nose_x) * 0.5))
        
        return rotation

    @staticmethod
    def calculate_head_tilt(stats: Dict[str, Any]) -> float:
        """
        Calculate head tilt/lean (头侧倾程度) from nose horizontal deviation.
        Returns absolute value in degrees
        """
        if 'nose' not in stats:
            return 0.0
        
        nose_x = abs(stats['nose']['mean']['x'])
        # Calculate angle in degrees based on nose horizontal deviation
        # Assuming 0.1 normalized units = 10 degrees tilt
        tilt_angle = np.degrees(np.arctan(nose_x * 10))
        return tilt_angle

    @staticmethod
    def calculate_head_forward(stats: Dict[str, Any]) -> float:
        """
        Calculate forward head posture (头前伸距离).
        Based on nose Z-axis deviation from shoulders
        """
        if 'nose' not in stats or 'left_shoulder' not in stats:
            return 0.0
        
        nose_z = stats['nose']['mean']['z']
        shoulder_z = (stats['left_shoulder']['mean']['z'] + stats['right_shoulder']['mean']['z']) / 2
        
        # Forward head = nose is in front of shoulders (positive Z)
        forward_distance = max(0, nose_z - shoulder_z)
        return forward_distance * 100  # Convert to cm approximation

    @staticmethod
    def calculate_pelvic_tilt(stats: Dict[str, Any]) -> float:
        """
        Calculate pelvic tilt (骨盆倾斜) from hip positions.
        Positive = right hip higher, Negative = left hip higher
        """
        if 'left_hip' not in stats or 'right_hip' not in stats:
            return 0.0
        
        left_y = stats['left_hip']['mean']['y']
        right_y = stats['right_hip']['mean']['y']
        
        hip_diff = left_y - right_y
        angle = np.degrees(np.arctan(abs(hip_diff)))
        
        if hip_diff > 0:
            return angle
        else:
            return -angle

    @staticmethod
    def calculate_stability_score(stats: Dict[str, Any]) -> float:
        """
        Calculate overall stability score (0-100) based on standard deviations.
        Higher score = more stable
        """
        if not stats:
            return 0.0
        
        # Average standard deviation across all landmarks
        all_stds = []
        for name, data in stats.items():
            all_stds.append(data['std']['x'])
            all_stds.append(data['std']['y'])
        
        if not all_stds:
            return 0.0
        
        avg_std = np.mean(all_stds)
        
        # Convert to 0-100 score (lower std = higher score)
        # Assuming std < 0.01 is excellent, std > 0.05 is poor
        score = max(0, min(100, 100 - (avg_std * 2000)))
        return score

    @staticmethod
    def generate_structured_report(view: str, stats: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate structured posture report with key metrics.
        """
        shoulder_angle = PostureNarrator.calculate_shoulder_angle(stats)
        head_rotation = PostureNarrator.calculate_head_rotation(stats)
        head_tilt = PostureNarrator.calculate_head_tilt(stats)
        head_forward = PostureNarrator.calculate_head_forward(stats)
        pelvic_tilt = PostureNarrator.calculate_pelvic_tilt(stats)
        stability_score = PostureNarrator.calculate_stability_score(stats)
        
        # Generate narrative description
        sections = []
        
        # 1. Shoulder analysis
        if abs(shoulder_angle) > 2:
            direction = "右高左低" if shoulder_angle > 0 else "左高右低"
            sections.append(f"### 肩膀分析\n检测到**高低肩**现象：{direction}，角度约 **{abs(shoulder_angle):.1f}°**")
        else:
            sections.append("### 肩膀分析\n双肩基本水平，无明显高低肩现象。")
        
        # 2. Head analysis
        head_issues = []
        if head_rotation > 5:
            head_issues.append(f"头部旋转约 **{head_rotation:.1f}°**")
        if head_tilt > 5:
            head_issues.append(f"头部侧倾约 **{head_tilt:.1f}°**")
        if head_forward > 3:
            head_issues.append(f"头前伸约 **{head_forward:.1f}cm**")
        
        if head_issues:
            sections.append("### 头部姿势分析\n检测到以下问题：\n" + "\n".join(head_issues))
        else:
            sections.append("### 头部姿势分析\n头部位置正常，无明显异常。")
        
        # 3. Pelvic analysis
        if abs(pelvic_tilt) > 2:
            direction = "右高左低" if pelvic_tilt > 0 else "左高右低"
            sections.append(f"### 骨盆分析\n检测到**骨盆倾斜**：{direction}，角度约 **{abs(pelvic_tilt):.1f}°**")
        else:
            sections.append("### 骨盆分析\n骨盆基本水平，无明显倾斜。")
        
        # 4. Stability analysis
        if stability_score >= 80:
            stability_desc = f"**优秀** (得分：{stability_score:.0f}/100)"
        elif stability_score >= 60:
            stability_desc = f"**良好** (得分：{stability_score:.0f}/100)"
        elif stability_score >= 40:
            stability_desc = f"**一般** (得分：{stability_score:.0f}/100)"
        else:
            stability_desc = f"**较差** (得分：{stability_score:.0f}/100)"
        
        sections.append(f"### 稳定性评估\n整体稳定性：{stability_desc}")
        
        # Combine sections
        report = "\n\n".join(sections)
        
        return {
            "metrics": {
                "shoulderAngle": round(shoulder_angle, 2),
                "headRotation": round(head_rotation, 2),
                "headTilt": round(head_tilt, 2),
                "headForward": round(head_forward, 2),
                "pelvicTilt": round(pelvic_tilt, 2),
                "stabilityScore": round(stability_score, 2)
            },
            "narrative": report
        }

def process_time_series(view: str, landmarks_sequence: List[List[Dict[str, float]]]) -> Dict[str, Any]:
    """
    Full pipeline: Centering -> Statistics -> Structured Report Generation.
    Returns both structured metrics and narrative report.
    """
    import traceback
    try:
        narrator = PostureNarrator()
        # 1. Coordinate Centering
        centered = narrator.center_coordinates(landmarks_sequence)
        # 2. Statistics
        stats = narrator.calculate_statistics(centered)
        # 3. Generate structured report with metrics
        structured_report = narrator.generate_structured_report(view, stats)
        # 4. Legacy narration (for backward compatibility)
        narration = narrator.narrate(view, stats)
        
        return {
            "view": view,
            "stats": stats,
            "metrics": structured_report["metrics"],  # Structured metrics
            "narration": structured_report["narrative"],  # Structured narrative
            "legacy_narration": narration  # Keep old format for compatibility
        }
    except Exception as e:
        print(f"[ERROR] process_time_series failed: {e}", flush=True)
        traceback.print_exc()
        # Return empty result on error
        return {
            "view": view,
            "stats": {},
            "metrics": {},
            "narration": f"处理失败：{str(e)}",
            "legacy_narration": f"处理失败：{str(e)}"
        }
