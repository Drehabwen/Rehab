import { describe, it, expect, beforeEach } from 'vitest';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';

describe('PostureAssessmentStore', () => {
  beforeEach(() => {
    usePostureAssessmentStore.getState().reset();
  });

  it('should initialize with idle state', () => {
    const state = usePostureAssessmentStore.getState();
    expect(state.step).toBe('idle');
    expect(state.upperFrames).toEqual([]);
    expect(state.lowerFrames).toEqual([]);
  });

  it('should transition steps correctly', () => {
    const store = usePostureAssessmentStore.getState();
    
    store.setStep('prep_upper');
    expect(usePostureAssessmentStore.getState().step).toBe('prep_upper');
    
    store.setStep('capturing_upper');
    expect(usePostureAssessmentStore.getState().step).toBe('capturing_upper');
  });

  it('should add frames correctly', () => {
    const store = usePostureAssessmentStore.getState();
    const mockFrame = { timestamp: Date.now(), landmarks: [] };
    
    store.addUpperFrame(mockFrame);
    expect(usePostureAssessmentStore.getState().upperFrames.length).toBe(1);
    
    store.addLowerFrame(mockFrame);
    expect(usePostureAssessmentStore.getState().lowerFrames.length).toBe(1);
  });

  it('should reset state correctly', () => {
    const store = usePostureAssessmentStore.getState();
    store.setStep('completed');
    store.addUpperFrame({ timestamp: 1, landmarks: [] });
    
    store.reset();
    
    const state = usePostureAssessmentStore.getState();
    expect(state.step).toBe('idle');
    expect(state.upperFrames.length).toBe(0);
  });
});
