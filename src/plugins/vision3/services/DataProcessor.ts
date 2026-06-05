import { PostureFrame, Landmark, PostureResult } from '../store/usePostureAssessmentStore';
import { PostureMetrics } from '@/hooks/usePostureWS';

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
   * 中值滤波 + 权重平滑：消除 Mediapipe 瞬间抖动并增强稳定性
   */
  private static medianFilter(frames: PostureFrame[]): Landmark[] {
    if (frames.length === 0) return [];
    
    const landmarkCount = frames[0].landmarks.length;
    const result: Landmark[] = [];

    for (let i = 0; i < landmarkCount; i++) {
      // 1. 提取所有帧的坐标
      const xVals = frames.map(f => f.landmarks[i].x);
      const yVals = frames.map(f => f.landmarks[i].y);
      const zVals = frames.map(f => f.landmarks[i].z);
      const visVals = frames.map(f => f.landmarks[i].visibility || 0);

      // 2. 中值滤波：剔除离群值 (Outliers)
      const sortedX = [...xVals].sort((a, b) => a - b);
      const sortedY = [...yVals].sort((a, b) => a - b);
      const sortedZ = [...zVals].sort((a, b) => a - b);
      
      const medianX = sortedX[Math.floor(sortedX.length / 2)];
      const medianY = sortedY[Math.floor(sortedY.length / 2)];
      const medianZ = sortedZ[Math.floor(sortedZ.length / 2)];

      // 3. 权重平均：在剔除离群值的基础上，对剩余值进行加权（优先考虑可见度高的帧）
      // 这里采用简单策略：如果原始值偏离中值太远，则赋予极低权重
      let weightedX = 0, weightedY = 0, weightedZ = 0, totalWeight = 0;
      
      for (let j = 0; j < frames.length; j++) {
        const dx = Math.abs(xVals[j] - medianX);
        const dy = Math.abs(yVals[j] - medianY);
        // 阈值：坐标偏移超过 0.05 则认为是抖动点
        const weight = (dx < 0.05 && dy < 0.05) ? visVals[j] : visVals[j] * 0.1;
        
        weightedX += xVals[j] * weight;
        weightedY += yVals[j] * weight;
        weightedZ += zVals[j] * weight;
        totalWeight += weight;
      }

      result.push({
        x: totalWeight > 0 ? weightedX / totalWeight : medianX,
        y: totalWeight > 0 ? weightedY / totalWeight : medianY,
        z: totalWeight > 0 ? weightedZ / totalWeight : medianZ,
        visibility: visVals.reduce((a, b) => a + b, 0) / visVals.length
      });
    }

    return result;
  }

  /**
   * 拼图对齐算法 (Hip-Bridge Alignment 2.0)
   * 优化：基于可见度的加权对齐，增强缩放计算的稳定性
   */
  private static alignLowerBody(upper: Landmark[], lower: Landmark[]): Landmark[] {
    // 关键锚点：23 (Left Hip), 24 (Right Hip)
    const u23 = upper[23], u24 = upper[24];
    const l23 = lower[23], l24 = lower[24];

    // 1. 计算缩放比例 (基于胯部宽度)
    // 增加可见度权重，如果某次采样的胯部点可见度低，则缩放会抖动
    const upperHipWidth = Math.sqrt(Math.pow(u23.x - u24.x, 2) + Math.pow(u23.y - u24.y, 2));
    const lowerHipWidth = Math.sqrt(Math.pow(l23.x - l24.x, 2) + Math.pow(l23.y - l24.y, 2));
    
    // 增加安全检查，防止分母为 0 或比例过大导致崩溃
    let scale = 1.0;
    if (lowerHipWidth > 0.001) {
      scale = upperHipWidth / lowerHipWidth;
      // 限制缩放范围在 [0.5, 2.0] 之间，防止极端错误
      scale = Math.min(2.0, Math.max(0.5, scale));
    }

    // 2. 计算平移向量 (将下半身胯部中心移动到上半身胯部中心)
    const upperHipCenter = { x: (u23.x + u24.x) / 2, y: (u23.y + u24.y) / 2, z: ((u23.z ?? 0) + (u24.z ?? 0)) / 2 };
    const lowerHipCenter = { x: (l23.x + l24.x) / 2, y: (l23.y + l24.y) / 2, z: ((l23.z ?? 0) + (l24.z ?? 0)) / 2 };

    // 3. 应用变换 (x/y/z 全部经过中心对齐 -> 缩放 -> 平移回目标中心)
    return lower.map(p => ({
      x: (p.x - lowerHipCenter.x) * scale + upperHipCenter.x,
      y: (p.y - lowerHipCenter.y) * scale + upperHipCenter.y,
      z: ((p.z ?? 0) - lowerHipCenter.z) * scale + upperHipCenter.z,
      visibility: p.visibility
    }));
  }

  /**
   * 综合分析并准备发送给后端的数据
   */
  public static prepareAnalysisData(
    upperFrames: PostureFrame[], 
    lowerFrames: PostureFrame[],
    view: 'front' | 'side' | 'back' = 'front'
  ) {
    // 1. 对齐数据
    const alignedFrames: PostureFrame[] = lowerFrames.map((lf, index) => {
      const uf = upperFrames[index] || upperFrames[upperFrames.length - 1];
      const alignedLower = this.alignLowerBody(uf.landmarks, lf.landmarks);
      
      // 合并全身点位 (11-24 来自 upper, 25-32 来自 alignedLower)
      const fullBody = [...uf.landmarks];
      alignedLower.forEach((p, i) => {
        if (i >= 25) fullBody[i] = p;
      });

      return {
        timestamp: lf.timestamp,
        landmarks: fullBody
      };
    });

    // 2. 计算时序指标
    const timeSeries = alignedFrames.map(frame => ({
      timestamp: frame.timestamp,
      metrics: this.extractMetrics(frame.landmarks)
    }));

    // 3. 计算平均值
    const averages: PostureMetrics = {};
    if (timeSeries.length > 0) {
      const sums: Record<string, number> = {};
      timeSeries.forEach(item => {
        Object.entries(item.metrics).forEach(([key, value]) => {
          if (typeof value === 'number') {
            sums[key] = (sums[key] || 0) + value;
          }
        });
      });
      Object.entries(sums).forEach(([key, value]) => {
        (averages[key as keyof PostureMetrics] as number) = value / timeSeries.length;
      });
    }

    // 4. 计算稳定性指标
    const stability = this.calculateStability(timeSeries);

    return {
      view,
      duration: (lowerFrames[lowerFrames.length - 1]?.timestamp || 0) - (lowerFrames[0]?.timestamp || 0),
      frameCount: lowerFrames.length,
      averages,
      stability,
      timeSeries
    };
  }

  /**
   * 提取物理指标 (角度/偏移)
   */
  private static extractMetrics(landmarks: Landmark[]) {
    const getPt = (i: number) => landmarks[i];
    
    // 重心偏移 (以双脚中心为基准)
    const lAnkle = getPt(27), rAnkle = getPt(28);
    const midAnkleX = (lAnkle.x + rAnkle.x) / 2;
    const nose = getPt(0);
    const swayOffset = (nose.x - midAnkleX) * 100; // 转化为毫米量级

    // 肩部倾斜角
    const lShoulder = getPt(11), rShoulder = getPt(12);
    const shoulderAngle = Math.atan2(rShoulder.y - lShoulder.y, rShoulder.x - lShoulder.x) * (180 / Math.PI);

    // 骨盆倾斜角
    const lHip = getPt(23), rHip = getPt(24);
    const hipAngle = Math.atan2(rHip.y - lHip.y, rHip.x - lHip.x) * (180 / Math.PI);

    return {
      swayOffset,
      shoulderAngle,
      hipAngle
    };
  }

  /**
   * 计算稳定性指标
   */
  private static calculateStability(timeSeries: Array<{ timestamp: number; metrics: PostureMetrics }>) {
    const offsets = timeSeries.map(t => (t.metrics.swayOffset ?? 0));
    const mean = offsets.reduce((a, b) => a + b, 0) / offsets.length;
    const standardDev = Math.sqrt(offsets.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / offsets.length);
    const maxDev = Math.max(...offsets.map(v => Math.abs(v - mean)));
    
    // 简易速度计算
    let totalDist = 0;
    for (let i = 1; i < offsets.length; i++) {
      totalDist += Math.abs(offsets[i] - offsets[i-1]);
    }
    const durationSec = (timeSeries[timeSeries.length - 1].timestamp - timeSeries[0].timestamp) / 1000;
    const velocity = durationSec > 0 ? totalDist / durationSec : 0;

    return {
      sd: standardDev,
      maxDeviation: maxDev,
      velocity,
      swayArea: standardDev * maxDev // 粗略估算面积
    };
  }
}
