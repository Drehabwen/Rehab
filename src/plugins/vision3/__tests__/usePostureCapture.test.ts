import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostureCapture, CaptureStatus } from '../hooks/usePostureCapture';
import { PoseLandmark } from '../vision3-utils';

describe('usePostureCapture', () => {
  const mockOnCapture = vi.fn();
  
  const createValidLandmarks = (): PoseLandmark[] => {
    const landmarks: PoseLandmark[] = [];
    for (let i = 0; i < 33; i++) {
      landmarks.push({
        x: 0.5 + i * 0.001,
        y: 0.5 + i * 0.002,
        z: 0.5,
        visibility: i % 5 === 0 ? 0.9 : 0.6
      });
    }
    return landmarks;
  };

  const createInvalidLandmarks = (): PoseLandmark[] => {
    const landmarks: PoseLandmark[] = [];
    for (let i = 0; i < 33; i++) {
      landmarks.push({
        x: 0.5,
        y: 0.5,
        z: 0.5,
        visibility: i < 10 ? 0.2 : 0.1
      });
    }
    return landmarks;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    document.body.innerHTML = '<video width="640" height="480"></video>';
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    expect(result.current.captureStatus).toBe('idle');
    expect(result.current.countdown).toBe(5);
    expect(result.current.isInPosition).toBe(false);
  });

  it('should detect valid user position correctly', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    const validLandmarks = createValidLandmarks();

    act(() => {
      result.current.setCaptureStatus('scanning');
      result.current.handleLandmarks(validLandmarks);
    });

    expect(result.current.isInPosition).toBe(true);
  });

  it('should detect invalid user position', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    const invalidLandmarks = createInvalidLandmarks();

    act(() => {
      result.current.setCaptureStatus('scanning');
      result.current.handleLandmarks(invalidLandmarks);
    });

    expect(result.current.isInPosition).toBe(false);
  });

  it('should handle insufficient landmarks', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    const insufficientLandmarks: PoseLandmark[] = [
      { x: 0.5, y: 0.5, z: 0.5, visibility: 0.9 },
      { x: 0.55, y: 0.55, z: 0.55, visibility: 0.9 }
    ];

    act(() => {
      result.current.setCaptureStatus('scanning');
      result.current.handleLandmarks(insufficientLandmarks);
    });

    expect(result.current.isInPosition).toBe(false);
  });

  it('should trigger countdown when user is in position during scanning', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    act(() => {
      result.current.setCaptureStatus('scanning');
    });

    act(() => {
      result.current.handleLandmarks(createValidLandmarks());
    });

    expect(result.current.captureStatus).toBe('countdown');
  });

  it('should countdown from 5 to 0', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    act(() => {
      result.current.setCaptureStatus('countdown');
    });

    // Let the reset effect and first countdown effect run
    // Use advanceTimersByTime(0) to let effects run without ticking the clock
    act(() => {
      vi.advanceTimersByTime(0);
    });
    
    expect(result.current.countdown).toBe(5);

    for (let i = 1; i <= 5; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(result.current.countdown).toBe(5 - i);
    }
  });

  it('should manage landmarks buffer correctly (max 30 frames)', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    act(() => {
      for (let i = 0; i < 40; i++) {
        result.current.handleLandmarks(createValidLandmarks());
      }
    });

    expect(mockOnCapture).not.toHaveBeenCalled();
  });

  it('should not trigger position detection in entry mode', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: true,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    act(() => {
      result.current.setCaptureStatus('scanning');
      result.current.handleLandmarks(createValidLandmarks());
    });

    expect(result.current.captureStatus).toBe('scanning');
    expect(result.current.isInPosition).toBe(false);
  });

  it('should not trigger position detection in non-posture tab', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'rom',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    act(() => {
      result.current.setCaptureStatus('scanning');
      result.current.handleLandmarks(createValidLandmarks());
    });

    expect(result.current.captureStatus).toBe('scanning');
    expect(result.current.isInPosition).toBe(false);
  });

  it('should reset countdown when entering countdown status', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    act(() => {
      result.current.setCaptureStatus('countdown');
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    for (let i = 0; i < 2; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(result.current.countdown).toBe(3);

    act(() => {
      // Set to something else first to ensure transition
      result.current.setCaptureStatus('idle');
    });

    act(() => {
      result.current.setCaptureStatus('countdown');
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.countdown).toBe(5);
  });

  it('should trigger recording after countdown', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    act(() => {
      result.current.setCaptureStatus('countdown');
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }

    expect(result.current.captureStatus).toBe('recording');
    expect(mockOnCapture).not.toHaveBeenCalled();
  });

  it('should handle transition from idle to scanning without triggering countdown', () => {
    const { result } = renderHook(() => usePostureCapture({
      activeTab: 'posture',
      isEntryMode: false,
      assessmentMode: 'realtime',
      onCapture: mockOnCapture
    }));

    act(() => {
      result.current.handleLandmarks(createValidLandmarks());
    });

    expect(result.current.isInPosition).toBe(true);
    expect(result.current.captureStatus).toBe('idle');

    act(() => {
      result.current.setCaptureStatus('scanning');
    });

    expect(result.current.captureStatus).toBe('scanning');
  });

  describe('2-second time-series capture', () => {
    beforeEach(() => {
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      Object.defineProperty(videoElement, 'videoWidth', { value: 640, configurable: true });
      Object.defineProperty(videoElement, 'videoHeight', { value: 480, configurable: true });
    });

    it('should initialize with recordingProgress at 0', () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'realtime',
        onCapture: mockOnCapture
      }));

      expect(result.current.recordingProgress).toBe(0);
    });

    it('should accumulate landmarks in recording buffer during recording', () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'realtime',
        onCapture: mockOnCapture
      }));

      act(() => {
        result.current.setCaptureStatus('recording');
      });

      const landmarks1 = createValidLandmarks();
      const landmarks2 = createValidLandmarks();

      act(() => {
        result.current.handleLandmarks(landmarks1);
        result.current.handleLandmarks(landmarks2);
      });

      expect(mockOnCapture).not.toHaveBeenCalled();
    });

    it('should update recording progress during 2-second capture', () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'realtime',
        onCapture: mockOnCapture
      }));

      act(() => {
        result.current.setCaptureStatus('recording');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current.recordingProgress).toBe(0);

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.handleLandmarks(createValidLandmarks());
      });

      expect(result.current.recordingProgress).toBeCloseTo(50, 0);

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.handleLandmarks(createValidLandmarks());
      });

      expect(result.current.recordingProgress).toBeCloseTo(100, 0);
    });

    it('should complete 2-second recording and capture time-series data in realtime mode', async () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'realtime',
        onCapture: mockOnCapture
      }));

      act(() => {
        result.current.setCaptureStatus('recording');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      const capturedLandmarks: PoseLandmark[][] = [];

      act(() => {
        for (let i = 0; i < 62; i++) {
          const landmarks = createValidLandmarks();
          capturedLandmarks.push(landmarks);
          result.current.handleLandmarks(landmarks);
          vi.advanceTimersByTime(33);
        }
      });

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.captureStatus).toBe('analyzing');
      expect(mockOnCapture).toHaveBeenCalled();

      const captureCall = mockOnCapture.mock.calls[0][0];
      expect(captureCall).toHaveProperty('timeSeriesLandmarks');
      expect(Array.isArray(captureCall.timeSeriesLandmarks)).toBe(true);
      expect(captureCall.width).toBe(640);
      expect(captureCall.height).toBe(480);
    });

    it('should complete 2-second recording and transition to completed in stepped mode', () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'stepped',
        onCapture: mockOnCapture
      }));

      act(() => {
        result.current.setCaptureStatus('recording');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      for (let i = 0; i < 62; i++) {
        act(() => {
          result.current.handleLandmarks(createValidLandmarks());
          vi.advanceTimersByTime(33);
        });
      }

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(result.current.captureStatus).toBe('completed');
      expect(mockOnCapture).toHaveBeenCalled();
    });

    it('should cap recording progress at 100%', () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'realtime',
        onCapture: mockOnCapture
      }));

      act(() => {
        result.current.setCaptureStatus('recording');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      act(() => {
        vi.advanceTimersByTime(2500);
      });

      expect(result.current.recordingProgress).toBeLessThanOrEqual(100);
    });

    it('should reset recording progress when entering recording status', () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'realtime',
        onCapture: mockOnCapture
      }));

      act(() => {
        result.current.setCaptureStatus('recording');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      act(() => {
        vi.advanceTimersByTime(1000);
        result.current.handleLandmarks(createValidLandmarks());
      });

      expect(result.current.recordingProgress).toBeGreaterThan(0);

      act(() => {
        result.current.setCaptureStatus('idle');
      });
      
      act(() => {
        result.current.setCaptureStatus('recording');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current.recordingProgress).toBe(0);
    });

    it('should capture approximately 60 frames in 2 seconds at 30fps', () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'realtime',
        onCapture: mockOnCapture
      }));

      act(() => {
        result.current.setCaptureStatus('recording');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      for (let i = 0; i < 62; i++) {
        act(() => {
          result.current.handleLandmarks(createValidLandmarks());
          vi.advanceTimersByTime(33);
        });
      }

      act(() => {
        vi.advanceTimersByTime(100);
      });

      expect(mockOnCapture).toHaveBeenCalled();
      const captureCall = mockOnCapture.mock.calls[0][0];
      expect(captureCall.timeSeriesLandmarks.length).toBeGreaterThan(50);
      expect(captureCall.timeSeriesLandmarks.length).toBeLessThan(70);
    });

    it('should handle early termination of recording', () => {
      const { result } = renderHook(() => usePostureCapture({
        activeTab: 'posture',
        isEntryMode: false,
        assessmentMode: 'realtime',
        onCapture: mockOnCapture
      }));

      act(() => {
        result.current.setCaptureStatus('recording');
      });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      act(() => {
        vi.advanceTimersByTime(500);
        result.current.handleLandmarks(createValidLandmarks());
      });

      act(() => {
        result.current.setCaptureStatus('idle');
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.recordingProgress).toBeLessThan(100);
      expect(mockOnCapture).not.toHaveBeenCalled();
    });
  });
});
