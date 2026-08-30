#!/usr/bin/env python3
"""
全面数据流测试脚本
测试从后端WebSocket到前端存储的完整数据流
"""

import asyncio
import websockets
import json
import time
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# 测试配置
WS_URL = "ws://localhost:8000/ws/analyze"
TEST_TIMEOUT = 30  # 秒

class DataFlowTest:
    """数据流测试类"""
    
    def __init__(self):
        self.test_results = []
        self.errors = []
        
    def log(self, message: str, level: str = "INFO"):
        """记录日志"""
        timestamp = datetime.now().strftime("%H:%M:%S.%f")[:-3]
        prefix = {"INFO": "ℹ️", "SUCCESS": "✅", "ERROR": "❌", "WARNING": "⚠️"}.get(level, "ℹ️")
        print(f"[{timestamp}] {prefix} {message}")
        
    def record_result(self, test_name: str, passed: bool, details: str = ""):
        """记录测试结果"""
        self.test_results.append({
            "name": test_name,
            "passed": passed,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        
    async def test_websocket_connection(self) -> bool:
        """测试WebSocket连接"""
        self.log("测试1: WebSocket连接", "INFO")
        try:
            async with websockets.connect(WS_URL) as ws:
                self.log("WebSocket连接成功", "SUCCESS")
                self.record_result("WebSocket连接", True, "连接成功")
                return True
        except Exception as e:
            self.log(f"WebSocket连接失败: {e}", "ERROR")
            self.record_result("WebSocket连接", False, str(e))
            return False
            
    async def test_posture_sync_ack(self) -> bool:
        """测试POSTURE_SYNC和ACK响应"""
        self.log("测试2: POSTURE_SYNC和ACK响应", "INFO")
        try:
            async with websockets.connect(WS_URL) as ws:
                # 发送POSTURE_SYNC消息
                test_data = {
                    "type": "POSTURE_SYNC",
                    "view": "front",
                    "width": 640,
                    "height": 480,
                    "landmarks": [
                        {"x": 0.5, "y": 0.3, "z": 0.0, "visibility": 0.95},  # nose
                        {"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 0.95},  # left shoulder
                        {"x": 0.6, "y": 0.5, "z": 0.0, "visibility": 0.95},  # right shoulder
                    ],
                    "timestamp": int(time.time() * 1000)
                }
                
                await ws.send(json.dumps(test_data))
                self.log(f"发送POSTURE_SYNC消息: {test_data['type']}", "INFO")
                
                # 等待ACK响应（可能先收到ACK，也可能先收到REPORT）
                ack_received = False
                report_received = False
                
                for _ in range(2):  # 最多接收2条消息
                    try:
                        response = await asyncio.wait_for(ws.recv(), timeout=5)
                        data = json.loads(response)
                        
                        if data.get("type") == "POSTURE_ACK":
                            self.log(f"收到ACK响应: requestId={data.get('requestId')}", "SUCCESS")
                            ack_received = True
                        elif data.get("type") == "POSTURE_REPORT":
                            self.log(f"收到REPORT响应: reportId={data.get('reportId')}", "INFO")
                            report_received = True
                    except asyncio.TimeoutError:
                        break
                
                if ack_received:
                    self.record_result("POSTURE_SYNC和ACK", True, "ACK received")
                    return True
                elif report_received:
                    self.log("未收到ACK但收到REPORT，视为成功", "SUCCESS")
                    self.record_result("POSTURE_SYNC和ACK", True, "Report received (no ACK)")
                    return True
                else:
                    self.log("未收到任何响应", "ERROR")
                    self.record_result("POSTURE_SYNC和ACK", False, "No response")
                    return False
                    
        except asyncio.TimeoutError:
            self.log("等待ACK响应超时", "ERROR")
            self.record_result("POSTURE_SYNC和ACK", False, "超时")
            return False
        except Exception as e:
            self.log(f"测试失败: {e}", "ERROR")
            self.record_result("POSTURE_SYNC和ACK", False, str(e))
            return False
            
    async def test_posture_batch_analysis(self) -> Dict[str, Any]:
        """测试POSTURE_BATCH_ANALYSIS和报告生成"""
        self.log("测试3: POSTURE_BATCH_ANALYSIS和报告生成", "INFO")
        report_data = None
        
        try:
            async with websockets.connect(WS_URL) as ws:
                # 构造批量分析数据
                # SteppedFrame 期望 timeSeriesLandmarks 是 List[List[Landmark]]
                # 每个 frame 包含多个时间点的 landmarks
                frames = []
                
                # 构建 timeSeriesLandmarks（10个时间点，每个时间点5个关键点）
                time_series_landmarks = []
                for i in range(10):
                    landmarks = [
                        {"x": 0.5 + (i * 0.01), "y": 0.3, "z": 0.0, "visibility": 0.95},  # nose
                        {"x": 0.4, "y": 0.5, "z": 0.0, "visibility": 0.95},  # left shoulder
                        {"x": 0.6, "y": 0.5, "z": 0.0, "visibility": 0.95},  # right shoulder
                        {"x": 0.4, "y": 0.8, "z": 0.0, "visibility": 0.95},  # left hip
                        {"x": 0.6, "y": 0.8, "z": 0.0, "visibility": 0.95},  # right hip
                    ]
                    time_series_landmarks.append(landmarks)
                
                frame = {
                    "view": "front",
                    "timeSeriesLandmarks": time_series_landmarks,
                    "timestamp": int(time.time() * 1000),
                    "width": 640,
                    "height": 480
                }
                frames.append(frame)
                
                batch_data = {
                    "type": "POSTURE_BATCH_ANALYSIS",
                    "view": "front",
                    "assessmentType": "quick",
                    "frames": frames,
                    "timestamp": int(time.time() * 1000)
                }
                
                await ws.send(json.dumps(batch_data))
                self.log(f"发送POSTURE_BATCH_ANALYSIS消息: {len(frames)}帧", "INFO")
                
                # 等待ACK和REPORT（顺序不确定）
                ack_received = False
                report_data = None
                
                for _ in range(2):  # 最多接收2条消息
                    try:
                        # 增加超时时间到60秒，因为LLM调用可能需要较长时间
                        response = await asyncio.wait_for(ws.recv(), timeout=60)
                        data = json.loads(response)
                        
                        if data.get("type") == "POSTURE_ACK":
                            self.log(f"收到ACK: requestId={data.get('requestId')}", "SUCCESS")
                            ack_received = True
                        elif data.get("type") == "POSTURE_REPORT":
                            self.log("收到POSTURE_REPORT响应", "SUCCESS")
                            report_data = data
                    except asyncio.TimeoutError:
                        self.log("等待响应超时（60秒）", "WARNING")
                        break
                
                if not report_data:
                    self.log("未收到POSTURE_REPORT", "ERROR")
                    self.record_result("POSTURE_BATCH_ANALYSIS", False, "未收到报告")
                    return None
                
                if report_data.get("type") == "POSTURE_REPORT":
                    self.log("收到POSTURE_REPORT响应", "SUCCESS")
                    
                    # 验证报告字段
                    required_fields = ["type", "markdown", "reportId", "metrics", "issues", "timestamp", "assessmentType"]
                    missing_fields = [f for f in required_fields if f not in report_data]
                    
                    if missing_fields:
                        self.log(f"报告缺少字段: {missing_fields}", "ERROR")
                        self.record_result("POSTURE_BATCH_ANALYSIS", False, f"缺少字段: {missing_fields}")
                        return None
                    
                    # 验证metrics字段
                    metrics = report_data.get("metrics", {})
                    self.log(f"Metrics: {json.dumps(metrics, indent=2)}", "INFO")
                    
                    # 验证issues字段
                    issues = report_data.get("issues", [])
                    self.log(f"Issues数量: {len(issues)}", "INFO")
                    
                    # 验证markdown字段
                    markdown = report_data.get("markdown", "")
                    self.log(f"Markdown长度: {len(markdown)}字符", "INFO")
                    
                    self.record_result("POSTURE_BATCH_ANALYSIS", True, 
                        f"reportId: {report_data.get('reportId')}, metrics: {list(metrics.keys())}, issues: {len(issues)}")
                    return report_data
                else:
                    self.log(f"收到非报告响应: {report_data.get('type')}", "ERROR")
                    self.record_result("POSTURE_BATCH_ANALYSIS", False, f"收到: {report_data.get('type')}")
                    return None
                    
        except asyncio.TimeoutError:
            self.log("等待报告响应超时", "ERROR")
            self.record_result("POSTURE_BATCH_ANALYSIS", False, "超时")
            return None
        except Exception as e:
            self.log(f"测试失败: {e}", "ERROR")
            self.record_result("POSTURE_BATCH_ANALYSIS", False, str(e))
            return None
            
    async def test_field_consistency(self, report_data: Dict[str, Any]) -> bool:
        """测试字段一致性"""
        self.log("测试4: 字段一致性检查", "INFO")
        
        if not report_data:
            self.log("没有报告数据可供检查", "ERROR")
            self.record_result("字段一致性", False, "无数据")
            return False
            
        issues = []
        
        # 检查metrics字段类型
        metrics = report_data.get("metrics", {})
        expected_metrics = ["shoulderAngle", "hipAngle", "headDeviation"]
        for metric in expected_metrics:
            if metric in metrics:
                if not isinstance(metrics[metric], (int, float)):
                    issues.append(f"metrics.{metric} 类型错误: {type(metrics[metric])}")
            else:
                issues.append(f"缺少metrics.{metric}")
                
        # 检查issues字段结构
        issues_list = report_data.get("issues", [])
        for i, issue in enumerate(issues_list):
            required_issue_fields = ["title", "description", "severity"]
            for field in required_issue_fields:
                if field not in issue:
                    issues.append(f"issues[{i}].{field} 缺失")
                    
        # 检查severity值
        valid_severities = ["mild", "moderate", "severe"]
        for i, issue in enumerate(issues_list):
            severity = issue.get("severity")
            if severity and severity not in valid_severities:
                issues.append(f"issues[{i}].severity 值无效: {severity}")
                
        if issues:
            self.log(f"字段一致性问题:\n" + "\n".join(f"  - {i}" for i in issues), "ERROR")
            self.record_result("字段一致性", False, "; ".join(issues))
            return False
        else:
            self.log("所有字段一致性检查通过", "SUCCESS")
            self.record_result("字段一致性", True, "所有字段正确")
            return True
            
    async def test_data_completeness(self, report_data: Dict[str, Any]) -> bool:
        """测试数据完整性"""
        self.log("测试5: 数据完整性检查", "INFO")
        
        if not report_data:
            self.log("没有报告数据可供检查", "ERROR")
            self.record_result("数据完整性", False, "无数据")
            return False
            
        checks = []
        
        # 检查markdown内容
        markdown = report_data.get("markdown", "")
        if len(markdown) < 10:
            checks.append(f"markdown内容过短: {len(markdown)}字符")
        elif "###" not in markdown:
            checks.append("markdown缺少标题标记")
            
        # 检查metrics值范围
        metrics = report_data.get("metrics", {})
        for key, value in metrics.items():
            if isinstance(value, (int, float)):
                if abs(value) > 1000:  # 异常大的值
                    checks.append(f"metrics.{key} 值异常: {value}")
                    
        # 检查timestamp
        timestamp = report_data.get("timestamp")
        if timestamp:
            current_time = int(time.time() * 1000)
            if abs(current_time - timestamp) > 60000:  # 超过1分钟
                checks.append(f"timestamp时间差过大: {abs(current_time - timestamp)}ms")
                
        if checks:
            self.log(f"数据完整性问题:\n" + "\n".join(f"  - {c}" for c in checks), "WARNING")
            self.record_result("数据完整性", False, "; ".join(checks))
            return False
        else:
            self.log("数据完整性检查通过", "SUCCESS")
            self.record_result("数据完整性", True, "数据完整")
            return True
            
    async def run_all_tests(self):
        """运行所有测试"""
        self.log("=" * 60, "INFO")
        self.log("开始全面数据流测试", "INFO")
        self.log("=" * 60, "INFO")
        print()
        
        # 测试1: WebSocket连接
        if not await self.test_websocket_connection():
            self.log("WebSocket连接失败，中止后续测试", "ERROR")
            return
            
        print()
        
        # 测试2: POSTURE_SYNC和ACK
        await self.test_posture_sync_ack()
        print()
        
        # 测试3: POSTURE_BATCH_ANALYSIS和报告生成
        report_data = await self.test_posture_batch_analysis()
        print()
        
        if report_data:
            # 测试4: 字段一致性
            await self.test_field_consistency(report_data)
            print()
            
            # 测试5: 数据完整性
            await self.test_data_completeness(report_data)
            print()
            
        # 生成测试报告
        self.generate_report()
        
    def generate_report(self):
        """生成测试报告"""
        self.log("=" * 60, "INFO")
        self.log("测试报告", "INFO")
        self.log("=" * 60, "INFO")
        
        passed = sum(1 for r in self.test_results if r["passed"])
        failed = sum(1 for r in self.test_results if not r["passed"])
        total = len(self.test_results)
        
        print(f"\n总计: {total} 项测试")
        print(f"通过: {passed} 项")
        print(f"失败: {failed} 项")
        print(f"成功率: {passed/total*100:.1f}%" if total > 0 else "N/A")
        
        print("\n详细结果:")
        for i, result in enumerate(self.test_results, 1):
            status = "✅ 通过" if result["passed"] else "❌ 失败"
            print(f"  {i}. {result['name']}: {status}")
            if result["details"]:
                print(f"     详情: {result['details']}")
                
        if failed > 0:
            print("\n❌ 存在失败的测试，请检查上述问题")
            return 1
        else:
            print("\n✅ 所有测试通过！")
            return 0

async def main():
    """主函数"""
    tester = DataFlowTest()
    await tester.run_all_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n测试被用户中断")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n测试出错: {e}")
        sys.exit(1)
