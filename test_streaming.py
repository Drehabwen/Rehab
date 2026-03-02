"""
测试流式输出功能
"""
import asyncio
import websockets
import json

async def test_streaming():
    uri = "ws://localhost:8002/ws/analyze"
    
    print("正在连接到后端...")
    async with websockets.connect(uri) as websocket:
        print("连接成功！")
        
        # 模拟发送深度分析请求
        message = {
            "type": "POSTURE_DEEP_ANALYSIS",
            "view": "front",
            "width": 640,
            "height": 480,
            "timeSeriesLandmarks": [
                [
                    {"x": 0.5, "y": 0.3, "z": 0.0},  # nose
                    {"x": 0.4, "y": 0.35, "z": 0.0}, # left_shoulder
                    {"x": 0.6, "y": 0.35, "z": 0.0}, # right_shoulder
                    # ... 添加更多关键点
                ]
            ],
            "requestId": "test-123"
        }
        
        print("发送深度分析请求...")
        await websocket.send(json.dumps(message))
        print("请求已发送")
        
        # 接收响应
        print("等待响应...")
        while True:
            try:
                response = await websocket.recv()
                data = json.loads(response)
                print(f"\n收到消息类型：{data.get('type')}")
                
                if data.get('type') == 'POSTURE_ACK':
                    print(f"ACK: {data}")
                elif data.get('type') == 'DEEP_REPORT_STREAM':
                    print(f"流式内容：{data.get('content', '')[:50]}...")
                elif data.get('type') == 'POSTURE_REPORT':
                    print(f"完整报告收到！长度：{len(data.get('markdown', ''))}")
                    print(f"报告预览：{data.get('markdown', '')[:100]}...")
                    break
            except Exception as e:
                print(f"错误：{e}")
                break

if __name__ == "__main__":
    asyncio.run(test_streaming())
