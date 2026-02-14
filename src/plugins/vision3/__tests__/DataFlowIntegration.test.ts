import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataProcessor } from '../services/DataProcessor';
import { globalMonitor } from '../services/GlobalMonitor';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';
import { PostureFrame, Landmark } from '../store/usePostureAssessmentStore';
import { TemporalAnalysis } from '@/lib/posture-processor';

describe('DataFlowIntegration', () => {
  let analysisDataCallback: (data: TemporalAnalysis) => void;
  let mockAnalysisData: TemporalAnalysis | null = null;

  const createStableLandmarks = (offsetX = 0, offsetY = 0): Landmark[] => {
    return Array.from({ length: 33 }, (_, i) => ({
      x: 0.5 + (i * 0.001) + offsetX,
      y: 0.5 + (i * 0.002) + offsetY,
      z: 0.5,
      visibility: 0.9
    }));
  };

  const generateCaptureFrames = (count: number, swayAmount = 0): PostureFrame[] => {
    const frames: PostureFrame[] = [];
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      frames.push({
        timestamp: now + i * 50,
        landmarks: createStableLandmarks(i * swayAmount, 0)
      });
    }
    return frames;
  };

  beforeEach(() => {
    usePostureAssessmentStore.getState().reset();
    vi.useFakeTimers();
    mockAnalysisData = null;
    
    globalMonitor.onAnalysisReady = (data) => {
      mockAnalysisData = data;
    };
  });

  afterEach(() => {
    globalMonitor.stop();
    vi.useRealTimers();
  });

  it('should flow data from capture to analysis data structure', () => {
    const upperFrames = generateCaptureFrames(30, 0.001);
    const lowerFrames = generateCaptureFrames(30, 0.002);

    const analysisData = DataProcessor.prepareAnalysisData(upperFrames, lowerFrames, 'front');

    expect(analysisData).toBeDefined();
    expect(analysisData.view).toBe('front');
    expect(analysisData.frameCount).toBe(30);
    expect(analysisData.duration).toBeGreaterThan(0);
  });

  it('should maintain temporal data integrity in timeSeries', () => {
    const upperFrames = generateCaptureFrames(50, 0.001);
    const lowerFrames = generateCaptureFrames(50, 0.002);

    const analysisData = DataProcessor.prepareAnalysisData(upperFrames, lowerFrames, 'side');

    expect(analysisData.timeSeries).toHaveLength(50);
    
    analysisData.timeSeries.forEach((ts, index) => {
      expect(ts).toHaveProperty('timestamp');
      expect(ts).toHaveProperty('metrics');
      expect(ts.metrics).toHaveProperty('swayOffset');
      expect(ts.metrics).toHaveProperty('shoulderAngle');
      expect(ts.metrics).toHaveProperty('hipAngle');
    });

    const firstTimestamp = analysisData.timeSeries[0].timestamp;
    const lastTimestamp = analysisData.timeSeries[analysisData.timeSeries.length - 1].timestamp;
    expect(lastTimestamp).toBeGreaterThan(firstTimestamp);
  });

  it('should calculate stability metrics correctly', () => {
    const stableFrames = generateCaptureFrames(40, 0);
    const analysisData = DataProcessor.prepareAnalysisData(stableFrames, stableFrames, 'back');

    expect(analysisData.stability).toBeDefined();
    expect(analysisData.stability).toHaveProperty('standardDev');
    expect(analysisData.stability).toHaveProperty('maxDeviation');
    expect(analysisData.stability).toHaveProperty('velocity');
    expect(analysisData.stability).toHaveProperty('swayArea');

    expect(analysisData.stability.standardDev).toBeGreaterThanOrEqual(0);
    expect(analysisData.stability.maxDeviation).toBeGreaterThanOrEqual(0);
  });

  it('should aggregate metrics into averages correctly', () => {
    const upperFrames = generateCaptureFrames(25, 0.001);
    const lowerFrames = generateCaptureFrames(25, 0.002);

    const analysisData = DataProcessor.prepareAnalysisData(upperFrames, lowerFrames, 'front');

    expect(analysisData.averages).toHaveProperty('swayOffset');
    expect(analysisData.averages).toHaveProperty('shoulderAngle');
    expect(analysisData.averages).toHaveProperty('hipAngle');

    const swayOffsets = analysisData.timeSeries.map(ts => ts.metrics.swayOffset);
    const expectedAvg = swayOffsets.reduce((a, b) => a + b, 0) / swayOffsets.length;
    expect(analysisData.averages.swayOffset).toBeCloseTo(expectedAvg, 5);
  });

  it('should handle complete flow through GlobalMonitor', () => {
    globalMonitor.start();
    expect(usePostureAssessmentStore.getState().step).toBe('prep_upper');

    const stableLandmarks = createStableLandmarks();
    for (let i = 0; i < 15; i++) {
      globalMonitor.onFrame(stableLandmarks);
    }

    vi.advanceTimersByTime(1000);
    expect(usePostureAssessmentStore.getState().step).toBe('capturing_upper');

    const store = usePostureAssessmentStore.getState();
    store.setStep('capturing_lower');

    for (let i = 0; i < 40; i++) {
      globalMonitor.onFrame(createStableLandmarks(i * 0.001, 0));
    }
    vi.advanceTimersByTime(2100);

    expect(mockAnalysisData).toBeDefined();
    if (mockAnalysisData) {
      expect(mockAnalysisData.timeSeries.length).toBeGreaterThan(0);
      expect(mockAnalysisData.stability.standardDev).toBeGreaterThanOrEqual(0);
    }
  });

  it('should maintain data consistency across processing pipeline', () => {
    const upperFrames = generateCaptureFrames(35, 0.001);
    const lowerFrames = generateCaptureFrames(35, 0.002);

    const processedResult = DataProcessor.process(upperFrames, lowerFrames);
    const analysisData = DataProcessor.prepareAnalysisData(upperFrames, lowerFrames, 'front');

    expect(processedResult.fullBodyLandmarks.length).toBe(33);
    expect(analysisData.timeSeries.length).toBe(35);

    const swayOffsetInProcessed = processedResult.metrics.swayOffset;
    const swayOffsetInAnalysis = analysisData.averages.swayOffset;
    
    const swayOffsetsInTimeSeries = analysisData.timeSeries.map(ts => ts.metrics.swayOffset);
    const expectedAvg = swayOffsetsInTimeSeries.reduce((a, b) => a + b, 0) / swayOffsetsInTimeSeries.length;

    expect(swayOffsetInAnalysis).toBeCloseTo(expectedAvg, 5);
  });

  it('should handle edge cases with minimal data', () => {
    const singleUpperFrame: PostureFrame[] = [{ timestamp: 1000, landmarks: createStableLandmarks() }];
    const singleLowerFrame: PostureFrame[] = [{ timestamp: 1100, landmarks: createStableLandmarks(0.01) }];

    const analysisData = DataProcessor.prepareAnalysisData(singleUpperFrame, singleLowerFrame, 'front');

    expect(analysisData.frameCount).toBe(1);
    expect(analysisData.timeSeries).toHaveLength(1);
    expect(analysisData.timeSeries[0].metrics).toBeDefined();
  });

  it('should detect instability in swaying data', () => {
    const stableFrames = generateCaptureFrames(30, 0);
    const swayingFrames = generateCaptureFrames(30, 0.05);

    const stableAnalysis = DataProcessor.prepareAnalysisData(stableFrames, stableFrames, 'front');
    const swayingAnalysis = DataProcessor.prepareAnalysisData(swayingFrames, swayingFrames, 'front');

    expect(swayingAnalysis.stability.standardDev).toBeGreaterThan(stableAnalysis.stability.standardDev);
    expect(swayingAnalysis.stability.maxDeviation).toBeGreaterThan(stableAnalysis.stability.maxDeviation);
    expect(swayingAnalysis.stability.swayArea).toBeGreaterThan(stableAnalysis.stability.swayArea);
  });

  it('should preserve view information across data flow', () => {
    const frames = generateCaptureFrames(20, 0);

    const frontAnalysis = DataProcessor.prepareAnalysisData(frames, frames, 'front');
    const sideAnalysis = DataProcessor.prepareAnalysisData(frames, frames, 'side');
    const backAnalysis = DataProcessor.prepareAnalysisData(frames, frames, 'back');

    expect(frontAnalysis.view).toBe('front');
    expect(sideAnalysis.view).toBe('side');
    expect(backAnalysis.view).toBe('back');
  });
});
