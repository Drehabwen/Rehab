import sys
import os
import json
import random
from typing import List

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models import SteppedAnalysisRequest, SteppedFrame, Landmark
from utils.llm_reporter import generate_posture_report

def create_mock_frame(timestamp: int, view: str) -> SteppedFrame:
    # Create 33 landmarks with slight random noise to simulate movement
    landmarks = []
    for i in range(33):
        landmarks.append(Landmark(
            x=random.uniform(0.4, 0.6),
            y=random.uniform(0.4, 0.6),
            z=random.uniform(-0.1, 0.1),
            visibility=1.0
        ))
    
    # Create a time series of 60 frames (2 seconds at 30fps)
    time_series = []
    for _ in range(60):
        frame_landmarks = []
        for lm in landmarks:
            # Add small noise to each frame in the sequence
            frame_landmarks.append(Landmark(
                x=lm.x + random.uniform(-0.01, 0.01),
                y=lm.y + random.uniform(-0.01, 0.01),
                z=lm.z + random.uniform(-0.01, 0.01),
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

def main():
    print("--- Starting Backend Simulation ---")
    
    # Create mock frames for 3 views
    frames = [
        create_mock_frame(1000, "front"),
        create_mock_frame(2000, "side"),
        create_mock_frame(3000, "back")
    ]
    
    request = SteppedAnalysisRequest(frames=frames)
    
    print(f"Created request with {len(request.frames)} frames.")
    for i, frame in enumerate(request.frames):
        print(f"Frame {i}: View={frame.view}, TimeSeriesLength={len(frame.timeSeriesLandmarks)}")

    # Call the report generation function
    print("\nCalling generate_posture_report...")
    try:
        # Convert Pydantic models to dicts as expected by the function
        analysis_data = {"frames": [f.model_dump() for f in request.frames]}
        report = generate_posture_report(analysis_data)
        
        print("\n--- Report Generated Successfully ---")
        print(f"Report length: {len(report)} chars")
        print("First 500 chars of report:")
        print(report[:500])
        
        # Verify if report contains HTML
        if "<html>" in report or "<div" in report:
            print("\n[PASS] Report contains HTML structure.")
        else:
            print("\n[WARN] Report might not be HTML.")
            
    except Exception as e:
        print(f"\n[FAIL] Error generating report: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
