import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMediaPipe } from '../useMediaPipe';

// Mock MediaPipe Holistic
const mockSend = vi.fn().mockResolvedValue(undefined);
const mockOnResults = vi.fn();
const mockSetOptions = vi.fn();
const mockClose = vi.fn();

vi.mock('@mediapipe/holistic', () => {
  return {
    Holistic: vi.fn().mockImplementation(() => ({
      send: mockSend,
      onResults: mockOnResults,
      setOptions: mockSetOptions,
      close: mockClose,
    })),
  };
});

describe('useMediaPipe', () => {
  let mockVideo: HTMLVideoElement;

  beforeEach(() => {
    vi.useFakeTimers();
    // Mock requestAnimationFrame to prevent recursion issues in tests
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      setTimeout(() => cb(Date.now()), 16);
      return 1;
    });

    mockVideo = {
      readyState: 4, // HAVE_ENOUGH_DATA
      play: vi.fn(),
      pause: vi.fn(),
    } as any;
    
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should initialize Holistic model and start processing loop', async () => {
    const onResults = vi.fn();
    renderHook(() => useMediaPipe(mockVideo, onResults, true));

    // Wait for the async initialization in the effect
    await vi.advanceTimersByTimeAsync(100);

    await waitFor(() => {
      expect(mockOnResults).toHaveBeenCalled();
    }, { timeout: 1000 });

    // Verify the send method was called at least once
    await waitFor(() => {
      expect(mockSend).toHaveBeenCalled();
    }, { timeout: 1000 });
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
    const mockResult = { poseLandmarks: [] } as any;
    const callback = mockOnResults.mock.calls[0][0];
    callback(mockResult);

    expect(onResults1).toHaveBeenCalledWith(mockResult);
    expect(onResults2).toHaveBeenCalledWith(mockResult);
  });
});
