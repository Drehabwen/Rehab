import numpy as np
from typing import Dict, Any, List, Optional, Union

def get_pixel_coords(landmark: Dict[str, float], width: int, height: int) -> Dict[str, float]:
    """Convert normalized landmarks to pixel coordinates."""
    return {
        "x": landmark["x"] * width,
        "y": landmark["y"] * height
    }

def calculate_angle(p1: Dict[str, float], p2: Dict[str, float], p3: Dict[str, float]) -> float:
    """Calculate the angle between three points in degrees (2D)."""
    v1 = np.array([p1["x"] - p2["x"], p1["y"] - p2["y"]])
    v2 = np.array([p3["x"] - p2["x"], p3["y"] - p2["y"]])
    
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
        
    unit_v1 = v1 / norm1
    unit_v2 = v2 / norm2
    
    dot_product = np.dot(unit_v1, unit_v2)
    angle = np.arccos(np.clip(dot_product, -1.0, 1.0))
    
    return float(np.degrees(angle))

def calculate_signed_angle(p1: Dict[str, float], p2: Dict[str, float], p3: Dict[str, float]) -> float:
    """Calculate signed angle between three points in degrees (2D)."""
    v1 = np.array([p1["x"] - p2["x"], p1["y"] - p2["y"]])
    v2 = np.array([p3["x"] - p2["x"], p3["y"] - p2["y"]])
    
    angle1 = np.arctan2(v1[1], v1[0])
    angle2 = np.arctan2(v2[1], v2[0])
    
    angle_rad = angle1 - angle2
    
    # Normalize to -PI to +PI
    while angle_rad <= -np.pi: angle_rad += 2 * np.pi
    while angle_rad > np.pi: angle_rad -= 2 * np.pi
    
    return float(np.degrees(angle_rad))

def calculate_midpoint(p1: Dict[str, float], p2: Dict[str, float]) -> Dict[str, float]:
    """Calculate midpoint between two points."""
    return {
        "x": (p1["x"] + p2["x"]) / 2,
        "y": (p1["y"] + p2["y"]) / 2
    }

# --- 3D Vector Operations ---

def calculate_vector_3d(a: Dict[str, float], b: Dict[str, float]) -> Dict[str, float]:
    return {
        "x": b["x"] - a["x"],
        "y": b["y"] - a["y"],
        "z": b["z"] - a["z"]
    }

def dot_product_3d(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    return v1["x"] * v2["x"] + v1["y"] * v2["y"] + v1["z"] * v2["z"]

def magnitude_3d(v: Dict[str, float]) -> float:
    return float(np.sqrt(v["x"]**2 + v["y"]**2 + v["z"]**2))

def calculate_angle_3d(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    dot = dot_product_3d(v1, v2)
    mag1 = magnitude_3d(v1)
    mag2 = magnitude_3d(v2)
    
    if mag1 == 0 or mag2 == 0:
        return 0.0
    
    cos_angle = dot / (mag1 * mag2)
    cos_angle = np.clip(cos_angle, -1.0, 1.0)
    
    return float(np.degrees(np.acos(cos_angle)))

def calculate_midpoint_3d(p1: Dict[str, float], p2: Dict[str, float]) -> Dict[str, float]:
    return {
        "x": (p1["x"] + p2["x"]) / 2,
        "y": (p1["y"] + p2["y"]) / 2,
        "z": (p1["z"] + p2["z"]) / 2
    }

def normalize_3d(v: Dict[str, float]) -> Dict[str, float]:
    mag = magnitude_3d(v)
    if mag == 0:
        return {"x": 0.0, "y": 0.0, "z": 0.0}
    return {
        "x": v["x"] / mag,
        "y": v["y"] / mag,
        "z": v["z"] / mag
    }

def cross_product_3d(a: Dict[str, float], b: Dict[str, float]) -> Dict[str, float]:
    return {
        "x": a["y"] * b["z"] - a["z"] * b["y"],
        "y": a["z"] * b["x"] - a["x"] * b["z"],
        "z": a["x"] * b["y"] - a["y"] * b["x"]
    }

def calculate_angle_between_vectors_2d(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    """Calculate the absolute angle between two 2D vectors in degrees."""
    dot = v1["x"] * v2["x"] + v1["y"] * v2["y"]
    mag1 = np.sqrt(v1["x"]**2 + v1["y"]**2)
    mag2 = np.sqrt(v2["x"]**2 + v2["y"]**2)
    if mag1 == 0 or mag2 == 0:
        return 0.0
    cos_angle = dot / (mag1 * mag2)
    return float(np.degrees(np.acos(np.clip(cos_angle, -1.0, 1.0))))

def calculate_signed_angle_between_vectors_2d(v1: Dict[str, float], v2: Dict[str, float]) -> float:
    """Calculate the signed angle from v1 to v2 in degrees."""
    angle1 = np.arctan2(v1["y"], v1["x"])
    angle2 = np.arctan2(v2["y"], v2["x"])
    diff = angle2 - angle1
    while diff > np.pi: diff -= 2 * np.pi
    while diff < -np.pi: diff += 2 * np.pi
    return float(np.degrees(diff))
