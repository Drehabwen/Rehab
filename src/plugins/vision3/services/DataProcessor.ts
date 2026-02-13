import { PostureFrame, Landmark, PostureResult } from '../store/usePostureAssessmentStore';

/**
 * DataProcessor: 负责最硬核的数学计算
 * 1. 多帧中值滤波去噪
 * 2. “以胯为桥”的拼图对齐算法
 * 3. 最终指标提取
 */
export class DataProcessor {
  
  /**
   * 核心入口：处理采样数据并返回对齐后的全身点位
   */
  public static process(upperFrames: PostureFrame[], lowerFrames: PostureFrame[]): PostureResult {
    // 1. 去噪：对上半身和下半身分别进行中值滤波
    const smoothUpper = this.medianFilter(upperFrames);
    const smoothLower = this.medianFilter(lowerFrames);

    // 2. 对齐：以 23/24 号点为基准进行缩放和平移
    const alignedLower = this.alignLowerBody(smoothUpper, smoothLower);

    // 3. 拼接：合成全身点位
    // 上半身取 0-24 号点，下半身取 25-32 号点（避免重合点的冲突，优先使用上半身的胯部点）
    const fullBody: Landmark[] = [...smoothUpper.slice(0, 25)];
    for (let i = 25; i <= 32; i++) {
      fullBody[i] = alignedLower[i];
    }

    return {
      fullBodyLandmarks: fullBody,
      metrics: this.extractMetrics(fullBody),
      timestamp: Date.now()
    };
  }

  /**
   * 中值滤波：消除 Mediapipe 瞬间抖动
   */
  private static medianFilter(frames: PostureFrame[]): Landmark[] {
    if (frames.length === 0) return [];
    
    const landmarkCount = frames[0].landmarks.length;
    const result: Landmark[] = [];

    for (let i = 0; i < landmarkCount; i++) {
      const xVals = frames.map(f => f.landmarks[i].x).sort((a, b) => a - b);
      const yVals = frames.map(f => f.landmarks[i].y).sort((a, b) => a - b);
      const zVals = frames.map(f => f.landmarks[i].z).sort((a, b) => a - b);

      result.push({
        x: xVals[Math.floor(xVals.length / 2)],
        y: yVals[Math.floor(yVals.length / 2)],
        z: zVals[Math.floor(zVals.length / 2)],
        visibility: frames[0].landmarks[i].visibility
      });
    }

    return result;
  }

  /**
   * 拼图对齐算法 (Hip-Bridge Alignment)
   */
  private static alignLowerBody(upper: Landmark[], lower: Landmark[]): Landmark[] {
    // 关键锚点：23 (Left Hip), 24 (Right Hip)
    const u23 = upper[23], u24 = upper[24];
    const l23 = lower[23], l24 = lower[24];

    // 1. 计算缩放比例 (基于胯部宽度)
    const upperHipWidth = Math.sqrt(Math.pow(u23.x - u24.x, 2) + Math.pow(u23.y - u24.y, 2));
    const lowerHipWidth = Math.sqrt(Math.pow(l23.x - l24.x, 2) + Math.pow(l23.y - l24.y, 2));
    const scale = upperHipWidth / lowerHipWidth;

    // 2. 计算平移向量 (将下半身胯部中心移动到上半身胯部中心)
    const upperHipCenter = { x: (u23.x + u24.x) / 2, y: (u23.y + u24.y) / 2 };
    const lowerHipCenter = { x: (l23.x + l24.x) / 2, y: (l23.y + l24.y) / 2 };

    // 3. 应用变换
    return lower.map(p => ({
      x: (p.x - lowerHipCenter.x) * scale + upperHipCenter.x,
      y: (p.y - lowerHipCenter.y) * scale + upperHipCenter.y,
      z: p.z * scale, // Z 轴也同步缩放
      visibility: p.visibility
    }));
  }

  /**
   * 物理指标提取 (示例：头前倾角、高低肩)
   */
  private static extractMetrics(landmarks: Landmark[]): Record<string, number> {
    const metrics: Record<string, number> = {};

    // 示例 1: 高低肩角度 (11: L Shoulder, 12: R Shoulder)
    const sL = landmarks[11], sR = landmarks[12];
    metrics.shoulderIncline = Math.atan2(sL.y - sR.y, sL.x - sR.x) * (180 / Math.PI);

    // 示例 2: 骨盆倾斜度 (23: L Hip, 24: R Hip)
    const hL = landmarks[23], hR = landmarks[24];
    metrics.pelvicIncline = Math.atan2(hL.y - hR.y, hL.x - hR.x) * (180 / Math.PI);

    // 示例 3: 膝关节内翻/外翻趋势 (简单的 X 坐标间距)
    // 25: L Knee, 26: R Knee
    metrics.kneeDistanceRatio = Math.abs(landmarks[25].x - landmarks[26].x) / (sL.x - sR.x);

    return metrics;
  }
}
