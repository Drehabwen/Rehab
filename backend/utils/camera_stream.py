import cv2
import mediapipe as mp
import numpy as np
import threading
import time
from typing import Optional, Dict, Any

class CameraManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(CameraManager, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.cap = None
        self.is_running = False
        self.current_frame = None
        self.latest_results = None
        self.thread = None
        
        # Mediapipe setup
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            smooth_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.mp_draw = mp.solutions.drawing_utils
        
        # Beauty settings
        self.enable_beauty = True
        self.beauty_strength = 5
        
        self._initialized = True

    def start(self, device_index: int = 0):
        if self.is_running:
            return
            
        self.cap = cv2.VideoCapture(device_index)
        if not self.cap.isOpened():
            print(f"Error: Could not open camera {device_index}")
            return False
            
        self.is_running = True
        self.thread = threading.Thread(target=self._capture_loop, daemon=True)
        self.thread.start()
        print("Camera Manager started")
        return True

    def stop(self):
        self.is_running = False
        if self.thread:
            self.thread.join(timeout=2)
        if self.cap:
            self.cap.release()
        self.cap = None
        print("Camera Manager stopped")

    def _apply_beauty(self, frame):
        if not self.enable_beauty:
            return frame
            
        # 1. Skin Smoothing (Bilateral Filter)
        # This is computationally expensive but looks great
        smooth = cv2.bilateralFilter(frame, d=9, sigmaColor=75, sigmaSpace=75)
        
        # 2. Brightness & Contrast (Automatic)
        # Convert to LAB for better luminance control
        lab = cv2.cvtColor(smooth, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
        cl = clahe.apply(l)
        limg = cv2.merge((cl,a,b))
        enhanced = cv2.cvtColor(limg, cv2.COLOR_LAB2BGR)
        
        # 3. Subtle Color Boost
        hsv = cv2.cvtColor(enhanced, cv2.COLOR_BGR2HSV).astype(np.float32)
        hsv[:,:,1] *= 1.1 # Increase saturation by 10%
        hsv[:,:,1] = np.clip(hsv[:,:,1], 0, 255)
        enhanced = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2BGR)
        
        return enhanced

    def _capture_loop(self):
        while self.is_running:
            success, frame = self.cap.read()
            if not success:
                time.sleep(0.1)
                continue
                
            # Flip frame for mirror effect
            frame = cv2.flip(frame, 1)
            
            # Apply Beauty Pipeline
            frame = self._apply_beauty(frame)
            
            # Process with Mediapipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = self.pose.process(rgb_frame)
            
            # Draw landmarks on frame with high quality anti-aliasing
            if results.pose_landmarks:
                self.mp_draw.draw_landmarks(
                    frame, 
                    results.pose_landmarks, 
                    self.mp_pose.POSE_CONNECTIONS,
                    self.mp_draw.DrawingSpec(color=(0, 255, 0), thickness=2, circle_radius=2),
                    self.mp_draw.DrawingSpec(color=(0, 0, 255), thickness=2, circle_radius=2)
                )
                self.latest_results = results.pose_landmarks
            
            # Add a subtle "Live" watermark for professionalism
            cv2.putText(frame, "AI LIVE", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2, cv2.LINE_AA)
            
            # Update current frame
            ret, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
            if ret:
                self.current_frame = buffer.tobytes()
            
            time.sleep(0.01)

    def get_video_frame(self):
        return self.current_frame

    def get_latest_landmarks(self):
        return self.latest_results
