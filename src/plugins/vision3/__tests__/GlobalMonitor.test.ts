import { describe, it, expect, beforeEach, vi } from 'vitest';
import { globalMonitor } from '../services/GlobalMonitor';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';

describe('GlobalMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    usePostureAssessmentStore.getState().reset();
  });

  const createStableLandmarks = (visibility = 0.9) => {
    return Array.from({ length: 33 }, () => ({
      x: 0.5,
      y: 0.5,
      z: 0.5,
      visibility
    }));
  };

  it('should start assessment and transition to prep_upper', () => {
    globalMonitor.start();
    expect(usePostureAssessmentStore.getState().step).toBe('prep_upper');
  });

  it('should reset stability if ROI check fails', () => {
    globalMonitor.start();
    // 低能见度点位
    const badLandmarks = createStableLandmarks(0.1);
    globalMonitor.onFrame(badLandmarks);
    
    expect(usePostureAssessmentStore.getState().stabilityProgress).toBe(0);
  });

  it('should progress stability if ROI check passes and landmarks are stable', () => {
    globalMonitor.start();
    const stableLandmarks = createStableLandmarks(0.9);
    
    // 泵入 15 帧稳定数据
    for (let i = 0; i < 15; i++) {
      globalMonitor.onFrame(stableLandmarks);
    }
    
    expect(usePostureAssessmentStore.getState().stabilityProgress).toBeGreaterThan(0);
  });

  it('should transition to capturing after 1s of stability', () => {
    globalMonitor.start();
    const stableLandmarks = createStableLandmarks(0.9);
    
    // 泵入 15 帧稳定数据触发倒计时
    for (let i = 0; i < 15; i++) {
      globalMonitor.onFrame(stableLandmarks);
    }
    
    // 此时 isStabilizing 应为 true，等待 1s
    vi.advanceTimersByTime(1000);
    
    expect(usePostureAssessmentStore.getState().step).toBe('capturing_upper');
  });

  it('should handle capture phase and transition to lower body prep', () => {
    globalMonitor.start();
    const state = usePostureAssessmentStore.getState();
    state.setStep('capturing_upper');
    
    const frame = createStableLandmarks();
    
    // 模拟 2s 的采样
    globalMonitor.onFrame(frame);
    vi.advanceTimersByTime(2000);
    globalMonitor.onFrame(frame); // 触发采样结束逻辑
    
    expect(usePostureAssessmentStore.getState().step).toBe('prep_lower');
  });
});
