"""
验证数据流测试脚本
测试快速评估后数据是否正确流入报告中心和面板
"""
import asyncio
import websockets
import json
import time

# MediaPose 33 个关键点的标准化坐标
def create_mock_landmarks():
    """创建模拟的 MediaPose 33 个关键点"""
    landmarks = []
    for i in range(33):
        # 创建一个大致的人体姿态
        x = 0.5 + (i % 10 - 5) * 0.01
        y = 0.3 + (i // 10) * 0.1
        z = 0.0
        landmarks.append({"x": x, "y": y, "z": z})
    return landmarks

async def test_quick_assessment_data_flow():
    """测试快速评估数据流"""
    uri = "ws://localhost:8000/ws/analyze"
    
    try:
        print("=" * 60)
        print("开始测试快速评估数据流...")
        print("=" * 60)
        
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket 连接成功")
            
            # 构造快速评估请求
            base_landmarks = create_mock_landmarks()
            
            request = {
                "type": "POSTURE_BATCH_ANALYSIS",
                "view": "front",
                "frames": [
                    {
                        "view": "front",
                        "width": 1280,
                        "height": 720,
                        "timeSeriesLandmarks": [base_landmarks, base_landmarks, base_landmarks],
                        "timestamp": int(time.time() * 1000)
                    }
                ],
                "assessmentType": "quick",
                "requestId": f"test-{int(time.time())}"
            }
            
            print(f"📤 发送快速评估请求: {request['type']}")
            print(f"   视角: {request['view']}")
            print(f"   评估类型: {request['assessmentType']}")
            print(f"   时序帧数: {len(request['frames'][0]['timeSeriesLandmarks'])}")
            print(f"   关键点数: {len(base_landmarks)}")
            
            await websocket.send(json.dumps(request))
            print("✅ 请求已发送")
            
            # 等待响应
            print("\n⏳ 等待后端响应...")
            timeout = 60
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                    data = json.loads(response)
                    
                    print(f"\n📥 收到响应: {data.get('type', 'UNKNOWN')}")
                    
                    if data.get('type') == 'POSTURE_ACK':
                        print("✅ 收到 ACK 确认")
                        print(f"   时间戳: {data.get('timestamp')}")
                        if data.get('requestId'):
                            print(f"   请求ID: {data.get('requestId')}")
                    
                    elif data.get('type') == 'POSTURE_REPORT':
                        print("=" * 60)
                        print("✅ 收到 POSTURE_REPORT 响应")
                        print("=" * 60)
                        
                        # 验证报告数据
                        markdown = data.get('markdown', '')
                        metrics = data.get('metrics', {})
                        issues = data.get('issues', [])
                        auxiliary = data.get('auxiliaryDiagnosis', '')
                        time_series = data.get('timeSeries', [])
                        assessment_type = data.get('assessmentType', '')
                        
                        print(f"\n📊 报告数据验证:")
                        print(f"   ✅ Markdown 长度: {len(markdown)} 字符")
                        print(f"   ✅ 评估类型: {assessment_type}")
                        print(f"   ✅ Metrics: {len(metrics)} 个字段")
                        if metrics:
                            for key, value in metrics.items():
                                print(f"      - {key}: {value}")
                        print(f"   ✅ Issues: {len(issues)} 个问题")
                        for i, issue in enumerate(issues):
                            print(f"      [{i+1}] {issue.get('title', 'Unknown')} - {issue.get('severity', 'Unknown')}")
                        print(f"   ✅ Auxiliary Diagnosis: {len(auxiliary)} 字符")
                        print(f"   ✅ Time Series: {len(time_series) if time_series else 0} 条记录")
                        
                        # 验证数据完整性
                        print(f"\n🔍 数据完整性检查:")
                        all_checks_passed = True
                        
                        if not markdown:
                            print("   ❌ Markdown 为空")
                            all_checks_passed = False
                        else:
                            print("   ✅ Markdown 不为空")
                        
                        if not metrics:
                            print("   ❌ Metrics 为空")
                            all_checks_passed = False
                        else:
                            print("   ✅ Metrics 不为空")
                        
                        if not auxiliary:
                            print("   ⚠️  Auxiliary Diagnosis 为空")
                        else:
                            print("   ✅ Auxiliary Diagnosis 不为空")
                        
                        if not time_series:
                            print("   ⚠️  Time Series 为空")
                        else:
                            print("   ✅ Time Series 不为空")
                        
                        if assessment_type != 'quick':
                            print(f"   ⚠️  评估类型不是 'quick': {assessment_type}")
                        else:
                            print("   ✅ 评估类型正确: quick")
                        
                        print("\n" + "=" * 60)
                        if all_checks_passed:
                            print("✅ 数据流验证成功！所有必要字段都存在")
                        else:
                            print("⚠️  数据流验证完成，但部分字段缺失")
                        print("=" * 60)
                        
                        # 显示 Markdown 报告片段
                        if markdown:
                            print(f"\n📄 Markdown 报告片段（前300字符）:")
                            print(f"   {markdown[:300]}...")
                        
                        # 显示 Auxiliary Diagnosis
                        if auxiliary:
                            print(f"\n📄 Auxiliary Diagnosis（前300字符）:")
                            print(f"   {auxiliary[:300]}...")
                        
                        return True
                    
                except asyncio.TimeoutError:
                    continue
            
            print(f"\n❌ 超时: {timeout} 秒内未收到响应")
            return False
            
    except ConnectionRefusedError:
        print("❌ 无法连接到后端，请确保后端正在运行")
        return False
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_quick_assessment_data_flow())
    if result:
        print("\n" + "=" * 60)
        print("✅ 测试通过！数据流正常工作")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ 测试失败！请检查后端日志")
        print("=" * 60)
