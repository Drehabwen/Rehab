import json
import time
from websocket import create_connection

def test_full_flow():
    uri = "ws://localhost:8000/ws/analyze"
    print(f"Connecting to {uri}...")
    
    try:
        ws = create_connection(uri)
        print("✅ WebSocket Connected!")
    except Exception as e:
        print(f"❌ WebSocket Connection Failed: {e}")
        return

    # 1. Simulate POSTURE_SYNC (Real-time stream)
    print("\n--- Testing POSTURE_SYNC (Real-time) ---")
    landmarks = [{'x': 0.5, 'y': 0.5, 'z': 0.0, 'visibility': 0.9} for _ in range(33)]
    frames = [landmarks] # Simple single frame
    
    msg_sync = {
        'type': 'POSTURE_SYNC',
        'view': 'front',
        'width': 640,
        'height': 480,
        'timeSeriesLandmarks': frames
    }
    
    ws.send(json.dumps(msg_sync))
    print("Sent POSTURE_SYNC")
    
    # Expect immediate analysis result (or at least no error)
    # The server might not send back anything if frames are insufficient, 
    # but let's check if connection stays alive.
    # In main.py, POSTURE_SYNC sends back AnalysisResponse immediately.
    
    try:
        resp = ws.recv()
        data = json.loads(resp)
        if "metrics" in data:
            print("✅ Received POSTURE_SYNC response with metrics")
        else:
            print(f"⚠️ Received unexpected response: {resp[:100]}...")
    except Exception as e:
        print(f"❌ Failed to receive POSTURE_SYNC response: {e}")

    # 2. Simulate POSTURE_STEPPED_ANALYSIS (Trigger LLM Report)
    print("\n--- Testing POSTURE_STEPPED_ANALYSIS (LLM Report) ---")
    
    # Construct a dummy stepped frame sequence
    # We need enough data to make the LLM think it's a valid session
    stepped_frames = []
    for view in ['front', 'side', 'back']:
        stepped_frames.append({
            'view': view,
            'width': 640,
            'height': 480,
            'timeSeriesLandmarks': [landmarks for _ in range(10)], # 10 frames per view
            'timestamp': int(time.time() * 1000)
        })

    msg_stepped = {
        'type': 'POSTURE_STEPPED_ANALYSIS',
        'frames': stepped_frames
    }
    
    ws.send(json.dumps(msg_stepped))
    print("Sent POSTURE_STEPPED_ANALYSIS (Waiting for LLM...)")
    
    # This might take a few seconds for LLM to generate
    ws.settimeout(30) # 30s timeout for LLM
    
    try:
        while True:
            resp = ws.recv()
            data = json.loads(resp)
            
            if data.get("type") == "HTML_REPORT":
                html_content = data.get("html", "")
                if "Deepseek API key not found" in html_content:
                     print("❌ LLM Error: API Key missing in backend!")
                elif len(html_content) > 100:
                    print("✅ Received HTML_REPORT from LLM!")
                    print(f"Report length: {len(html_content)} chars")
                    print("Snippet:", html_content[:200].replace('\n', ' '))
                else:
                    print("⚠️ Received empty or short report.")
                break
            else:
                print(f"Received intermediate message type: {data.get('type')}")
                
    except Exception as e:
        print(f"❌ Failed to receive LLM Report: {e}")
    finally:
        ws.close()
        print("\nTest Finished.")

if __name__ == "__main__":
    test_full_flow()
