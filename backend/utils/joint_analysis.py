from typing import Dict, List, Optional, Union, Any
import math
from .math_utils import (
    calculate_angle, calculate_signed_angle, calculate_midpoint, 
    get_pixel_coords, calculate_vector_3d, calculate_angle_3d, 
    calculate_midpoint_3d, normalize_3d, cross_product_3d, dot_product_3d,
    calculate_angle_between_vectors_2d, calculate_signed_angle_between_vectors_2d
)

# MediaPipe Pose Landmark Indices
LANDMARKS = {
    'NOSE': 0,
    'LEFT_SHOULDER': 11,
    'RIGHT_SHOULDER': 12,
    'LEFT_ELBOW': 13,
    'RIGHT_ELBOW': 14,
    'LEFT_WRIST': 15,
    'RIGHT_WRIST': 16,
    'LEFT_PINKY': 17,
    'RIGHT_PINKY': 18,
    'LEFT_INDEX': 19,
    'RIGHT_INDEX': 20,
    'LEFT_THUMB': 21,
    'RIGHT_THUMB': 22,
    'LEFT_HIP': 23,
    'RIGHT_HIP': 24,
    'LEFT_KNEE': 25,
    'RIGHT_KNEE': 26,
    'LEFT_ANKLE': 27,
    'RIGHT_ANKLE': 28,
    'LEFT_HEEL': 29,
    'RIGHT_HEEL': 30,
    'LEFT_FOOT_INDEX': 31,
    'RIGHT_FOOT_INDEX': 32,
    'LEFT_EAR': 7,
    'RIGHT_EAR': 8,
}

def calculate_joint_angle(
    joint_type: str,
    direction: str,
    landmarks: List[Dict[str, float]],
    width: int,
    height: int,
    side: Optional[str] = None,
    world_landmarks: Optional[List[Dict[str, float]]] = None
) -> Optional[float]:
    if not landmarks or len(landmarks) == 0:
        return None

    try:
        if joint_type == 'cervical':
            return calculate_cervical_rom(direction, landmarks, width, height, world_landmarks)
        elif joint_type == 'shoulder':
            return calculate_shoulder_rom(direction, side, landmarks, width, height)
        elif joint_type == 'thoracolumbar':
            return calculate_thoracolumbar_rom(direction, landmarks, width, height)
        elif joint_type == 'elbow':
            return calculate_elbow_rom(direction, side, landmarks, width, height)
        elif joint_type == 'wrist':
            return calculate_wrist_rom(direction, side, landmarks, width, height)
        elif joint_type == 'hip':
            return calculate_hip_rom(direction, side, landmarks, width, height)
        elif joint_type == 'knee':
            return calculate_knee_rom(direction, side, landmarks, width, height)
        elif joint_type == 'ankle':
            return calculate_ankle_rom(direction, side, landmarks, width, height)
        else:
            return None
    except Exception as e:
        print(f"Error calculating angle for {joint_type} {direction}: {e}")
        return None

def calculate_cervical_rom(direction, landmarks, width, height, world_landmarks=None):
    if world_landmarks and len(world_landmarks) > 0:
        nose = world_landmarks[LANDMARKS['NOSE']]
        left_ear = world_landmarks[LANDMARKS['LEFT_EAR']]
        right_ear = world_landmarks[LANDMARKS['RIGHT_EAR']]
        left_shoulder = world_landmarks[LANDMARKS['LEFT_SHOULDER']]
        right_shoulder = world_landmarks[LANDMARKS['RIGHT_SHOULDER']]
        
        ear_mid = calculate_midpoint_3d(left_ear, right_ear)
        shoulder_mid = calculate_midpoint_3d(left_shoulder, right_shoulder)
        hip_mid = calculate_midpoint_3d(world_landmarks[LANDMARKS['LEFT_HIP']], world_landmarks[LANDMARKS['RIGHT_HIP']])

        torso_up = normalize_3d(calculate_vector_3d(hip_mid, shoulder_mid))
        torso_right = normalize_3d(calculate_vector_3d(left_shoulder, right_shoulder))
        torso_forward = cross_product_3d(torso_right, torso_up)
        torso_right_ortho = normalize_3d(cross_product_3d(torso_up, torso_forward))

        if direction in ['flexion', 'extension']:
            neck_vector = calculate_vector_3d(shoulder_mid, ear_mid)
            dot_right = dot_product_3d(neck_vector, torso_right_ortho)
            neck_sagittal = {
                "x": neck_vector["x"] - dot_right * torso_right_ortho["x"],
                "y": neck_vector["y"] - dot_right * torso_right_ortho["y"],
                "z": neck_vector["z"] - dot_right * torso_right_ortho["z"]
            }
            y_sag = dot_product_3d(neck_sagittal, torso_up)
            x_sag = dot_product_3d(neck_sagittal, torso_forward)
            angle_sag = math.atan2(x_sag, y_sag) * (180 / math.pi)
            return angle_sag if direction == 'flexion' else -angle_sag

        elif direction in ['left-lateral-flexion', 'right-lateral-flexion']:
            neck_vector = calculate_vector_3d(shoulder_mid, ear_mid)
            dot_fwd = dot_product_3d(neck_vector, torso_forward)
            neck_coronal = {
                "x": neck_vector["x"] - dot_fwd * torso_forward["x"],
                "y": neck_vector["y"] - dot_fwd * torso_forward["y"],
                "z": neck_vector["z"] - dot_fwd * torso_forward["z"]
            }
            y_cor = dot_product_3d(neck_coronal, torso_up)
            x_cor = dot_product_3d(neck_coronal, torso_right_ortho)
            angle_cor = math.atan2(x_cor, y_cor) * (180 / math.pi)
            return angle_cor if direction == 'right-lateral-flexion' else -angle_cor

        elif direction in ['left-rotation', 'right-rotation']:
            ear_line = calculate_vector_3d(left_ear, right_ear)
            dot_up = dot_product_3d(ear_line, torso_up)
            ear_transverse = {
                "x": ear_line["x"] - dot_up * torso_up["x"],
                "y": ear_line["y"] - dot_up * torso_up["y"],
                "z": ear_line["z"] - dot_up * torso_up["z"]
            }
            x_trans = dot_product_3d(ear_transverse, torso_right_ortho)
            y_trans = dot_product_3d(ear_transverse, torso_forward)
            angle_rot = math.atan2(y_trans, x_trans) * (180 / math.pi)
            return angle_rot if direction == 'left-rotation' else -angle_rot

    # 2D Fallback
    nose = get_pixel_coords(landmarks[LANDMARKS['NOSE']], width, height)
    left_ear = get_pixel_coords(landmarks[LANDMARKS['LEFT_EAR']], width, height)
    right_ear = get_pixel_coords(landmarks[LANDMARKS['RIGHT_EAR']], width, height)
    ear_mid = calculate_midpoint(left_ear, right_ear)
    
    left_shoulder = get_pixel_coords(landmarks[LANDMARKS['LEFT_SHOULDER']], width, height)
    right_shoulder = get_pixel_coords(landmarks[LANDMARKS['RIGHT_SHOULDER']], width, height)
    shoulder_mid = calculate_midpoint(left_shoulder, right_shoulder)
    
    left_hip = get_pixel_coords(landmarks[LANDMARKS['LEFT_HIP']], width, height)
    right_hip = get_pixel_coords(landmarks[LANDMARKS['RIGHT_HIP']], width, height)
    hip_mid = calculate_midpoint(left_hip, right_hip)

    if direction in ['flexion', 'extension']:
        v_torso = {"x": shoulder_mid["x"] - hip_mid["x"], "y": shoulder_mid["y"] - hip_mid["y"]}
        v_head = {"x": ear_mid["x"] - shoulder_mid["x"], "y": ear_mid["y"] - shoulder_mid["y"]}
        angle_rad = math.atan2(v_head["y"], v_head["x"]) - math.atan2(v_torso["y"], v_torso["x"])
        angle_deg = math.degrees(angle_rad)
        while angle_deg <= -180: angle_deg += 360
        while angle_deg > 180: angle_deg -= 360
        is_facing_left = nose["x"] < left_ear["x"]
        return -angle_deg if is_facing_left else angle_deg
    
    elif direction in ['left-rotation', 'right-rotation']:
        n = landmarks[LANDMARKS['NOSE']]
        le = landmarks[LANDMARKS['LEFT_EAR']]
        re = landmarks[LANDMARKS['RIGHT_EAR']]
        if 'z' not in n or 'z' not in le or 'z' not in re: return 0.0
        mid_ear_z = (le['z'] + re['z']) / 2
        mid_ear_x = (le['x'] + re['x']) / 2
        vec_head = {"x": n['x'] - mid_ear_x, "z": n['z'] - mid_ear_z}
        z_scale = 2.5
        yaw_angle = math.atan2(vec_head['x'], -vec_head['z'] * z_scale) * (180 / math.pi)
        return -yaw_angle if direction == 'left-rotation' else yaw_angle

    elif direction in ['left-lateral-flexion', 'right-lateral-flexion']:
        v_torso = {"x": shoulder_mid["x"] - hip_mid["x"], "y": shoulder_mid["y"] - hip_mid["y"]}
        v_head = {"x": ear_mid["x"] - shoulder_mid["x"], "y": ear_mid["y"] - shoulder_mid["y"]}
        angle_rad = math.atan2(v_head["y"], v_head["x"]) - math.atan2(v_torso["y"], v_torso["x"])
        angle_deg = math.degrees(angle_rad)
        while angle_deg <= -180: angle_deg += 360
        while angle_deg > 180: angle_deg -= 360
        return -angle_deg

    return 0.0

def calculate_shoulder_rom(direction, side, landmarks, width, height):
    if not side: return 0.0
    get_p = lambda idx: get_pixel_coords(landmarks[idx], width, height)
    shoulder = get_p(LANDMARKS['LEFT_SHOULDER'] if side == 'left' else LANDMARKS['RIGHT_SHOULDER'])
    elbow = get_p(LANDMARKS['LEFT_ELBOW'] if side == 'left' else LANDMARKS['RIGHT_ELBOW'])
    hip = get_p(LANDMARKS['LEFT_HIP'] if side == 'left' else LANDMARKS['RIGHT_HIP'])
    opp_shoulder = get_p(LANDMARKS['RIGHT_SHOULDER'] if side == 'left' else LANDMARKS['LEFT_SHOULDER'])
    wrist = get_p(LANDMARKS['LEFT_WRIST'] if side == 'left' else LANDMARKS['RIGHT_WRIST'])

    if direction in ['flexion', 'extension']:
        # Vector from shoulder to hip (representing the torso)
        v_torso = {"x": hip["x"] - shoulder["x"], "y": hip["y"] - shoulder["y"]}
        # Vector from shoulder to elbow (representing the upper arm)
        v_arm = {"x": elbow["x"] - shoulder["x"], "y": elbow["y"] - shoulder["y"]}
        
        # Calculate signed angle from torso to arm
        angle = calculate_signed_angle_between_vectors_2d(v_torso, v_arm)
        
        # In a typical side view (facing left/right):
        # Forward movement (flexion) and backward movement (extension)
        # The sign depends on which way the user is facing.
        # We'll return the absolute angle for now as a simple ROM measure,
        # but the direction could be used to separate them.
        if direction == 'flexion':
            return abs(angle) if angle > 0 else 0.0 # Adjusted based on test results
        else:
            return abs(angle) if angle < 0 else 0.0

    elif direction in ['abduction', 'adduction']:
        v_torso = {"x": hip["x"] - shoulder["x"], "y": hip["y"] - shoulder["y"]}
        v_arm = {"x": elbow["x"] - shoulder["x"], "y": elbow["y"] - shoulder["y"]}
        angle = calculate_signed_angle_between_vectors_2d(v_torso, v_arm)
        
        # Based on test: v_torso (0, 0.3), v_arm (-0.3, 0) -> angle 90
        # For left shoulder, abduction (away from body) is 90
        if side == 'left':
            if direction == 'abduction': return max(0, angle)
            else: return max(0, -angle)
        else:
            if direction == 'abduction': return max(0, -angle)
            else: return max(0, angle)

    elif direction in ['internal-rotation', 'external-rotation']:
        # Simplified rotation logic using 2D projection
        # angle between forearm and torso line
        return abs(calculate_angle(shoulder, elbow, wrist) - 90)
    return 0.0

def calculate_thoracolumbar_rom(direction, landmarks, width, height):
    get_p = lambda idx: get_pixel_coords(landmarks[idx], width, height)
    l_shoulder = get_p(LANDMARKS['LEFT_SHOULDER'])
    r_shoulder = get_p(LANDMARKS['RIGHT_SHOULDER'])
    shoulder_mid = calculate_midpoint(l_shoulder, r_shoulder)
    
    l_hip = get_p(LANDMARKS['LEFT_HIP'])
    r_hip = get_p(LANDMARKS['RIGHT_HIP'])
    hip_mid = calculate_midpoint(l_hip, r_hip)

    # Vector from hip to shoulder (representing the torso)
    v_torso = {"x": shoulder_mid["x"] - hip_mid["x"], "y": shoulder_mid["y"] - hip_mid["y"]}
    
    if direction in ['flexion', 'extension']:
        # In side view, we compare torso vector to vertical
        # Assuming facing side, vertical is (0, -1)
        v_vertical = {"x": 0, "y": -1}
        angle = calculate_angle_between_vectors_2d(v_vertical, v_torso)
        
        # Determine if it's flexion or extension based on relative position
        # This usually requires knowing which way the user is facing.
        # For simplicity, we'll return the absolute deviation from vertical.
        return angle

    elif direction in ['left-lateral-flexion', 'right-lateral-flexion']:
        # In front view, compare torso vector to vertical
        v_vertical = {"x": 0, "y": -1}
        angle = calculate_signed_angle_between_vectors_2d(v_vertical, v_torso)
        
        if direction == 'right-lateral-flexion':
            return max(0, angle)
        else:
            return max(0, -angle)

    return 0.0

def calculate_elbow_rom(direction, side, landmarks, width, height):
    if not side: return 0.0
    get_p = lambda idx: get_pixel_coords(landmarks[idx], width, height)
    shoulder = get_p(LANDMARKS['LEFT_SHOULDER'] if side == 'left' else LANDMARKS['RIGHT_SHOULDER'])
    elbow = get_p(LANDMARKS['LEFT_ELBOW'] if side == 'left' else LANDMARKS['RIGHT_ELBOW'])
    wrist = get_p(LANDMARKS['LEFT_WRIST'] if side == 'left' else LANDMARKS['RIGHT_WRIST'])
    
    # Vector from elbow to shoulder (upper arm)
    v_upper = {"x": shoulder["x"] - elbow["x"], "y": shoulder["y"] - elbow["y"]}
    # Vector from elbow to wrist (forearm)
    v_forearm = {"x": wrist["x"] - elbow["x"], "y": wrist["y"] - elbow["y"]}
    
    angle = calculate_signed_angle_between_vectors_2d(v_upper, v_forearm)
    
    # Fully extended is 180 degrees. Let's normalize so 0 is fully extended.
    if angle > 0: norm_angle = 180 - angle
    else: norm_angle = 180 + angle
    
    if direction == 'flexion':
        return abs(norm_angle)
    elif direction == 'extension':
        # Extension beyond straight is hyperextension, usually small or 0
        return max(0, -norm_angle) if angle > 0 else max(0, norm_angle) # Simplified
    
    return abs(norm_angle)

def calculate_knee_rom(direction, side, landmarks, width, height):
    if not side: return 0.0
    get_p = lambda idx: get_pixel_coords(landmarks[idx], width, height)
    hip = get_p(LANDMARKS['LEFT_HIP'] if side == 'left' else LANDMARKS['RIGHT_HIP'])
    knee = get_p(LANDMARKS['LEFT_KNEE'] if side == 'left' else LANDMARKS['RIGHT_KNEE'])
    ankle = get_p(LANDMARKS['LEFT_ANKLE'] if side == 'left' else LANDMARKS['RIGHT_ANKLE'])
    
    # Vector from knee to hip (thigh)
    v_thigh = {"x": hip["x"] - knee["x"], "y": hip["y"] - knee["y"]}
    # Vector from knee to ankle (calf)
    v_calf = {"x": ankle["x"] - knee["x"], "y": ankle["y"] - knee["y"]}
    
    angle = calculate_signed_angle_between_vectors_2d(v_thigh, v_calf)
    
    # Normalize so 0 is straight (180 degrees)
    if angle > 0: norm_angle = 180 - angle
    else: norm_angle = 180 + angle
    
    return abs(norm_angle)

def calculate_hip_rom(direction, side, landmarks, width, height):
    if not side: return 0.0
    get_p = lambda idx: get_pixel_coords(landmarks[idx], width, height)
    shoulder = get_p(LANDMARKS['LEFT_SHOULDER'] if side == 'left' else LANDMARKS['RIGHT_SHOULDER'])
    hip = get_p(LANDMARKS['LEFT_HIP'] if side == 'left' else LANDMARKS['RIGHT_HIP'])
    knee = get_p(LANDMARKS['LEFT_KNEE'] if side == 'left' else LANDMARKS['RIGHT_KNEE'])
    
    # Vector from hip to shoulder (torso)
    v_torso = {"x": shoulder["x"] - hip["x"], "y": shoulder["y"] - hip["y"]}
    # Vector from hip to knee (thigh)
    v_thigh = {"x": knee["x"] - hip["x"], "y": knee["y"] - hip["y"]}
    
    angle = calculate_signed_angle_between_vectors_2d(v_torso, v_thigh)
    
    # Normalize so 0 is straight
    if angle > 0: norm_angle = 180 - angle
    else: norm_angle = 180 + angle
    
    if direction == 'flexion':
        return abs(norm_angle) if norm_angle > 0 else 0.0
    elif direction == 'extension':
        return abs(norm_angle) if norm_angle < 0 else 0.0
        
    return abs(norm_angle)

def calculate_wrist_rom(direction, side, landmarks, width, height):
    if not side: return 0.0
    get_p = lambda idx: get_pixel_coords(landmarks[idx], width, height)
    elbow = get_p(LANDMARKS['LEFT_ELBOW'] if side == 'left' else LANDMARKS['RIGHT_ELBOW'])
    wrist = get_p(LANDMARKS['LEFT_WRIST'] if side == 'left' else LANDMARKS['RIGHT_WRIST'])
    index = get_p(LANDMARKS['LEFT_INDEX'] if side == 'left' else LANDMARKS['RIGHT_INDEX'])
    
    # Vector from wrist to elbow (forearm)
    v_forearm = {"x": elbow["x"] - wrist["x"], "y": elbow["y"] - wrist["y"]}
    # Vector from wrist to index finger (hand)
    v_hand = {"x": index["x"] - wrist["x"], "y": index["y"] - wrist["y"]}
    
    angle = calculate_signed_angle_between_vectors_2d(v_forearm, v_hand)
    
    # When forearm and hand are aligned, angle is 180 (signed angle will be 180 or -180)
    # Let's normalize so that 0 is aligned
    if angle > 0: angle -= 180
    else: angle += 180
    
    if direction == 'flexion':
        return abs(angle)
    elif direction == 'extension':
        return abs(angle)
    elif direction == 'ulnar-deviation':
        # Vector from wrist to elbow (forearm)
        v_forearm = {"x": elbow["x"] - wrist["x"], "y": elbow["y"] - wrist["y"]}
        # Vector from wrist to pinky finger
        pinky = get_p(LANDMARKS['LEFT_PINKY'] if side == 'left' else LANDMARKS['RIGHT_PINKY'])
        v_pinky = {"x": pinky["x"] - wrist["x"], "y": pinky["y"] - wrist["y"]}
        angle = calculate_signed_angle_between_vectors_2d(v_forearm, v_pinky)
        # Normalize and determine deviation
        return abs(angle - 180) if angle > 0 else abs(angle + 180)
    elif direction == 'radial-deviation':
        # Vector from wrist to elbow (forearm)
        v_forearm = {"x": elbow["x"] - wrist["x"], "y": elbow["y"] - wrist["y"]}
        # Vector from wrist to thumb
        thumb = get_p(LANDMARKS['LEFT_THUMB'] if side == 'left' else LANDMARKS['RIGHT_THUMB'])
        v_thumb = {"x": thumb["x"] - wrist["x"], "y": thumb["y"] - wrist["y"]}
        angle = calculate_signed_angle_between_vectors_2d(v_forearm, v_thumb)
        return abs(angle - 180) if angle > 0 else abs(angle + 180)
    
    return abs(angle)

def calculate_ankle_rom(direction, side, landmarks, width, height):
    if not side: return 0.0
    get_p = lambda idx: get_pixel_coords(landmarks[idx], width, height)
    knee = get_p(LANDMARKS['LEFT_KNEE'] if side == 'left' else LANDMARKS['RIGHT_KNEE'])
    ankle = get_p(LANDMARKS['LEFT_ANKLE'] if side == 'left' else LANDMARKS['RIGHT_ANKLE'])
    foot = get_p(LANDMARKS['LEFT_FOOT_INDEX'] if side == 'left' else LANDMARKS['RIGHT_FOOT_INDEX'])
    
    # Vector from ankle to knee
    v_calf = {"x": knee["x"] - ankle["x"], "y": knee["y"] - ankle["y"]}
    # Vector from ankle to foot
    v_foot = {"x": foot["x"] - ankle["x"], "y": foot["y"] - ankle["y"]}
    
    angle = calculate_signed_angle_between_vectors_2d(v_calf, v_foot)
    
    # Neutral ankle is ~90 degrees. Normalize so 0 is neutral.
    # angle is likely around 90 or -90.
    if angle > 0: norm_angle = 90 - angle
    else: norm_angle = -90 - angle
    
    if direction == 'dorsiflexion':
        return abs(norm_angle) # Simplified
    elif direction == 'plantarflexion':
        return abs(norm_angle) # Simplified
        
    return abs(norm_angle)
