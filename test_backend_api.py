"""
后端 API 测试脚本
用于验证后端 POSTURE_REPORT 响应格式
"""

import asyncio
import json
import websockets
import sys

# 模拟测试数据
test_data = {
    "type": "POSTURE_STEPPED_ANALYSIS",
    "frames": [
        {
            "view": "front",
            "width": 640,
            "height": 480,
            "timeSeriesLandmarks": [
                [
                    {"x": 0.5, "y": 0.2, "z": 0, "visibility": 0.95},  # nose
                    {"x": 0.4, "y": 0.3, "z": 0, "visibility": 0.95},  # left shoulder
                    {"x": 0.6, "y": 0.3, "z": 0, "visibility": 0.95},  # right shoulder
                    {"x": 0.4, "y": 0.5, "z": 0, "visibility": 0.95},  # left hip
                    {"x": 0.6, "y": 0.5, "z": 0, "visibility": 0.95},  # right hip
                ]
            ],
            "timestamp": 1234567890
        }
    ],
    "assessmentType": "quick",
    "mock": True,
    "requestId": f"test_{1234567890}"
}

async def test_data_flow():
    print("=== 开始数据流测试 ===\n")
    print("1. 准备发送测试数据到后端...")
    print(f"   数据类型: {test_data['type']}")
    print(f"   评估类型: {test_data['assessmentType']}")
    print(f"   帧数: {len(test_data['frames'])}")
    print(f"   视角: {test_data['frames'][0]['view']}")
    print()
    
    test_passed = {
        "connection": False,
        "ack_received": False,
        "report_received": False,
        "fields_complete": False
    }
    
    try:
        async with websockets.connect("ws://localhost:8000/ws/analyze") as websocket:
            print("2. WebSocket 连接成功 ✓")
            test_passed["connection"] = True
            
            print("3. 发送 POSTURE_STEPPED_ANALYSIS 请求...\n")
            await websocket.send(json.dumps(test_data))
            
            # 等待 ACK
            try:
                ack_response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                ack_data = json.loads(ack_response)
                
                if ack_data.get("type") == "POSTURE_ACK":
                    print("4. 收到 POSTURE_ACK 响应 ✓")
                    test_passed["ack_received"] = True
                    print(f"   请求ID: {ack_data.get('requestId')}")
                    print(f"   时间戳: {ack_data.get('timestamp')}")
                    print()
            except asyncio.TimeoutError:
                print("✗ 等待 ACK 超时")
                return False
            
            # 等待报告
            try:
                report_response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                report_data = json.loads(report_response)
                
                if report_data.get("type") == "POSTURE_REPORT":
                    print("5. 收到 POSTURE_REPORT 响应 ✓")
                    test_passed["report_received"] = True
                    
                    # 检查字段完整性
                    required_fields = [
                        "type", "markdown", "reportId", "timeSeries",
                        "metrics", "auxiliaryDiagnosis", "issues",
                        "timestamp", "assessmentType"
                    ]
                    
                    print("\n6. 字段完整性检查:")
                    all_fields_present = True
                    
                    for field in required_fields:
                        has_field = field in report_data
                        status = "✓" if has_field else "✗"
                        print(f"   {status} {field}: {'存在' if has_field else '缺失'}")
                        if not has_field:
                            all_fields_present = False
                    
                    test_passed["fields_complete"] = all_fields_present
                    
                    # 显示数据详情
                    print("\n7. 数据详情:")
                    print(f"   reportId: {report_data.get('reportId')}")
                    print(f"   markdown长度: {len(report_data.get('markdown', ''))}")
                    print(f"   timeSeries长度: {len(report_data.get('timeSeries', []))}")
                    print(f"   metrics: {json.dumps(report_data.get('metrics', {}), ensure_ascii=False)}")
                    auxiliary = report_data.get('auxiliaryDiagnosis', '')
                    print(f"   auxiliaryDiagnosis: {auxiliary[:50]}...")
                    print(f"   issues数量: {len(report_data.get('issues', []))}")
                    print(f"   timestamp: {report_data.get('timestamp')}")
                    print(f"   assessmentType: {report_data.get('assessmentType')}")
                    
                    issues = report_data.get("issues", [])
                    if issues:
                        print("\n8. Issues 详情:")
                        for idx, issue in enumerate(issues, 1):
                            print(f"   [{idx}] {issue.get('title')} ({issue.get('severity')})")
                            print(f"       描述: {issue.get('description')}")
                            print(f"       建议: {issue.get('recommendation')}")
                    
            except asyncio.TimeoutError:
                print("✗ 等待报告超时")
                return False
            
    except Exception as e:
        print(f"✗ 连接错误: {e}")
        print("请确保后端服务已启动 (python main.py)")
        return False
    
    # 打印测试结果
    print("\n=== 测试结果 ===")
    print(f"连接建立: {'✓ 通过' if test_passed['connection'] else '✗ 失败'}")
    print(f"ACK接收: {'✓ 通过' if test_passed['ack_received'] else '✗ 失败'}")
    print(f"报告接收: {'✓ 通过' if test_passed['report_received'] else '✗ 失败'}")
    print(f"字段完整: {'✓ 通过' if test_passed['fields_complete'] else '✗ 失败'}")
    
    all_passed = all(test_passed.values())
    print(f"\n总体结果: {'✓ 所有测试通过' if all_passed else '✗ 部分测试失败'}")
    
    return all_passed

if __name__ == "__main__":
    result = asyncio.run(test_data_flow())
    sys.exit(0 if result else 1)
