"""
测试基础报告生成逻辑
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from utils.narrator import process_time_series

def test_process_time_series_returns_narration():
    """
    测试 process_time_series 返回 narration（基础报告内容）
    """
    # Arrange - 准备测试数据
    view = "front"
    landmarks_sequence = [
        [
            {"x": 0.5, "y": 0.5, "z": 0, "visibility": 0.9},
            {"x": 0.5, "y": 0.4, "z": 0, "visibility": 0.9},
        ]
        for _ in range(10)
    ]
    
    # Act - 执行被测代码
    result = process_time_series(view, landmarks_sequence)
    
    # Assert - 验证结果
    assert "view" in result
    assert result["view"] == view
    assert "stats" in result
    assert "narration" in result
    assert isinstance(result["narration"], str)
    assert len(result["narration"]) > 0
    print(f"✅ 测试通过：narration 长度 = {len(result['narration'])}")

def test_basic_report_without_llm():
    """
    测试不调用 LLM 生成基础报告
    """
    # Arrange
    frames = [
        {
            "view": "front",
            "timeSeriesLandmarks": [
                [{"x": 0.5, "y": 0.5, "z": 0, "visibility": 0.9}]
                for _ in range(10)
            ]
        }
    ]
    
    # Act - 生成基础报告（不调用 LLM）
    narrations = []
    for frame in frames:
        res = process_time_series(frame["view"], frame["timeSeriesLandmarks"])
        if res.get("narration"):
            narrations.append(f"### {frame['view']} 视角分析\n\n{res['narration']}")
    
    auxiliary_diagnosis = "\n\n---\n\n".join(narrations)
    
    # Assert
    assert len(auxiliary_diagnosis) > 0
    assert "front" in auxiliary_diagnosis
    print(f"✅ 测试通过：基础报告长度 = {len(auxiliary_diagnosis)}")

if __name__ == "__main__":
    print("🧪 运行基础报告生成测试...")
    test_process_time_series_returns_narration()
    test_basic_report_without_llm()
    print("\n✅ 所有测试通过！")
