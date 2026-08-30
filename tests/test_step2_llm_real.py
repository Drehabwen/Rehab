import asyncio
import websockets
import json
import time

async def test_llm_connectivity():
    uri = "ws://localhost:8000/ws/analyze"
    print(f"📡 Connecting to {uri}...")
    
    try:
        # Disable ping interval to prevent timeout during long LLM generation
        async with websockets.connect(uri, ping_interval=None, ping_timeout=None) as websocket:
            print("✅ WebSocket Connection: SUCCESS")
            
            # Create dummy landmarks (33 points)
            dummy_landmarks = []
            for i in range(33):
                dummy_landmarks.append({
                    "x": 0.5 + (i * 0.01),
                    "y": 0.5 + (i * 0.01),
                    "z": 0.0,
                    "visibility": 1.0
                })
            
            # Create SteppedAnalysisRequest payload
            msg_stepped = {
                "type": "POSTURE_STEPPED_ANALYSIS",
                "frames": [
                    {
                        "view": "front",
                        "width": 640,
                        "height": 480,
                        "timeSeriesLandmarks": [dummy_landmarks], # 1 frame
                        "timestamp": int(time.time() * 1000)
                    }
                ]
            }
            
            print("📤 Sending POSTURE_STEPPED_ANALYSIS request (Trigger LLM)...")
            await websocket.send(json.dumps(msg_stepped))
            
            # Wait for response (might take a few seconds for LLM)
            print("⏳ Waiting for LLM response...")
            response = await websocket.recv()
            
            data = json.loads(response)
            if data.get("type") == "HTML_REPORT":
                print("✅ Received HTML_REPORT")
                print(f"Report ID: {data.get('reportId')}")
                print(f"HTML Content Length: {len(data.get('html', ''))}")
                if len(data.get('html', '')) > 100:
                    print("✅ HTML content seems valid (length > 100)")
                else:
                    print("⚠️ HTML content is suspicious (too short)")

                if data.get("timeSeries"):
                    print(f"Time Series data generated (length: {len(data.get('timeSeries'))})")
                    print(f"First data point: {data.get('timeSeries')[0]}")
                else:
                    print("Warning: No Time Series data generated")
            else:
                print(f"❌ Unexpected response type: {data.get('type')}")
                print(data)

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm_connectivity())
