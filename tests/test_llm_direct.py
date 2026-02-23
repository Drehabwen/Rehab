import os
import sys
import logging
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load env vars
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from backend.utils.llm_reporter import generate_posture_report
import time

def test_direct_llm():
    print("🚀 Starting Direct LLM Test...")
    
    # Create dummy data structure matching what main.py passes
    # main.py passes: {"frames": [f.model_dump() for f in frames]}
    # Each frame has timeSeriesLandmarks
    
    dummy_landmarks = []
    for i in range(33):
        dummy_landmarks.append({
            "x": 0.5 + (i * 0.01),
            "y": 0.5 + (i * 0.01),
            "z": 0.0,
            "visibility": 1.0
        })
    
    # Simulate 30 frames (1 second)
    time_series = [dummy_landmarks for _ in range(30)]
    
    frames_data = [
        {
            "view": "front",
            "width": 640,
            "height": 480,
            "timeSeriesLandmarks": time_series,
            "timestamp": int(time.time() * 1000)
        }
    ]
    
    request_data = {
        "frames": frames_data
    }
    
    print("📤 Calling generate_posture_report...")
    start_time = time.time()
    try:
        html_report = generate_posture_report(request_data)
        duration = time.time() - start_time
        print(f"✅ Report Generated in {duration:.2f}s")
        print("-" * 50)
        print(html_report[:500] + "..." if len(html_report) > 500 else html_report)
        print("-" * 50)
        
        if len(html_report) < 100:
            print("⚠️ Warning: Report seems too short!")
        else:
            print("✅ Report length looks good.")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_direct_llm()
