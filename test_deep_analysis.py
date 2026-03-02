"""
测试深度报告请求
"""
import asyncio
import websockets
import json
import time

def create_realistic_landmarks():
    """创建符合人体结构的 33 个关键点"""
    landmarks = []
    
    # 头部 (0-10)
    landmarks.append({"x": 0.5, "y": 0.2, "z": 0.0})
    landmarks.append({"x": 0.48, "y": 0.18, "z": -0.02})
    landmarks.append({"x": 0.47, "y": 0.18, "z": -0.02})
    landmarks.append({"x": 0.46, "y": 0.18, "z": -0.02})
    landmarks.append({"x": 0.52, "y": 0.18, "z": -0.02})
    landmarks.append({"x": 0.53, "y": 0.18, "z": -0.02})
    landmarks.append({"x": 0.54, "y": 0.18, "z": -0.02})
    landmarks.append({"x": 0.45, "y": 0.2, "z": -0.05})
    landmarks.append({"x": 0.55, "y": 0.2, "z": -0.05})
    landmarks.append({"x": 0.48, "y": 0.22, "z": 0.0})
    landmarks.append({"x": 0.52, "y": 0.22, "z": 0.0})
    
    # 躯干 (11-24)
    landmarks.append({"x": 0.4, "y": 0.35, "z": 0.0})
    landmarks.append({"x": 0.6, "y": 0.35, "z": 0.0})
    landmarks.append({"x": 0.38, "y": 0.5, "z": 0.0})
    landmarks.append({"x": 0.62, "y": 0.5, "z": 0.0})
    landmarks.append({"x": 0.35, "y": 0.65, "z": 0.0})
    landmarks.append({"x": 0.65, "y": 0.65, "z": 0.0})
    landmarks.append({"x": 0.33, "y": 0.68, "z": 0.0})
    landmarks.append({"x": 0.67, "y": 0.68, "z": 0.0})
    landmarks.append({"x": 0.34, "y": 0.67, "z": 0.0})
    landmarks.append({"x": 0.66, "y": 0.67, "z": 0.0})
    landmarks.append({"x": 0.36, "y": 0.66, "z": 0.0})
    landmarks.append({"x": 0.64, "y": 0.66, "z": 0.0})
    landmarks.append({"x": 0.42, "y": 0.6, "z": 0.0})
    landmarks.append({"x": 0.58, "y": 0.6, "z": 0.0})
    
    # 腿部 (25-32)
    landmarks.append({"x": 0.4, "y": 0.75, "z": 0.0})
    landmarks.append({"x": 0.6, "y": 0.75, "z": 0.0})
    landmarks.append({"x": 0.38, "y": 0.9, "z": 0.0})
    landmarks.append({"x": 0.62, "y": 0.9, "z": 0.0})
    landmarks.append({"x": 0.37, "y": 0.95, "z": 0.0})
    landmarks.append({"x": 0.63, "y": 0.95, "z": 0.0})
    landmarks.append({"x": 0.39, "y": 0.98, "z": 0.0})
    landmarks.append({"x": 0.61, "y": 0.98, "z": 0.0})
    
    return landmarks

async def test_deep_analysis():
    """测试深度报告请求"""
    uri = "ws://localhost:8002/ws/analyze"
    
    try:
        print("=" * 60)
        print("测试深度报告请求...")
        print("=" * 60)
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket 连接成功")
            
            landmarks = create_realistic_landmarks()
            
            # Step 1: 发送基础分析请求
            request1 = {
                "type": "POSTURE_SYNC",
                "view": "front",
                "width": 1280,
                "height": 720,
                "timeSeriesLandmarks": [landmarks, landmarks, landmarks],
                "requestId": f"test-{int(time.time())}"
            }
            
            print(f"\n📤 发送 POSTURE_SYNC 请求")
            await websocket.send(json.dumps(request1))
            
            # 等待基础报告
            print("⏳ 等待基础报告...")
            basic_report_received = False
            timeout = 60
            start_time = time.time()
            
            while time.time() - start_time < timeout and not basic_report_received:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    data = json.loads(response)
                    
                    if data.get('type') == 'POSTURE_REPORT':
                        print("\n✅ 收到基础报告")
                        print(f"   isDeepReport: {data.get('isDeepReport', False)}")
                        print(f"   Markdown长度: {len(data.get('markdown', ''))}")
                        basic_report_received = True
                except asyncio.TimeoutError:
                    continue
            
            if not basic_report_received:
                print("❌ 未收到基础报告")
                return False
            
            # Step 2: 发送深度分析请求
            print(f"\n📤 发送 POSTURE_DEEP_ANALYSIS 请求")
            request2 = {
                "type": "POSTURE_DEEP_ANALYSIS",
                "view": "front",
                "width": 1280,
                "height": 720,
                "timeSeriesLandmarks": [landmarks, landmarks, landmarks],
                "requestId": f"deep-{int(time.time())}"
            }
            await websocket.send(json.dumps(request2))
            
            # 等待深度报告
            print("⏳ 等待深度报告...")
            deep_report_received = False
            start_time = time.time()
            deep_timeout = 300  # 5 minutes timeout for deep analysis
            
            while time.time() - start_time < deep_timeout and not deep_report_received:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                    data = json.loads(response)
                    print(f"📥 收到消息: {data.get('type')}", flush=True)
                    
                    if data.get('type') == 'POSTURE_REPORT' and data.get('isDeepReport'):
                        print("\n✅ 收到深度报告")
                        print(f"   isDeepReport: {data.get('isDeepReport')}")
                        print(f"   Markdown长度: {len(data.get('markdown', ''))}")
                        print(f"   Markdown预览: {data.get('markdown', '')[:100]}...")
                        deep_report_received = True
                    elif data.get('type') == 'POSTURE_REPORT':
                        print(f"   收到基础报告，跳过")
                except asyncio.TimeoutError:
                    elapsed = int(time.time() - start_time)
                    if elapsed % 30 == 0:  # Print every 30 seconds
                        print(f"   等待中... 已等待 {elapsed} 秒", flush=True)
                    continue
            
            if not deep_report_received:
                print(f"❌ 未收到深度报告 (等待了 {int(time.time() - start_time)} 秒)")
                return False
            
            print("\n" + "=" * 60)
            print("✅ 测试成功！基础和深度报告都正常")
            print("=" * 60)
            return True
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_deep_analysis())
    exit(0 if result else 1)
