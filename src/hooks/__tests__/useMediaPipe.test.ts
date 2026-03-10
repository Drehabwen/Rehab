import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Results } from '@/lib/mediapipe-utils';
import { renderHook } from '@testing-library/react';
import { useMediaPipe } from '../useMediaPipe';

// Mock MediaPipe Holistic
const {
  mockSend,
  mockOnResults,
  mockSetOptions,
  mockClose,
  MockPose,
} = vi.hoisted(() => {
  const mockSend = vi.fn().mockResolvedValue(undefined);
  const mockOnResults = vi.fn();
  const mockSetOptions = vi.fn();
  const mockClose = vi.fn();
  const MockPose = vi.fn(class {
    send = mockSend;
    onResults = mockOnResults;
    setOptions = mockSetOptions;
    close = mockClose;
  });

  return {
    mockSend,
    mockOnResults,
    mockSetOptions,
    mockClose,
    MockPose,
  };
});

vi.mock('@mediapipe/pose', () => {
  return {
    Pose: MockPose,
    POSE_CONNECTIONS: [],
  };
});

describe('useMediaPipe', () => {
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    vi.useFakeTimers();
    // Clear global singleton state
    if (typeof window !== 'undefined') {
      const globalWindow = window as unknown as Record<string, unknown>;
      delete globalWindow['__NEXUS_POSE_SINGLETON__'];
    }
    // Mock requestAnimationFrame to prevent recursion issues in tests
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(Date.now()), 16);
      return 1;
    });

    const videoStub: Partial<HTMLVideoElement> = {
      readyState: 4, // HAVE_ENOUGH_DATA
      play: vi.fn(),
      pause: vi.fn(),
    };
    mockVideo = videoStub as HTMLVideoElement;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize Pose model and start processing loop', async () => {
    const onResults = vi.fn();
    renderHook(() => useMediaPipe(mockVideo, onResults, true));

    await vi.advanceTimersByTimeAsync(100);

    expect(mockOnResults).toHaveBeenCalledTimes(1);
    expect(mockSetOptions).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalled();
  });

  it('should not process if disabled', async () => {
    const onResults = vi.fn();
    renderHook(() => useMediaPipe(mockVideo, onResults, false));

    await vi.advanceTimersByTimeAsync(100);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('should support multiple listeners', async () => {
    const onResults1 = vi.fn();
    const onResults2 = vi.fn();

    renderHook(() => useMediaPipe(mockVideo, onResults1, true));
    renderHook(() => useMediaPipe(mockVideo, onResults2, true));

    await vi.advanceTimersByTimeAsync(100);

    // Simulate result from MediaPipe
    const mockResult = { poseLandmarks: [] } as Results;
    const callback = mockOnResults.mock.calls[0][0];
    callback(mockResult);

    expect(onResults1).toHaveBeenCalledWith(mockResult);
    expect(onResults2).toHaveBeenCalledWith(mockResult);
  });
});
