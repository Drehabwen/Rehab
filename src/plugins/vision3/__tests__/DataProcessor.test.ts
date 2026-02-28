import { describe, it, expect } from 'vitest';
import { DataProcessor } from '../services/DataProcessor';
import { PostureFrame, Landmark } from '../store/usePostureAssessmentStore';

describe('DataProcessor', () => {
  const privateProcessor = DataProcessor as unknown as {
    medianFilter: (frames: PostureFrame[]) => Landmark[];
    alignLowerBody: (upper: Landmark[], lower: Landmark[]) => Landmark[];
  };
  const createMockLandmarks = (offset = 0): Landmark[] => {
    return Array.from({ length: 33 }, (_, i) => ({
      x: i * 0.01 + offset,
      y: i * 0.02 + offset,
      z: i * 0.03 + offset,
      visibility: 0.9
    }));
  };

  const mockUpperFrames: PostureFrame[] = [
    { timestamp: 1000, landmarks: createMockLandmarks(0) },
    { timestamp: 1100, landmarks: createMockLandmarks(0.01) },
    { timestamp: 1200, landmarks: createMockLandmarks(0.02) },
  ];

  const mockLowerFrames: PostureFrame[] = [
    { timestamp: 2000, landmarks: createMockLandmarks(0.05) },
    { timestamp: 2100, landmarks: createMockLandmarks(0.06) },
    { timestamp: 2200, landmarks: createMockLandmarks(0.07) },
  ];

  it('should correctly perform median filtering', () => {
    // 中值滤波测试：三个点的中值应该是中间那个点 (createMockLandmarks(0.01))
    const result = privateProcessor.medianFilter(mockUpperFrames);
    
    expect(result.length).toBe(33);
    expect(result[0].x).toBeCloseTo(0.01);
    expect(result[0].y).toBeCloseTo(0.01);
  });

  it('should correctly align lower body landmarks', () => {
    const upper = createMockLandmarks(0);
    const lower = createMockLandmarks(0.1); // 偏移 0.1
    
    const aligned = privateProcessor.alignLowerBody(upper, lower);
    
    // 检查胯部中心点 (23, 24) 是否对齐
    const u23 = upper[23], u24 = upper[24];
    const upperCenter = { x: (u23.x + u24.x) / 2, y: (u23.y + u24.y) / 2 };
    
    const a23 = aligned[23], a24 = aligned[24];
    const alignedCenter = { x: (a23.x + a24.x) / 2, y: (a23.y + a24.y) / 2 };
    
    expect(alignedCenter.x).toBeCloseTo(upperCenter.x);
    expect(alignedCenter.y).toBeCloseTo(upperCenter.y);
  });

  it('should process full body correctly', () => {
    const result = DataProcessor.process(mockUpperFrames, mockLowerFrames);
    
    expect(result.fullBodyLandmarks.length).toBe(33);
    expect(result.metrics).toHaveProperty('swayOffset');
    expect(result.metrics).toHaveProperty('shoulderAngle');
    expect(result.metrics).toHaveProperty('hipAngle');
  });

  it('should prepare analysis data for LLM correctly', () => {
    const analysisData = DataProcessor.prepareAnalysisData(mockUpperFrames, mockLowerFrames, 'front');
    
    expect(analysisData.view).toBe('front');
    expect(analysisData.frameCount).toBe(3);
    expect(analysisData.timeSeries.length).toBe(3);
    expect(analysisData.timeSeries[0]).toHaveProperty('metrics');
    expect(analysisData.averages).toHaveProperty('swayOffset');
    expect(analysisData.stability).toHaveProperty('sd');
  });
});
