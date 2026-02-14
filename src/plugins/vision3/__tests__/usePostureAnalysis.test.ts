import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostureAnalysis } from '../hooks/usePostureAnalysis';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';
import { globalMonitor } from '../services/GlobalMonitor';
import { PostureMetrics, PostureIssue } from '@/hooks/usePostureWS';

vi.mock('@/hooks/usePostureWS', () => ({
  usePostureWS: vi.fn()
}));

vi.mock('../hooks/usePostureCapture', () => ({
  usePostureCapture: vi.fn()
}));

vi.mock('../services/GlobalMonitor', () => ({
  globalMonitor: {
    onFrame: vi.fn(),
    registerAnalysisCallback: vi.fn((cb) => {
      (globalMonitor as any).analysisCallback = cb;
    })
  }
}));

import { usePostureWS } from '@/hooks/usePostureWS';
import { usePostureCapture } from '../hooks/usePostureCapture';

const mockUsePostureWS = usePostureWS as ReturnType<typeof vi.fn>;
const mockUsePostureCapture = usePostureCapture as ReturnType<typeof vi.fn>;

describe('usePostureAnalysis', () => {
  const mockAnalyze = vi.fn();
  const mockAnalyzeBatch = vi.fn();
  const mockAnalyzeStepped = vi.fn();
  const mockHandleLandmarks = vi.fn();
  const mockSetCaptureStatus = vi.fn();

  const createMockWSResult = () => ({
    metrics: {
      head_axes: [
        { x: 0.5, y: 0.5 }, // origin
        { x: 0.6, y: 0.5 }, // x
        { x: 0.5, y: 0.6 }, // y
        { x: 0.5, y: 0.5 }  // z
      ],
      swayOffset: 10,
      shoulderAngle: 0.5,
      hipAngle: 1.2
    },
    issues: [] as PostureIssue[],
    annotations: [
      {
        type: 'line',
        color: 'red',
        points: [{ x: 0.5, y: 0.5 }]
      }
    ],
    timestamp: Date.now()
  });

  beforeEach(() => {
    vi.clearAllMocks();
    usePostureAssessmentStore.getState().reset();

    mockUsePostureWS.mockReturnValue({
      result: null,
      analyze: mockAnalyze,
      analyzeBatch: mockAnalyzeBatch,
      analyzeStepped: mockAnalyzeStepped,
      htmlReport: null
    });

    mockUsePostureCapture.mockReturnValue({
      captureStatus: 'idle',
      setCaptureStatus: mockSetCaptureStatus,
      countdown: 5,
      isInPosition: false,
      handleLandmarks: mockHandleLandmarks
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    expect(result.current.captureStatus).toBe('idle');
    expect(result.current.countdown).toBe(5);
    expect(result.current.isInPosition).toBe(false);
    expect(result.current.wsResult).toBeNull();
    expect(result.current.headAxes).toBeNull();
    expect(result.current.steppedResults).toEqual({});
  });

  it('should call analyze in realtime mode on capture', () => {
    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    const onCaptureCallback = mockUsePostureCapture.mock.calls[0][0].onCapture;
    const mockFrame = {
      currentLandmarks: [{ x: 0.5, y: 0.5, z: 0.5 }],
      width: 640,
      height: 480,
      imageData: 'data:image/png;base64,...',
      timestamp: Date.now()
    };

    act(() => {
      onCaptureCallback(mockFrame);
    });

    expect(mockAnalyze).toHaveBeenCalledWith('front', mockFrame.currentLandmarks, 640, 480, mockFrame.imageData);
  });

  it('should store stepped results in stepped mode', () => {
    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'stepped',
      isEntryMode: false,
      view: 'side',
      assessmentMode: 'stepped'
    }));

    const onCaptureCallback = mockUsePostureCapture.mock.calls[0][0].onCapture;
    const mockFrame = {
      currentLandmarks: [{ x: 0.5, y: 0.5, z: 0.5 }],
      width: 640,
      height: 480,
      imageData: 'data:image/png;base64,...',
      timestamp: Date.now()
    };

    act(() => {
      onCaptureCallback(mockFrame);
    });

    expect(result.current.steppedResults).toHaveProperty('side');
    expect(result.current.steppedResults.side).toEqual({
      image: mockFrame.imageData,
      landmarks: mockFrame.currentLandmarks,
      width: 640,
      height: 480,
      timestamp: mockFrame.timestamp
    });
    expect(mockAnalyze).not.toHaveBeenCalled();
  });

  it('should process head axes from WebSocket result', async () => {
    const mockResult = createMockWSResult();
    
    mockUsePostureWS.mockReturnValue({
      result: mockResult,
      analyze: mockAnalyze,
      analyzeBatch: mockAnalyzeBatch,
      analyzeStepped: mockAnalyzeStepped,
      htmlReport: null
    });

    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    await waitFor(() => {
      expect(result.current.headAxes).not.toBeNull();
    });

    if (result.current.headAxes) {
      expect(result.current.headAxes.origin).toBeDefined();
      expect(result.current.headAxes.x).toBeDefined();
      expect(result.current.headAxes.y).toBeDefined();
    }
  });

  it('should register analysis callback with GlobalMonitor', () => {
    renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    expect(globalMonitor.registerAnalysisCallback).toHaveBeenCalled();
    expect(typeof (globalMonitor as any).analysisCallback).toBe('function');
  });

  it('should call analyzeBatch when analysis callback is triggered', () => {
    renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    const mockAnalysisData = {
      view: 'front' as const,
      duration: 2000,
      frameCount: 30,
      averages: { swayOffset: 10, shoulderAngle: 0.5, hipAngle: 1.2 },
      stability: { standardDev: 0.001, maxDeviation: 0.005, velocity: 0.1, swayArea: 0.000005 },
      timeSeries: []
    };

    act(() => {
      (globalMonitor as any).analysisCallback(mockAnalysisData);
    });

    expect(mockAnalyzeBatch).toHaveBeenCalledWith(mockAnalysisData);
  });

  it('should transition to completed step when HTML report is ready', async () => {
    const { rerender } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    expect(usePostureAssessmentStore.getState().step).toBe('idle');

    mockUsePostureWS.mockReturnValue({
      result: null,
      analyze: mockAnalyze,
      analyzeBatch: mockAnalyzeBatch,
      analyzeStepped: mockAnalyzeStepped,
      htmlReport: '<html>Report</html>'
    });

    rerender();

    await waitFor(() => {
      expect(usePostureAssessmentStore.getState().step).toBe('completed');
    });
  });

  it('should forward landmarks to capture handler and GlobalMonitor', () => {
    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    const mockLandmarks = [
      { x: 0.5, y: 0.5, z: 0.5, visibility: 0.9 },
      { x: 0.55, y: 0.55, z: 0.55, visibility: 0.9 }
    ];

    act(() => {
      result.current.onResults({
        poseLandmarks: mockLandmarks,
        leftHandLandmarks: [],
        rightHandLandmarks: [],
        faceLandmarks: []
      } as any);
    });

    expect(mockHandleLandmarks).toHaveBeenCalledWith(mockLandmarks);
    expect(globalMonitor.onFrame).toHaveBeenCalledWith(mockLandmarks);
  });

  it('should reset headAxes when WebSocket result is null', async () => {
    const { result, rerender } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    const mockResult = createMockWSResult();

    mockUsePostureWS.mockReturnValue({
      result: mockResult,
      analyze: mockAnalyze,
      analyzeBatch: mockAnalyzeBatch,
      analyzeStepped: mockAnalyzeStepped,
      htmlReport: null
    });

    rerender();

    await waitFor(() => {
      expect(result.current.headAxes).not.toBeNull();
    });

    mockUsePostureWS.mockReturnValue({
      result: null,
      analyze: mockAnalyze,
      analyzeBatch: mockAnalyzeBatch,
      analyzeStepped: mockAnalyzeStepped,
      htmlReport: null
    });

    rerender();

    await waitFor(() => {
      expect(result.current.headAxes).toBeNull();
    });
  });

  it('should handle multiple views in stepped mode', () => {
    const { result, rerender } = renderHook(({ view }) => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'stepped',
      isEntryMode: false,
      view,
      assessmentMode: 'stepped'
    }), { initialProps: { view: 'front' as 'front' | 'side' | 'back' } });

    const mockFrame = {
      currentLandmarks: [{ x: 0.5, y: 0.5, z: 0.5 }],
      width: 640,
      height: 480,
      imageData: 'front-image',
      timestamp: 1000
    };

    act(() => {
      const onCapture = mockUsePostureCapture.mock.calls[mockUsePostureCapture.mock.calls.length - 1][0].onCapture;
      onCapture(mockFrame);
    });

    expect(result.current.steppedResults).toHaveProperty('front');

    rerender({ view: 'side' });

    // Capture side view
    act(() => {
      const onCapture = mockUsePostureCapture.mock.calls[mockUsePostureCapture.mock.calls.length - 1][0].onCapture;
      onCapture({
        ...mockFrame,
        imageData: 'side-image',
        timestamp: 2000
      });
    });

    expect(result.current.steppedResults).toHaveProperty('side');
    expect(result.current.steppedResults.front?.image).toBe('front-image');
    expect(result.current.steppedResults.side?.image).toBe('side-image');
  });

  it('should return annotations from WebSocket result', () => {
    const mockAnnotations = [
      { type: 'line' as const, points: [{ x: 0.5, y: 0.5 }], color: 'red' }
    ];

    mockUsePostureWS.mockReturnValue({
      result: {
        ...createMockWSResult(),
        annotations: mockAnnotations
      },
      analyze: mockAnalyze,
      analyzeBatch: mockAnalyzeBatch,
      analyzeStepped: mockAnalyzeStepped,
      htmlReport: null
    });

    const { result } = renderHook(() => usePostureAnalysis({
      axesScale: 1,
      activeTab: 'realtime',
      isEntryMode: false,
      view: 'front',
      assessmentMode: 'realtime'
    }));

    expect(result.current.annotations).toEqual(mockAnnotations);
  });
});
