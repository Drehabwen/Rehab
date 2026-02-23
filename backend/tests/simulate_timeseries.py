import sys
import os
import json
import random
import math
import logging
from typing import List, Dict, Any
from unittest.mock import MagicMock, patch

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import SteppedAnalysisRequest, SteppedFrame, Landmark
from utils.llm_reporter import generate_posture_report, PostureAgent
from utils.narrator import PostureNarrator

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

def create_sine_wave_frame(timestamp: int, view: str, phase_shift: float = 0.0) -> SteppedFrame:
    """
    Creates a frame sequence with sine wave movement to simulate breathing/swaying.
    """
    # Base position (standing still)
    base_landmarks = []
    for i in range(33):
        base_landmarks.append(Landmark(
            x=0.5, # Center of screen
            y=0.5 + (i * 0.01), # Distributed vertically
            z=0.0,
            visibility=1.0
        ))
    
    # Create a time series of 60 frames (2 seconds at 30fps)
    time_series = []
    for f in range(60):
        frame_landmarks = []
        t = f / 30.0 # Time in seconds
        
        # Simulate breathing/swaying: 
        # Shoulders (11, 12) move up and down slightly
        # Hips (23, 24) sway left and right slightly
        
        sway_x = 0.02 * math.sin(2 * math.pi * 0.5 * t + phase_shift) # 0.5Hz sway
        breath_y = 0.01 * math.sin(2 * math.pi * 0.25 * t) # 0.25Hz breath
        
        for i, lm in enumerate(base_landmarks):
            dx = 0.0
            dy = 0.0
            
            if i in [11, 12]: # Shoulders
                dy = breath_y
            elif i in [23, 24]: # Hips
                dx = sway_x
            
            frame_landmarks.append(Landmark(
                x=lm.x + dx,
                y=lm.y + dy,
                z=lm.z,
                visibility=lm.visibility
            ))
        time_series.append(frame_landmarks)

    return SteppedFrame(
        view=view,
        width=640,
        height=480,
        timeSeriesLandmarks=time_series,
        timestamp=timestamp
    )

def test_narrator_statistics():
    """Verify that PostureNarrator correctly calculates statistics from our sine wave data."""
    print("\n--- Testing Narrator Statistics (Math Logic) ---")
    
    # Create synthetic data: 60 frames of perfect sine wave on X axis
    # Amplitude 0.1, Frequency 0.5Hz => x = 0.1 * sin(pi * t)
    # Expected Std Dev of sin(t) with amplitude A is A / sqrt(2) ≈ 0.707 * A
    # Here A=0.1, so expected std ≈ 0.0707
    
    frames = []
    for i in range(60):
        t = i / 30.0
        val = 0.1 * math.sin(math.pi * t)
        frames.append([{'x': val, 'y': 0.0, 'z': 0.0, 'visibility': 1.0}])
    
    # Narrator expects List[List[Dict]] (frames -> landmarks)
    # We'll pretend landmark 0 (nose) is moving
    centered_sequence = []
    for f in frames:
        # Create a full frame with just nose populated for simplicity
        frame_data = [{'x': 0, 'y': 0, 'z': 0, 'visibility': 0} for _ in range(33)]
        frame_data[0] = f[0] # Nose
        centered_sequence.append(frame_data)
        
    stats = PostureNarrator.calculate_statistics(centered_sequence)
    nose_stats = stats['nose']
    
    print(f"Calculated Nose X StdDev: {nose_stats['std']['x']:.4f}")
    expected_std = 0.1 / math.sqrt(2)
    print(f"Expected Approx StdDev:   {expected_std:.4f}")
    
    if abs(nose_stats['std']['x'] - expected_std) < 0.01:
        print("[PASS] Statistical calculation is accurate.")
    else:
        print("[FAIL] Statistical calculation deviates too much.")

def mock_llm_response(*args, **kwargs):
    """Mocks the OpenAI API response to avoid network calls."""
    class MockChoice:
        message = MagicMock(content="```html\n<div>Mocked Analysis Report</div>\n```")
    
    class MockResponse:
        choices = [MockChoice()]
        
    return MockResponse()

def main():
    print("--- Starting Advanced Backend Simulation ---")
    
    # 1. Verify Math Logic First
    test_narrator_statistics()
    
    # 2. Verify Full Pipeline with Mocked LLM
    print("\n--- Testing Full Pipeline (with Mocked LLM) ---")
    
    frames = [
        create_sine_wave_frame(1000, "front", phase_shift=0.0),
        create_sine_wave_frame(2000, "side", phase_shift=1.57), # 90 deg phase shift
        create_sine_wave_frame(3000, "back", phase_shift=3.14)  # 180 deg phase shift
    ]
    
    request = SteppedAnalysisRequest(frames=frames)
    
    # Patch the OpenAI client to avoid real calls
    with patch('utils.llm_reporter.client') as mock_client:
        mock_client.chat.completions.create.side_effect = mock_llm_response
        
        try:
            analysis_data = {"frames": [f.model_dump() for f in request.frames]}
            report = generate_posture_report(analysis_data)
            
            print("\n[SUCCESS] Pipeline executed successfully.")
            print(f"Generated Report: {report}")
            
            # Verify that stats were actually computed before calling LLM
            # We can inspect the internal state of the agent if we want, 
            # but seeing the successful execution is good enough for now.
            
        except Exception as e:
            print(f"\n[FAIL] Pipeline execution failed: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    main()
