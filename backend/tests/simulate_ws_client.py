import asyncio
import websockets
import json
import time
import math
import random

async def simulate_posture_sync():
    uri = "ws://localhost:8002/ws/analyze"
    print(f"Connecting to {uri}...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            # Generate mock landmarks for a 2-second capture (60 frames)
            frames = []
            for f in range(60):
                t = f / 30.0
                landmarks = []
                # Simulate 33 landmarks
                for i in range(33):
                    # Base standing position
                    x = 0.5
                    y = 0.5 + (i * 0.01)
                    z = 0.0
                    
                    # Add some "sway" to shoulders and hips
                    if i in [11, 12, 23, 24]:
                        x += 0.02 * math.sin(2 * math.pi * 0.5 * t)
                        y += 0.01 * math.cos(2 * math.pi * 0.25 * t)
                    
                    landmarks.append({
                        "x": x,
                        "y": y,
                        "z": z,
                        "visibility": 0.9 + random.random() * 0.1
                    })
                frames.append(landmarks)
            
            payload = {
                "type": "POSTURE_SYNC",
                "view": "front",
                "width": 640,
                "height": 480,
                "timeSeriesLandmarks": frames
            }
            
            print(f"Sending POSTURE_SYNC with {len(frames)} frames...")
            await websocket.send(json.dumps(payload))
            
            # Wait for response
            response = await websocket.recv()
            result = json.loads(response)
            print("\nReceived Response:")
            print(f"Type: {result.get('type')}")
            
            if result.get('type') == 'POSTURE_REPORT':
                print("[SUCCESS] Received Markdown Report!")
                print(f"Markdown Content Preview:\n{result.get('markdown', '')[:200]}...")
            else:
                print(f"Metrics: {json.dumps(result.get('metrics'), indent=2)}")
                print(f"Issues found: {len(result.get('issues', []))}")
            
    except Exception as e:
        print(f"Error: {e}")

async def simulate_stepped_analysis():
    uri = "ws://localhost:8002/ws/analyze"
    print(f"\nConnecting to {uri} for stepped analysis...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected!")
            
            views = ["front", "side", "back"]
            frames = []
            
            for view in views:
                # Generate mock landmarks for each view
                view_landmarks_seq = []
                for f in range(30): # 1 second per view
                    t = f / 30.0
                    landmarks = []
                    for i in range(33):
                        x = 0.5 + (0.01 if view == "side" else 0)
                        y = 0.5 + (i * 0.01)
                        # Add some specific posture "issues" for the LLM to find
                        if view == "side" and i == 0: # Nose forward
                            x += 0.05
                        
                        landmarks.append({
                            "x": x,
                            "y": y,
                            "z": 0.0,
                            "visibility": 0.95
                        })
                    view_landmarks_seq.append(landmarks)
                
                frames.append({
                    "view": view,
                    "width": 640,
                    "height": 480,
                    "timeSeriesLandmarks": view_landmarks_seq,
                    "timestamp": int(time.time() * 1000)
                })
            
            payload = {
                "type": "POSTURE_STEPPED_ANALYSIS",
                "frames": frames
            }
            
            print(f"Sending POSTURE_STEPPED_ANALYSIS with {len(views)} views...")
            await websocket.send(json.dumps(payload))
            
            # Wait for POSTURE_REPORT response
            while True:
                response = await websocket.recv()
                result = json.loads(response)
                print(f"Received message type: {result.get('type')}")
                
                if result.get('type') == 'POSTURE_REPORT':
                    print("\n[SUCCESS] Received Markdown Report!")
                    print(f"Report ID: {result.get('reportId')}")
                    print(f"Markdown Content Length: {len(result.get('markdown', ''))}")
                    print(f"Preview (first 100 chars):\n{result.get('markdown', '')[:100]}...")
                    break
                elif result.get('type') == 'ERROR':
                    print(f"[ERROR] {result.get('message')}")
                    break
                    
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # asyncio.run(simulate_posture_sync())
    asyncio.run(simulate_stepped_analysis())
