import os
import sys
import json
from dotenv import load_dotenv

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.llm_reporter import generate_posture_report

def log_step(msg):
    with open("test_steps.txt", "a", encoding="utf-8") as f:
        f.write(msg + "\n")
    print(msg)

def test_real_llm_report():
    if os.path.exists("test_steps.txt"):
        os.remove("test_steps.txt")
        
    log_step("--- Starting Real LLM Connection Test ---")
    
    # 1. Load environment variables
    root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
    load_dotenv(root_env)
    
    api_key = (os.getenv("DEEPSEEK_API_KEY") or os.getenv("VITE_DEEPSEEK_API_KEY") or "").strip()
    if not api_key:
        log_step("ERROR: DEEPSEEK_API_KEY (or VITE_DEEPSEEK_API_KEY) not found in .env")
        return

    log_step(f"SUCCESS: Found API Key: {api_key[:6]}...{api_key[-4:]}")

    # 2. Mock analysis data
    mock_data = {
        "view": "front",
        "duration": 2000,
        "frameCount": 60,
        "averages": {
            "shoulderAngle": 5.2,
            "hipAngle": 2.1,
            "headDeviation": 12.5,
            "swayOffset": 15.3
        },
        "stability": {
            "swayArea": 120.5,
            "maxDeviation": 18.2,
            "sd": 4.5,
            "velocity": 1.2
        },
        "timeSeries": [
            {"timestamp": 0, "swayOffset": 10.0, "shoulderAngle": 5.0},
            {"timestamp": 500, "swayOffset": 12.0, "shoulderAngle": 5.2},
            {"timestamp": 1000, "swayOffset": 15.0, "shoulderAngle": 5.1},
            {"timestamp": 1500, "swayOffset": 13.0, "shoulderAngle": 5.3},
            {"timestamp": 2000, "swayOffset": 11.0, "shoulderAngle": 5.2}
        ]
    }

    log_step("START: Sending request to Deepseek...")
    
    try:
        if not generate_posture_report.__module__.startswith('utils'):
             # Ensure we are testing the right function
             log_step(f"DEBUG: Testing function from {generate_posture_report.__module__}")

        report_html = generate_posture_report(mock_data)
        
        # 3. Verify output
        if not report_html:
            log_step("ERROR: Received empty report from LLM")
            return

        log_step(f"SUCCESS: Received LLM report of length {len(report_html)}")
        
        with open("test_report_output.html", "w", encoding="utf-8") as f:
            f.write(report_html)
        log_step("INFO: Saved report to test_report_output.html")
        
        # Check for key requirements
        has_html = "<html" in report_html.lower() or "<div" in report_html.lower()
        has_chart = "rehab-chart" in report_html
        has_tailwind = "tailwindcss.com" in report_html or "cdn.tailwindcss.com" in report_html
        
        log_step(f"  - Contains HTML structure: {'YES' if has_html else 'NO'}")
        log_step(f"  - Contains Charts (rehab-chart): {'YES' if has_chart else 'NO'}")
        log_step(f"  - Contains Tailwind CSS: {'YES' if has_tailwind else 'NO'}")
        
        if has_html:
            log_step("DONE: LLM integration is WORKING!")
            if not has_chart:
                log_step("ADVICE: Consider making chart generation more explicit in the prompt.")
        else:
            log_step("WARNING: Response received but does not look like HTML.")
            log_step(f"PREVIEW: {report_html[:200]}...")
            
    except Exception as e:
        log_step(f"ERROR during LLM call: {type(e).__name__}: {str(e)}")
        import traceback
        log_step(traceback.format_exc())

if __name__ == "__main__":
    test_real_llm_report()
