import { PoseLandmark } from './vision3-utils';

/**
 * 核心几何计算逻辑
 */
export const Vision3Geometry = {
  /**
   * 检查用户是否在有效采集位置
   * @param landmarks MediaPipe 关键点
   * @param minVisibility 最小可见度阈值
   * @param requiredPoints 必须可见的关键点索引
   */
  checkUserPosition: (
    landmarks: PoseLandmark[] | null,
    minVisibility: number = 0.3,
    requiredPoints: number[] = [0, 11, 12, 23, 24] // Nose, Shoulders, Hips
  ): boolean => {
    if (!landmarks || landmarks.length < 33) return false;
    
    const visibleCount = requiredPoints.reduce((count, idx) => {
      const visibility = landmarks[idx]?.visibility ?? 0;
      return visibility > minVisibility ? count + 1 : count;
    }, 0);

    // 至少需要 3 个核心关键点可见（例如鼻尖和双肩）
    return visibleCount >= 3;
  },

  /**
   * 计算两点间的欧几里得距离（归一化坐标）
   */
  distance: (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
    return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
  },

  /**
   * 检查姿态是否足够稳定（用于自动触发）
   * 通过比较当前帧与上一帧核心点的位移均值
   */
  isStable: (
    current: PoseLandmark[],
    previous: PoseLandmark[],
    threshold: number = 0.01
  ): boolean => {
    const indices = [11, 12, 23, 24]; // 肩和胯
    let totalDist = 0;
    let count = 0;

    indices.forEach(idx => {
      if (current[idx] && previous[idx]) {
        totalDist += Vision3Geometry.distance(current[idx], previous[idx]);
        count++;
      }
    });

    if (count === 0) return false;
    return (totalDist / count) < threshold;
  }
};
