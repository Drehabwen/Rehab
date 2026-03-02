"""
测试 generate_posture_report
"""
import os
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from dotenv import load_dotenv
dotenv_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)

from backend.utils.llm_reporter import generate_posture_report

# Test data
test_data = {
    "frames": [
        {
            "view": "front",
            "timeSeriesLandmarks": [
                [{"x": 0.5, "y": 0.2, "z": 0.0} for _ in range(33)],
                [{"x": 0.5, "y": 0.2, "z": 0.0} for _ in range(33)],
                [{"x": 0.5, "y": 0.2, "z": 0.0} for _ in range(33)],
            ],
            "width": 1280,
            "height": 720,
            "timestamp": 1234567890
        }
    ],
    "assessment_type": "quick"
}

print("Calling generate_posture_report...")
try:
    result = generate_posture_report(test_data)
    print(f"Result length: {len(result)}")
    print(f"Result preview: {result[:200]}...")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
