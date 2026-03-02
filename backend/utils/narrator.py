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
        descriptions.append(f"评估视角: {view}")
        
        for name, data in stats.items():
            m = data["mean"]
            s = data["std"]
            t = data["trend"]
            
            desc = (f"- {name.replace('_', ' ').title()}: "
                    f"平均位置({m['x']:.4f}, {m['y']:.4f}, {m['z']:.4f}), "
                    f"稳定性(标准差 X:{s['x']:.4f}, Y:{s['y']:.4f}), "
                    f"移动趋势(斜率 X:{t['x']:.6f})")
            descriptions.append(desc)
            
        return "\n".join(descriptions)

def process_time_series(view: str, landmarks_sequence: List[List[Dict[str, float]]]) -> Dict[str, Any]:
    """
    Full pipeline: Centering -> Statistics -> Narration.
    """
    import traceback
    try:
        narrator = PostureNarrator()
        # 1. Coordinate Centering
        centered = narrator.center_coordinates(landmarks_sequence)
        # 2. Statistics
        stats = narrator.calculate_statistics(centered)
        # 3. Narration
        narration = narrator.narrate(view, stats)
        
        return {
            "view": view,
            "stats": stats,
            "narration": narration
        }
    except Exception as e:
        print(f"[ERROR] process_time_series failed: {e}", flush=True)
        traceback.print_exc()
        # Return empty result on error
        return {
            "view": view,
            "stats": {},
            "narration": f"处理失败: {str(e)}"
        }
