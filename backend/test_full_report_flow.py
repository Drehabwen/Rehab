import asyncio
import json
import sys
import os
import random

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import SteppedFrame, Landmark
from utils.data_cleaner import clean_timeseries
from utils.posture_analysis import analyze_posture
from utils.llm_reporter import generate_posture_report
from utils.narrator import process_time_series


def generate_test_landmark(x, y, z=0.0, visibility=1.0):
    return Landmark(x=x, y=y, z=z, visibility=visibility)


def generate_test_frame(view, num_frames=10, return_dict=False):
    frames = []
    
    base_x = 0.5
    base_y = 0.5
    
    for _ in range(num_frames):
        landmarks = []
        
        for i in range(33):
            jitter_x = random.uniform(-0.01, 0.01)
            jitter_y = random.uniform(-0.01, 0.01)
            jitter_z = random.uniform(-0.001, 0.001)
            
            lm_data = {
                "x": base_x + (i % 5) * 0.05 + jitter_x,
                "y": base_y + (i // 5) * 0.05 + jitter_y,
                "z": jitter_z,
                "visibility": 1.0
            }
            
            if return_dict:
                landmarks.append(lm_data)
            else:
                landmarks.append(Landmark(**lm_data))
        
        frames.append(landmarks)
    
    return frames


def test_data_cleaner():
    print("=" * 60)
    print("TEST 1: 数据清洗模块")
    print("=" * 60)
    
    test_frames = generate_test_frame("front", 20, return_dict=False)
    
    for scope in ["full", "upper", "lower"]:
        print(f"\n测试评估范围: {scope}")
        try:
            cleaned = clean_timeseries(test_frames, scope)
            print(f"  ✅ 成功清洗，得到 {len(cleaned)} 个关键点")
        except Exception as e:
            print(f"  ❌ 失败: {e}")


def test_posture_analysis():
    print("\n" + "=" * 60)
    print("TEST 2: 体态分析模块")
    print("=" * 60)
    
    test_frames = generate_test_frame("front", 10, return_dict=False)
    cleaned = clean_timeseries(test_frames, "full")
    
    for view in ["front", "side", "back"]:
        print(f"\n测试视角: {view}")
        try:
            result = analyze_posture(
                view=view,
                landmarks=cleaned,
                width=1920,
                height=1080
            )
            print(f"  ✅ 分析成功")
            print(f"  指标数: {len([k for k, v in result['metrics'].model_dump().items() if v is not None])}")
        except Exception as e:
            print(f"  ❌ 失败: {e}")


def test_narrator():
    print("\n" + "=" * 60)
    print("TEST 3: 时序数据叙事模块")
    print("=" * 60)
    
    test_frames = generate_test_frame("front", 15, return_dict=True)
    
    for view in ["front", "side", "back"]:
        print(f"\n测试视角: {view}")
        try:
            result = process_time_series(view, test_frames)
            print(f"  ✅ 叙事成功")
            print(f"  统计指标数: {len(result['stats'])}")
        except Exception as e:
            print(f"  ❌ 失败: {e}")


def test_llm_report_generation():
    print("\n" + "=" * 60)
    print("TEST 4: LLM 报告生成")
    print("=" * 60)
    
    frames_data = []
    
    for view in ["front", "side", "back"]:
        frames = generate_test_frame(view, 10, return_dict=True)
        frames_data.append({
            "view": view,
            "timeSeriesLandmarks": frames,
            "width": 1920,
            "height": 1080,
            "timestamp": 1234567890
        })
    
    print("\n正在调用 LLM 生成报告...")
    try:
        report = generate_posture_report({"frames": frames_data})
        print("  ✅ 报告生成成功")
        print(f"  报告长度: {len(report)} 字符")
        
        if "<html" in report.lower() or "<div" in report.lower():
            print("  ✅ 包含 HTML 标签")
        
    except Exception as e:
        print(f"  ❌ 失败: {e}")
        if "Deepseek API key not found" in str(e):
            print("\n💡 提示: 请在 .env 文件中配置 DEEPSEEK_API_KEY")


def main():
    print("\n" + "=" * 60)
    print("全面测试: 报告生成流程")
    print("=" * 60)
    
    test_data_cleaner()
    test_posture_analysis()
    test_narrator()
    test_llm_report_generation()
    
    print("\n" + "=" * 60)
    print("测试完成!")
    print("=" * 60)


if __name__ == "__main__":
    main()
