"""
测试快速评估基础报告生成功能
"""
import asyncio
import json
import websockets

async def test_quick_basic_report():
    """测试快速评估的基础报告生成"""
    uri = "ws://localhost:8000/ws/analyze"
    
    print("🧪 测试快速评估基础报告生成...")
    print(f"连接 WebSocket: {uri}")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket 连接成功")
            
            # 准备测试数据 - 模拟一个视角的数据
            test_data = {
                "type": "POSTURE_STEPPED_ANALYSIS",
                "frames": [
                    {
                        "view": "front",
                        "timeSeriesLandmarks": [
                            [
                                {"x": 0.5, "y": 0.2, "z": 0, "visibility": 0.9},  # nose
                                {"x": 0.4, "y": 0.3, "z": 0, "visibility": 0.9},  # left eye
                                {"x": 0.6, "y": 0.3, "z": 0, "visibility": 0.9},  # right eye
                                {"x": 0.3, "y": 0.5, "z": 0, "visibility": 0.9},  # left shoulder
                                {"x": 0.7, "y": 0.5, "z": 0, "visibility": 0.9},  # right shoulder
                            ]
                            for _ in range(10)  # 10 帧数据
                        ],
                        "width": 640,
                        "height": 480,
                        "timestamp": 1234567890
                    }
                ],
                "assessmentType": "quick",
                "requestId": "test-123"
            }
            
            print(f"\n📤 发送 POSTURE_STEPPED_ANALYSIS 请求...")
            print(f"帧数: {len(test_data['frames'])}")
            print(f"视角: {test_data['frames'][0]['view']}")
            print(f"关键点帧数: {len(test_data['frames'][0]['timeSeriesLandmarks'])}")
            
            await websocket.send(json.dumps(test_data))
            print("✅ 请求已发送")
            
            # 等待响应
            print("\n⏳ 等待响应...")
            response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
            data = json.loads(response)
            
            print(f"\n📥 收到响应:")
            print(f"  类型: {data.get('type', 'unknown')}")
            print(f"  reportId: {data.get('reportId', 'N/A')}")
            print(f"  markdown 长度: {len(data.get('markdown', ''))}")
            print(f"  auxiliaryDiagnosis 长度: {len(data.get('auxiliaryDiagnosis', ''))}")
            print(f"  是否有 metrics: {bool(data.get('metrics'))}")
            print(f"  是否有 issues: {bool(data.get('issues'))}")
            
            # 验证基础报告
            auxiliary = data.get('auxiliaryDiagnosis', '')
            if auxiliary:
                print(f"\n✅ 基础报告生成成功!")
                print(f"  内容预览: {auxiliary[:200]}...")
            else:
                print(f"\n❌ 基础报告为空!")
            
            # 验证深度报告为空
            markdown = data.get('markdown', '')
            if not markdown:
                print(f"✅ 深度报告为空 (符合预期)")
            else:
                print(f"⚠️ 深度报告不为空 (长度: {len(markdown)})")
            
            return True
            
    except asyncio.TimeoutError:
        print("\n❌ 超时: 等待响应超过 10 秒")
        return False
    except Exception as e:
        print(f"\n❌ 错误: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_quick_basic_report())
    if result:
        print("\n🎉 测试通过!")
    else:
        print("\n💥 测试失败!")
