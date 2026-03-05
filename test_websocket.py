import asyncio
import websockets
import json

async def test_posture_stepped_analysis():
    async with websockets.connect("ws://localhost:8002/ws/analyze") as websocket:
        # 构造 POSTURE_STEPPED_ANALYSIS 请求
        message = {
            "type": "POSTURE_STEPPED_ANALYSIS",
            "frames": [{
                "view": "front",
                "timeSeriesLandmarks": [
                    [
                        {"x": 0.5, "y": 0.3, "z": 0.1, "visibility": 1.0},
                        {"x": 0.35, "y": 0.45, "z": 0.0, "visibility": 1.0},
                        {"x": 0.65, "y": 0.43, "z": 0.0, "visibility": 1.0}
                    ],
                    [
                        {"x": 0.5, "y": 0.3, "z": 0.1, "visibility": 1.0},
                        {"x": 0.35, "y": 0.45, "z": 0.0, "visibility": 1.0},
                        {"x": 0.65, "y": 0.43, "z": 0.0, "visibility": 1.0}
                    ]
                ],
                "width": 640,
                "height": 480,
                "timestamp": 1234567890
            }],
            "assessmentType": "quick"
        }
        
        # 发送请求
        await websocket.send(json.dumps(message))
        print("Sent POSTURE_STEPPED_ANALYSIS request")
        
        # 接收响应
        response = await websocket.recv()
        print("Received response:")
        print(response)

if __name__ == "__main__":
    asyncio.run(test_posture_stepped_analysis())
