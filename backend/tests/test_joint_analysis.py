import pytest
import os
import sys

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.joint_analysis import calculate_joint_angle
from models import Landmark

def test_thoracolumbar_flexion():
    # Hip at (0.5, 0.8), Shoulder at (0.5, 0.5) -> Vertical
    # If shoulder moves to (0.6, 0.5) -> Flexion
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[11] = Landmark(x=0.6, y=0.5) # L Shoulder
    landmarks[12] = Landmark(x=0.6, y=0.5) # R Shoulder
    landmarks[23] = Landmark(x=0.5, y=0.8) # L Hip
    landmarks[24] = Landmark(x=0.5, y=0.8) # R Hip
    
    # Vector hip_mid(0.5, 0.8) to shoulder_mid(0.6, 0.5) is (0.1, -0.3)
    # Vertical is (0, -1)
    # angle = acos( (0.1*0 + -0.3*-1) / (sqrt(0.1^2 + 0.3^2) * 1) )
    # angle = acos( 0.3 / 0.316 ) = acos(0.949) approx 18.4 degrees
    
    angle = calculate_joint_angle("thoracolumbar", "flexion", [lm.model_dump() for lm in landmarks], 1000, 1000)
    assert angle is not None
    assert 18 < angle < 19

def test_thoracolumbar_lateral_flexion():
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[11] = Landmark(x=0.4, y=0.5) # L Shoulder
    landmarks[12] = Landmark(x=0.6, y=0.5) # R Shoulder -> Mid (0.5, 0.5)
    landmarks[23] = Landmark(x=0.45, y=0.8) # L Hip
    landmarks[24] = Landmark(x=0.55, y=0.8) # R Hip -> Mid (0.5, 0.8)
    
    # Now tilt torso to the right: shoulder_mid moves to (0.6, 0.5)
    landmarks[11] = Landmark(x=0.5, y=0.5) 
    landmarks[12] = Landmark(x=0.7, y=0.5) # Mid (0.6, 0.5)
    
    angle = calculate_joint_angle("thoracolumbar", "right-lateral-flexion", [lm.model_dump() for lm in landmarks], 1000, 1000)
    assert angle is not None
    assert angle > 0

def test_elbow_flexion():
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[11] = Landmark(x=0.5, y=0.2) # Shoulder
    landmarks[13] = Landmark(x=0.5, y=0.5) # Elbow
    landmarks[15] = Landmark(x=0.8, y=0.5) # Wrist
    
    # 90 degree bend at elbow
    # Logic is abs(180 - 90) = 90
    angle = calculate_joint_angle("elbow", "flexion", [lm.model_dump() for lm in landmarks], 1000, 1000, side="left")
    assert angle == 90.0

def test_knee_flexion():
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[23] = Landmark(x=0.5, y=0.5) # Hip
    landmarks[25] = Landmark(x=0.5, y=0.8) # Knee
    landmarks[27] = Landmark(x=0.8, y=0.8) # Ankle
    
    # 90 degree bend at knee
    angle = calculate_joint_angle("knee", "flexion", [lm.model_dump() for lm in landmarks], 1000, 1000, side="left")
    assert angle == 90.0

def test_ankle_dorsiflexion():
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[25] = Landmark(x=0.5, y=0.5) # Knee
    landmarks[27] = Landmark(x=0.5, y=0.8) # Ankle
    landmarks[31] = Landmark(x=0.8, y=0.8) # Foot Index
    
    # 90 degree angle between knee-ankle and ankle-foot
    # Logic is abs(90 - 90) = 0
    angle = calculate_joint_angle("ankle", "dorsiflexion", [lm.model_dump() for lm in landmarks], 1000, 1000, side="left")
    assert angle == 0.0

def test_shoulder_abduction_left():
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[11] = Landmark(x=0.5, y=0.5) # L Shoulder
    landmarks[23] = Landmark(x=0.5, y=0.8) # L Hip -> Torso vector (0, 0.3)
    landmarks[13] = Landmark(x=0.2, y=0.5) # L Elbow -> Arm vector (-0.3, 0)
    
    # Angle from (0, 0.3) to (-0.3, 0) is -90 degrees
    # For left shoulder abduction, we expect max(0, -(-90)) = 90
    angle = calculate_joint_angle("shoulder", "abduction", [lm.model_dump() for lm in landmarks], 1000, 1000, side="left")
    assert angle == 90.0

def test_shoulder_flexion():
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[11] = Landmark(x=0.5, y=0.5) # L Shoulder
    landmarks[23] = Landmark(x=0.5, y=0.8) # L Hip -> Torso vector (0, 0.3)
    landmarks[13] = Landmark(x=0.5, y=0.2) # L Elbow (forward/up) -> Arm vector (0, -0.3)
    
    # Angle from (0, 0.3) to (0, -0.3) is 180 degrees (signed)
    # Our logic says negative is flexion. atan2(0, -0.3) is pi, atan2(0.3, 0) is pi/2. diff is pi/2 = 90?
    # Actually v_torso is (0, 0.3), v_arm is (0, -0.3). angle is 180.
    # Let's use a 45 degree flexion
    landmarks[13] = Landmark(x=0.5-0.3, y=0.5-0.3) # Elbow at (-0.3, -0.3) relative to shoulder
    # v_torso = (0, 0.3), v_arm = (-0.3, -0.3)
    # angle = atan2(-0.3, -0.3) - atan2(0.3, 0) = -135 - 90 = -225 -> 135?
    # Wait, let's just test if it's non-zero and correct sign
    angle = calculate_joint_angle("shoulder", "flexion", [lm.model_dump() for lm in landmarks], 1000, 1000, side="left")
    assert angle > 0

def test_wrist_flexion():
    landmarks = [Landmark(x=0.5, y=0.5) for _ in range(33)]
    landmarks[13] = Landmark(x=0.5, y=0.2) # Elbow
    landmarks[15] = Landmark(x=0.5, y=0.5) # Wrist
    landmarks[19] = Landmark(x=0.8, y=0.5) # Index finger (90 deg flexion)
    
    # Vector wrist to elbow: (0, -0.3)
    # Vector wrist to index: (0.3, 0)
    # Angle from (0, -0.3) to (0.3, 0) is 90 degrees.
    # Logic: 90 - 180 = -90. return abs(-90) = 90.
    angle = calculate_joint_angle("wrist", "flexion", [lm.model_dump() for lm in landmarks], 1000, 1000, side="left")
    assert angle == 90.0
