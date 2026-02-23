import json
import time
from websocket import create_connection

def test_basic_ws():
    # Changed port to 8002 to avoid conflicts
    uri = "ws://localhost:8002/ws/analyze"
    print(f"📡 Connecting to {uri}...")
    
    try:
        ws = create_connection(uri)
        print("✅ WebSocket Connection: SUCCESS")
    except Exception as e:
        print(f"❌ WebSocket Connection: FAILED ({e})")
        return

    # 1. Test POSTURE_SYNC (Fast Response)
    print("\n--- Testing POSTURE_SYNC (Ping-Pong) ---")
    
    # Minimal valid payload
    landmarks = [{'x': 0.5, 'y': 0.5, 'z': 0.0, 'visibility': 0.9} for _ in range(33)]
    msg_sync = {
        'type': 'POSTURE_SYNC',
        'view': 'front',
        'width': 640,
        'height': 480,
        'timeSeriesLandmarks': [landmarks]
    }
    
    start_time = time.time()
    ws.send(json.dumps(msg_sync))
    print("📤 Sent POSTURE_SYNC request")
    
    try:
        ws.settimeout(5) # 5 seconds is plenty for local processing
        resp = ws.recv()
        elapsed = (time.time() - start_time) * 1000
        
        data = json.loads(resp)
        if data.get("type") == "ANALYSIS_RESULT":
            print(f"✅ Received ANALYSIS_RESULT in {elapsed:.2f}ms")
            print(f"   Metrics keys: {list(data.get('metrics', {}).keys())}")
        else:
            print(f"⚠️ Received unexpected type: {data.get('type')}")
            
    except Exception as e:
        print(f"❌ Failed to receive response: {e}")
    finally:
        ws.close()
        print("\nTest Finished.")

if __name__ == "__main__":
    test_basic_ws()
