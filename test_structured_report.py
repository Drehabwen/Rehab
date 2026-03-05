"""
测试结构化基础报告生成
"""
import sys
sys.path.append('backend')

from utils.narrator import process_time_series
import json

# 模拟正面视角的关键点数据（简化版）
def create_mock_landmarks():
    """创建模拟的正面视角关键点数据"""
    landmarks = []
    
    # 创建 33 个关键点（简化，只创建关键部位）
    for i in range(33):
        landmark = {
            'x': 0.5,  # 中心
            'y': 0.5,
            'z': 0.0,
            'visibility': 1.0
        }
        
        # 设置不同位置
        if i == 0:  # nose
            landmark['x'] = 0.52  # 稍微偏右
            landmark['y'] = 0.3
            landmark['z'] = 0.1  # 稍微前伸
        elif i == 11:  # left_shoulder
            landmark['x'] = 0.35
            landmark['y'] = 0.45
        elif i == 12:  # right_shoulder
            landmark['x'] = 0.65
            landmark['y'] = 0.43  # 稍微高一点
        elif i == 23:  # left_hip
            landmark['x'] = 0.4
            landmark['y'] = 0.7
        elif i == 24:  # right_hip
            landmark['x'] = 0.6
            landmark['y'] = 0.7
        
        landmarks.append(landmark)
    
    return landmarks

# 生成时序数据（5 帧）
time_series_data = []
for frame_idx in range(5):
    frame_landmarks = create_mock_landmarks()
    # 添加轻微抖动
    for lm in frame_landmarks:
        lm['x'] += (frame_idx - 2) * 0.001
        lm['y'] += (frame_idx - 2) * 0.001
    time_series_data.append(frame_landmarks)

print("=" * 60)
print("测试结构化基础报告生成")
print("=" * 60)

# 处理数据
result = process_time_series('front', time_series_data)

print("\n📊 生成的指标 (Metrics):")
print(json.dumps(result['metrics'], indent=2, ensure_ascii=False))

print("\n📝 生成的报告 (Narrative):")
print(result['narration'])

print("\n✅ 测试完成！")
print("\n关键指标说明:")
print(f"  - shoulderAngle: {result['metrics']['shoulderAngle']:.2f}° (高低肩角度，正数=右高左低)")
print(f"  - headRotation: {result['metrics']['headRotation']:.2f}° (头部旋转角度)")
print(f"  - headTilt: {result['metrics']['headTilt']:.2f}cm (头部侧倾距离)")
print(f"  - headForward: {result['metrics']['headForward']:.2f}cm (头前伸距离)")
print(f"  - pelvicTilt: {result['metrics']['pelvicTilt']:.2f}° (骨盆倾斜角度)")
print(f"  - stabilityScore: {result['metrics']['stabilityScore']:.2f}/100 (稳定性得分)")
