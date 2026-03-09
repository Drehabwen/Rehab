import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostureAnalysis } from '../hooks/usePostureAnalysis';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';

vi.mock('@/hooks/usePostureWS', () => ({
  usePostureWS: vi.fn()
}));

vi.mock('../hooks/useCaptureStateMachine', () => ({
  useCaptureStateMachine: vi.fn()
}));

vi.mock('../services/GlobalMonitor', () => ({
  globalMonitor: {
    onFrame: vi.fn(),
    registerAnalysisCallback: vi.fn()
  }
}));

import { usePostureWS } from '@/hooks/usePostureWS';
import { useCaptureStateMachine } from '../hooks/useCaptureStateMachine';
import { globalMonitor } from '../services/GlobalMonitor';

const mockUsePostureWS = vi.mocked(usePostureWS);
const mockUseCaptureStateMachine = vi.mocked(useCaptureStateMachine);

describe('usePostureAnalysis', () => {
  const mockAnalyze = vi.fn();
  const mockAnalyzeBatch = vi.fn();
  const mockAnalyzeStepped = vi.fn();
  const mockRequestDeepAnalysis = vi.fn();
  const mockDispatch = vi.fn();
  const mockProcessLandmarks = vi.fn();

  const defaultWsValue = {
    result: null,
    jointResult: null,
    status: 'connected' as const,
    analyze: mockAnalyze,
    analyzeJoint: vi.fn(),
    analyzeBatch: mockAnalyzeBatch,
    analyzeStepped: mockAnalyzeStepped,
    requestDeepAnalysis: mockRequestDeepAnalysis,
    markdownReport: null,
    streamingReport: '',
    isStreamingReport: false,
    auxiliaryDiagnosis: null,
    timeSeriesData: null,
    analysisAckAt: null,
    connect: vi.fn(),
    disconnect: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    usePostureAssessmentStore.getState().reset();

    mockUsePostureWS.mockReturnValue(defaultWsValue);
    mockUseCaptureStateMachine.mockImplementation(() => ({
      status: 'idle',
      dispatch: mockDispatch,
      countdown: 5,
      recordingProgress: 0,
      isInPosition: false,
      error: null,
      processLandmarks: mockProcessLandmarks
    }));
  });

  it('initializes with current defaults', () => {
    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      view: 'front',
      assessmentMode: 'realtime',
      assessmentType: 'standard'
    }));

    expect(result.current.captureStatus).toBe('idle');
    expect(result.current.countdown).toBe(5);
    expect(result.current.recordingProgress).toBe(0);
    expect(result.current.isInPosition).toBe(false);
    expect(result.current.wsResult).toBeNull();
    expect(result.current.headAxes).toBeNull();
    expect(result.current.steppedResults).toEqual({});
  });

  it('registers the global analysis callback and forwards batch analysis', () => {
    let registeredCallback: ((payload: unknown) => void) | undefined;
    vi.mocked(globalMonitor.registerAnalysisCallback).mockImplementation((callback) => {
      registeredCallback = callback;
    });

    renderHook(() => usePostureAnalysis({
      axesScale: 1,
      view: 'front',
      assessmentMode: 'realtime',
      assessmentType: 'standard'
    }));

    expect(globalMonitor.registerAnalysisCallback).toHaveBeenCalled();

    const payload = {
      view: 'front' as const,
      duration: 2000,
      frameCount: 30,
      averages: { swayOffset: 1 },
      stability: { sd: 0.1, maxDeviation: 0.2, velocity: 0.3, swayArea: 0.4 },
      timeSeries: []
    };

    act(() => {
      registeredCallback?.(payload);
    });

    expect(mockAnalyzeBatch).toHaveBeenCalledWith(payload);
  });

  it('converts websocket head axes into renderable axes', async () => {
    mockUsePostureWS.mockReturnValue({
      ...defaultWsValue,
      result: {
        metrics: {
          head_axes: [
            { x: 0.5, y: 0.5 },
            { x: 0.6, y: 0.5 },
            { x: 0.5, y: 0.6 },
            { x: 0.5, y: 0.4 }
          ],
          swayOffset: 1
        },
        issues: [],
        annotations: [],
        timestamp: Date.now()
      }
    });

    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      view: 'front',
      assessmentMode: 'realtime',
      assessmentType: 'standard'
    }));

    await waitFor(() => {
      expect(result.current.headAxes).not.toBeNull();
    });
  });

  it('maps capture status setter to state-machine actions', () => {
    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      view: 'front',
      assessmentMode: 'realtime',
      assessmentType: 'standard'
    }));

    act(() => {
      result.current.setCaptureStatus('scanning');
      result.current.setCaptureStatus('completed');
      result.current.setCaptureStatus('idle');
    });

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'START_SCAN' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'ANALYSIS_COMPLETE' });
    expect(mockDispatch).toHaveBeenCalledWith({ type: 'RESET' });
  });

  it('marks the assessment step completed when markdown arrives', async () => {
    const { rerender } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      view: 'front',
      assessmentMode: 'realtime',
      assessmentType: 'standard'
    }));

    expect(usePostureAssessmentStore.getState().step).toBe('idle');

    mockUsePostureWS.mockReturnValue({
      ...defaultWsValue,
      markdownReport: '### Report'
    });

    rerender();

    await waitFor(() => {
      expect(usePostureAssessmentStore.getState().step).toBe('completed');
    });
  });

  it('marks the assessment step completed when auxiliary diagnosis arrives without markdown', async () => {
    const { rerender } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      view: 'front',
      assessmentMode: 'realtime',
      assessmentType: 'standard'
    }));

    expect(usePostureAssessmentStore.getState().step).toBe('idle');

    mockUsePostureWS.mockReturnValue({
      ...defaultWsValue,
      auxiliaryDiagnosis: '### Basic report'
    });

    rerender();

    await waitFor(() => {
      expect(usePostureAssessmentStore.getState().step).toBe('completed');
    });
  });

  it('forwards pose results to the capture state machine and monitor', () => {
    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      view: 'front',
      assessmentMode: 'realtime',
      assessmentType: 'standard'
    }));

    const landmarks = [
      { x: 0.5, y: 0.5, z: 0.1, visibility: 0.9 },
      { x: 0.6, y: 0.6, z: 0.2, visibility: 0.9 }
    ];

    act(() => {
      result.current.onResults({
        poseLandmarks: landmarks,
        image: { width: 640, height: 480 }
      } as never);
    });

    expect(mockProcessLandmarks).toHaveBeenCalledWith(landmarks, 640, 480);
    expect(globalMonitor.onFrame).toHaveBeenCalledWith(landmarks);
  });
});
