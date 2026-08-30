"""
简化版数据流测试 - 直接测试 POSTURE_SYNC (实时模式)
"""
import asyncio
import websockets
import json
import time

# 创建符合 MediaPipe 姿态估计的 33 个关键点
# 参考: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker

def create_realistic_landmarks():
    """创建符合人体结构的 33 个关键点"""
    # 基于 MediaPipe Pose 的关键点定义
    # 0: nose
    # 1-2: left_eye_inner, left_eye
    # 3-4: left_eye_outer, right_eye_inner
    # 5-6: right_eye, right_eye_outer
    # 7-8: left_ear, right_ear
    # 9-10: left_mouth, right_mouth
    # 11-12: left_shoulder, right_shoulder
    # 13-14: left_elbow, right_elbow
    # 15-16: left_wrist, right_wrist
    # 17-18: left_pinky, right_pinky
    # 19-20: left_index, right_index
    # 21-22: left_thumb, right_thumb
    # 23-24: left_hip, right_hip
    # 25-26: left_knee, right_knee
    # 27-28: left_ankle, right_ankle
    # 29-30: left_heel, right_heel
    # 31-32: left_foot_index, right_foot_index
    
    landmarks = []
    
    # 头部 (0-10)
    landmarks.append({"x": 0.5, "y": 0.2, "z": 0.0})  # nose
    landmarks.append({"x": 0.48, "y": 0.18, "z": -0.02})  # left_eye_inner
    landmarks.append({"x": 0.47, "y": 0.18, "z": -0.02})  # left_eye
    landmarks.append({"x": 0.46, "y": 0.18, "z": -0.02})  # left_eye_outer
    landmarks.append({"x": 0.52, "y": 0.18, "z": -0.02})  # right_eye_inner
    landmarks.append({"x": 0.53, "y": 0.18, "z": -0.02})  # right_eye
    landmarks.append({"x": 0.54, "y": 0.18, "z": -0.02})  # right_eye_outer
    landmarks.append({"x": 0.45, "y": 0.2, "z": -0.05})  # left_ear
    landmarks.append({"x": 0.55, "y": 0.2, "z": -0.05})  # right_ear
    landmarks.append({"x": 0.48, "y": 0.22, "z": 0.0})  # left_mouth
    landmarks.append({"x": 0.52, "y": 0.22, "z": 0.0})  # right_mouth
    
    # 躯干 (11-24)
    landmarks.append({"x": 0.4, "y": 0.35, "z": 0.0})  # left_shoulder
    landmarks.append({"x": 0.6, "y": 0.35, "z": 0.0})  # right_shoulder
    landmarks.append({"x": 0.38, "y": 0.5, "z": 0.0})  # left_elbow
    landmarks.append({"x": 0.62, "y": 0.5, "z": 0.0})  # right_elbow
    landmarks.append({"x": 0.35, "y": 0.65, "z": 0.0})  # left_wrist
    landmarks.append({"x": 0.65, "y": 0.65, "z": 0.0})  # right_wrist
    landmarks.append({"x": 0.33, "y": 0.68, "z": 0.0})  # left_pinky
    landmarks.append({"x": 0.67, "y": 0.68, "z": 0.0})  # right_pinky
    landmarks.append({"x": 0.34, "y": 0.67, "z": 0.0})  # left_index
    landmarks.append({"x": 0.66, "y": 0.67, "z": 0.0})  # right_index
    landmarks.append({"x": 0.36, "y": 0.66, "z": 0.0})  # left_thumb
    landmarks.append({"x": 0.64, "y": 0.66, "z": 0.0})  # right_thumb
    landmarks.append({"x": 0.42, "y": 0.6, "z": 0.0})  # left_hip
    landmarks.append({"x": 0.58, "y": 0.6, "z": 0.0})  # right_hip
    
    # 腿部 (25-32)
    landmarks.append({"x": 0.4, "y": 0.75, "z": 0.0})  # left_knee
    landmarks.append({"x": 0.6, "y": 0.75, "z": 0.0})  # right_knee
    landmarks.append({"x": 0.38, "y": 0.9, "z": 0.0})  # left_ankle
    landmarks.append({"x": 0.62, "y": 0.9, "z": 0.0})  # right_ankle
    landmarks.append({"x": 0.37, "y": 0.95, "z": 0.0})  # left_heel
    landmarks.append({"x": 0.63, "y": 0.95, "z": 0.0})  # right_heel
    landmarks.append({"x": 0.39, "y": 0.98, "z": 0.0})  # left_foot_index
    landmarks.append({"x": 0.61, "y": 0.98, "z": 0.0})  # right_foot_index
    
    return landmarks

async def test_posture_sync():
    """测试 POSTURE_SYNC (实时模式)"""
    uri = "ws://localhost:8000/ws/analyze"
    
    try:
        print("=" * 60)
        print("测试 POSTURE_SYNC (实时模式)...")
        print("=" * 60)
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket 连接成功")
            
            landmarks = create_realistic_landmarks()
            
            request = {
                "type": "POSTURE_SYNC",
                "view": "front",
                "width": 1280,
                "height": 720,
                "timeSeriesLandmarks": [landmarks, landmarks, landmarks],
                "requestId": f"test-{int(time.time())}"
            }
            
            print(f"📤 发送 POSTURE_SYNC 请求")
            print(f"   视角: {request['view']}")
            print(f"   关键点数: {len(landmarks)}")
            print(f"   时序帧数: {len(request['timeSeriesLandmarks'])}")
            
            await websocket.send(json.dumps(request))
            print("✅ 请求已发送")
            
            print("\n⏳ 等待响应...")
            timeout = 60
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    data = json.loads(response)
                    
                    msg_type = data.get('type', 'UNKNOWN')
                    print(f"\n📥 收到响应: {msg_type}")
                    
                    if msg_type == 'POSTURE_ACK':
                        print("✅ 收到 ACK")
                    
                    elif msg_type == 'POSTURE_REPORT':
                        print("=" * 60)
                        print("✅ 收到 POSTURE_REPORT")
                        print("=" * 60)
                        
                        markdown = data.get('markdown', '')
                        metrics = data.get('metrics', {})
                        issues = data.get('issues', [])
                        auxiliary = data.get('auxiliaryDiagnosis', '')
                        
                        print(f"\n📊 数据验证:")
                        print(f"   Markdown: {len(markdown)} 字符")
                        print(f"   Metrics: {len(metrics)} 个字段")
                        if metrics:
                            for k, v in list(metrics.items())[:5]:
                                print(f"      - {k}: {v}")
                        print(f"   Issues: {len(issues)} 个")
                        print(f"   Auxiliary: {len(auxiliary)} 字符")
                        
                        success = bool(markdown and metrics)
                        print("\n" + "=" * 60)
                        if success:
                            print("✅ 测试成功！数据完整")
                        else:
                            print("⚠️  数据不完整")
                        print("=" * 60)
                        
                        return success
                    
                except asyncio.TimeoutError:
                    continue
            
            print("\n❌ 超时")
            return False
            
    except Exception as e:
        print(f"❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_posture_sync())
    exit(0 if result else 1)
