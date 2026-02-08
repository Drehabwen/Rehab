import pytest
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.posture_analysis import analyze_posture
from models import Landmark

def test_analyze_posture_side_annotations():
    # Mock landmarks for side view with head forward
    # 11: Left Shoulder, 7: Left Ear, 23: Left Hip, 0: Nose
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[11] = Landmark(x=0.5, y=0.5) # Shoulder
    landmarks[7] = Landmark(x=0.6, y=0.4)  # Ear (forward)
    landmarks[23] = Landmark(x=0.5, y=0.8) # Hip
    landmarks[0] = Landmark(x=0.65, y=0.3) # Nose
    
    result = analyze_posture("side", landmarks, 1000, 1000)
    
    # Check if annotations are generated
    assert "annotations" in result
    annotations = result["annotations"]
    
    # Should have shoulder vertical line, forward offset line, and plumb line
    types = [a.type for a in annotations]
    assert "line" in types
    
    # Check for specific properties in plumb line
    plumb_line = next((a for a in annotations if a.label == "垂直参考线"), None)
    assert plumb_line is not None
    assert plumb_line.lineWidth == 2
    assert plumb_line.color == "rgba(255, 255, 0, 0.8)"
    
    # Check head forward issue
    issues = result["issues"]
    assert any(issue.id == "head-forward" for issue in issues)

def test_analyze_posture_front_annotations():
    # Mock landmarks for front view with uneven shoulders
    # 11: L Shoulder, 12: R Shoulder, 23: L Hip, 24: R Hip, 0: Nose, 27: L Ankle, 28: R Ankle
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[11] = Landmark(x=0.4, y=0.3) # L Shoulder (Higher)
    landmarks[12] = Landmark(x=0.6, y=0.35) # R Shoulder (Lower)
    landmarks[23] = Landmark(x=0.45, y=0.7) # L Hip
    landmarks[24] = Landmark(x=0.55, y=0.7) # R Hip
    landmarks[0] = Landmark(x=0.52, y=0.2)  # Nose (shifted right)
    landmarks[27] = Landmark(x=0.45, y=0.9) # L Ankle
    landmarks[28] = Landmark(x=0.55, y=0.9) # R Ankle
    
    result = analyze_posture("front", landmarks, 1000, 1000)
    
    assert "annotations" in result
    annotations = result["annotations"]
    
    # Check for shoulder slope line and midline
    labels = [a.label for a in annotations if a.label]
    assert "身体中轴线" in labels
    assert any("倾斜" in label for label in labels)
    
    # Check issues
    issue_ids = [i.id for i in result["issues"]]
    assert "uneven-shoulders" in issue_ids
    assert "midline-shift" in issue_ids

def test_analyze_posture_head_tilt():
    # Mock landmarks for head tilt
    # 7: L Ear, 8: R Ear
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[7] = Landmark(x=0.45, y=0.2) # L Ear higher
    landmarks[8] = Landmark(x=0.55, y=0.25) # R Ear lower
    
    result = analyze_posture("front", landmarks, 1000, 1000)
    
    issue_ids = [i.id for i in result["issues"]]
    assert "head-tilt" in issue_ids
    
    # Check annotation
    annotations = result["annotations"]
    labels = [a.label for a in annotations if a.label]
    assert any("头倾斜" in label for label in labels)
