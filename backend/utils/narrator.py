import numpy as np
from typing import List, Dict, Any, Optional
import logging
from config import config as app_config

logger = logging.getLogger(__name__)

class PostureNarrator:
    """
    Translates raw skeletal keypoint time-series data into natural language descriptions
    and statistical summaries for LLM consumption.
    """
    
    # Mediapipe Landmark Mapping (subset for analysis)
    LANDMARKS = {
        0: "nose",
        7: "left_ear", 8: "right_ear",
        11: "left_shoulder", 12: "right_shoulder",
        23: "left_hip", 24: "right_hip",
        25: "left_knee", 26: "right_knee",
        27: "left_ankle", 28: "right_ankle"
    }

    @staticmethod
    def center_coordinates(landmarks_sequence: List[List[Dict[str, float]]], origin_idx: Optional[int] = None) -> List[List[Dict[str, float]]]:
        """
        Centers landmarks relative to the hip midpoint (default) or a specific origin point.
        Using hip midpoint avoids the asymmetry of centering on a single hip.
        landmarks_sequence: [frame_0, frame_1, ...] where each frame is a list of 33 landmarks.
        """
        centered_sequence = []
        for frame in landmarks_sequence:
            if not frame:
                centered_sequence.append(frame)
                continue

            if origin_idx is None:
                # Use hip midpoint for symmetric centering
                if len(frame) <= 24:
                    centered_sequence.append(frame)
                    continue
                left_hip = frame[23]
                right_hip = frame[24]
                origin_x = (left_hip['x'] + right_hip['x']) / 2
                origin_y = (left_hip['y'] + right_hip['y']) / 2
                origin_z = (left_hip['z'] + right_hip['z']) / 2
            else:
                if len(frame) <= origin_idx:
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
        Positive = left shoulder higher (right shoulder lower).
        Uses atan2 for proper quadrant-aware angle calculation.
        Matches convention in posture_analysis.py and posture-processor.ts.
        """
        if 'left_shoulder' not in stats or 'right_shoulder' not in stats:
            return 0.0

        left_y = stats['left_shoulder']['mean']['y']
        right_y = stats['right_shoulder']['mean']['y']
        left_x = stats['left_shoulder']['mean']['x']
        right_x = stats['right_shoulder']['mean']['x']

        # Y axis is inverted in image coordinates (top is 0)
        # right - left matches posture_analysis.py convention:
        # positive atan2 = left shoulder higher
        dy = right_y - left_y
        dx = right_x - left_x

        if abs(dx) < 1e-6:
            return 0.0

        return float(np.degrees(np.arctan2(dy, dx)))

    @staticmethod
    def calculate_head_rotation(stats: Dict[str, Any]) -> float:
        """
        Calculate head rotation angle (头旋转度数) from nose position.
        Based on nose deviation from midline.
        Uses calibrated mapping: 0.15 normalized deviation ~= 45 degrees rotation.
        """
        if 'nose' not in stats:
            return 0.0

        nose_x = stats['nose']['mean']['x']
        # nose_x is normalized deviation from midline after centering
        # Convert to approximate rotation angle: max deviation ~0.15 = ~45° rotation
        if abs(nose_x) < 0.01:
            return 0.0
        # Use a calibrated mapping: 0.15 normalized = 45°
        rotation = (abs(nose_x) / 0.15) * 45.0
        return min(rotation, 80.0)  # Clamp to anatomical max

    @staticmethod
    def calculate_head_tilt(stats: Dict[str, Any]) -> float:
        """
        Calculate head tilt/lean (头侧倾程度) from ear positions.
        Uses atan2 of ear delta for proper angle calculation,
        consistent with posture_analysis.py convention.
        Positive = left ear higher (right ear lower).
        """
        if 'left_ear' not in stats or 'right_ear' not in stats:
            return 0.0
        left_ear_y = stats['left_ear']['mean']['y']
        right_ear_y = stats['right_ear']['mean']['y']
        left_ear_x = stats['left_ear']['mean']['x']
        right_ear_x = stats['right_ear']['mean']['x']
        dy = right_ear_y - left_ear_y
        dx = right_ear_x - left_ear_x
        if abs(dx) < 1e-6:
            return 0.0
        return float(np.degrees(np.arctan2(dy, dx)))

    @staticmethod
    def calculate_head_forward(stats: Dict[str, Any]) -> float:
        """
        Calculate forward head posture (头前伸比例).
        Returns a normalized ratio (ear-shoulder horizontal / vertical distance),
        consistent with posture_analysis.py convention.
        Higher values indicate more forward head posture.
        """
        if 'nose' not in stats or 'left_shoulder' not in stats or 'right_shoulder' not in stats:
            return 0.0

        nose_z = stats['nose']['mean']['z']
        shoulder_z = (stats['left_shoulder']['mean']['z'] + stats['right_shoulder']['mean']['z']) / 2

        # Forward head = nose is in front of shoulders (positive Z in centered coordinates)
        forward_distance = max(0, nose_z - shoulder_z)

        # Normalize by vertical distance for a dimensionless ratio
        shoulder_y = (stats['left_shoulder']['mean']['y'] + stats['right_shoulder']['mean']['y']) / 2
        vertical_dist = abs(stats['nose']['mean']['y'] - shoulder_y)

        if vertical_dist < 0.01:
            return 0.0

        return forward_distance / vertical_dist  # dimensionless ratio

    @staticmethod
    def calculate_pelvic_tilt(stats: Dict[str, Any]) -> float:
        """
        Calculate pelvic tilt (骨盆倾斜) from hip positions.
        Positive = left hip higher (right hip lower).
        Uses atan2 for proper quadrant-aware angle calculation.
        Matches convention in posture_analysis.py and posture-processor.ts.
        """
        if 'left_hip' not in stats or 'right_hip' not in stats:
            return 0.0

        left_y = stats['left_hip']['mean']['y']
        right_y = stats['right_hip']['mean']['y']
        left_x = stats['left_hip']['mean']['x']
        right_x = stats['right_hip']['mean']['x']

        # right - left matches posture_analysis.py convention:
        # positive atan2 = left hip higher
        dy = right_y - left_y
        dx = right_x - left_x

        if abs(dx) < 1e-6:
            return 0.0

        return float(np.degrees(np.arctan2(dy, dx)))

    @staticmethod
    def calculate_stability_score(stats: Dict[str, Any]) -> float:
        """
        Calculate overall stability score (0-100) based on standard deviations.
        Higher score = more stable.
        Uses a logarithmic-like mapping for better distribution:
          std < 0.005 = excellent (100),
          std > 0.1   = poor (0).
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

        # Map average std to score: std < 0.005 = excellent, std > 0.1 = poor
        # Using a logarithmic-like mapping for better distribution
        if avg_std < 0.005:
            score = 100.0
        elif avg_std > 0.1:
            score = 0.0
        else:
            # Linear interpolation in log space
            score = 100.0 * (1.0 - (np.log10(avg_std * 100) / np.log10(10)))
            score = max(0, min(100, score))
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
        
        # Compute thresholds from config
        shoulder_mild = app_config.POSTURE_THRESHOLDS.get('uneven_shoulders', {}).get('mild', 0.03)
        head_tilt_mild = app_config.POSTURE_THRESHOLDS.get('head_tilt', {}).get('mild', 0.03)

        # Convert normalized thresholds to degrees (same convention as shoulder_angle/pelvic_tilt)
        shoulder_threshold_deg = float(np.degrees(np.arctan(shoulder_mild)))
        head_tilt_threshold_deg = float(np.degrees(np.arctan(head_tilt_mild)))

        # Head rotation uses a different scale (max ~80 deg), use a fixed angle threshold
        head_rotation_threshold = 5.0  # degrees

        # Head forward is now a dimensionless ratio; use a config-derived threshold
        head_forward_mild = app_config.POSTURE_THRESHOLDS.get('head_forward', {}).get('moderate', 0.25)
        head_forward_threshold = head_forward_mild

        # Pelvic tilt uses same angle convention as shoulder
        pelvic_mild = app_config.POSTURE_THRESHOLDS.get('uneven_hips', {}).get('mild', 0.03)
        pelvic_threshold_deg = float(np.degrees(np.arctan(pelvic_mild)))

        # 1. Shoulder analysis
        if abs(shoulder_angle) > shoulder_threshold_deg:
            direction = "左高右低" if shoulder_angle > 0 else "右高左低"
            sections.append(f"### 肩膀分析\n检测到**高低肩**现象：{direction}，角度约 **{abs(shoulder_angle):.1f}°**")
        else:
            sections.append("### 肩膀分析\n双肩基本水平，无明显高低肩现象。")

        # 2. Head analysis
        head_issues = []
        if head_rotation > head_rotation_threshold:
            head_issues.append(f"头部旋转约 **{head_rotation:.1f}°**")
        if abs(head_tilt) > head_tilt_threshold_deg:
            direction = "左倾" if head_tilt > 0 else "右倾"
            head_issues.append(f"头部{direction}约 **{abs(head_tilt):.1f}°**")
        if head_forward > head_forward_threshold:
            head_issues.append(f"头前伸比例约 **{head_forward:.2f}**")

        if head_issues:
            sections.append("### 头部姿势分析\n检测到以下问题：\n" + "\n".join(head_issues))
        else:
            sections.append("### 头部姿势分析\n头部位置正常，无明显异常。")

        # 3. Pelvic analysis
        if abs(pelvic_tilt) > pelvic_threshold_deg:
            direction = "左高右低" if pelvic_tilt > 0 else "右高左低"
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
