import asyncio
import websockets
import json

async def test_llm_mock():
    uri = "ws://localhost:8002/ws/analyze"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket")
            
            # Create a mock frame with minimal landmark data
            # Need at least one frame with some landmarks
            mock_landmarks = [{"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0} for _ in range(33)]
            
            frame = {
                "view": "front",
                "width": 640,
                "height": 480,
                "timeSeriesLandmarks": [mock_landmarks for _ in range(5)] # 5 frames
            }
            
            # Send mock request
            payload = {
                "type": "POSTURE_STEPPED_ANALYSIS",
                "frames": [frame],
                "mock": True
            }
            
            await websocket.send(json.dumps(payload))
            print("Sent MOCK request")
            
            # Wait for response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                print(f"Received: {json.dumps(data)[:100]}...")
                
                if data.get("type") == "HTML_REPORT" and "[MOCK]" in data.get("html", ""):
                    print("✅ Received MOCK HTML Report successfully")
                else:
                    print(f"❌ Unexpected response: {data}")
            except asyncio.TimeoutError:
                print("❌ Timeout waiting for response")
                
    except Exception as e:
        print(f"❌ Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(test_llm_mock())
