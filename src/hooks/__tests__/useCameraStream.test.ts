import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCameraStream, resetCameraStreamForTesting } from '../useCameraStream';

// Mock MediaStream
class MockMediaStream {
  active = true;
  tracks = [{ stop: vi.fn(), kind: 'video' }];
  getTracks = vi.fn(() => this.tracks);
}

describe('useCameraStream', () => {
  beforeEach(() => {
    resetCameraStreamForTesting();
    
    Object.defineProperty(global.navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn()
      },
      configurable: true,
      writable: true
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should request a new stream when enabled', async () => {
    const mockStream = new MockMediaStream();
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCameraStream(true));

    await waitFor(() => expect(result.current.stream).toBe(mockStream), { timeout: 3000 });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('should reuse the existing active stream for multiple users', async () => {
    const mockStream = new MockMediaStream();
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);

    const { result: hook1 } = renderHook(() => useCameraStream(true));
    await waitFor(() => expect(hook1.current.stream).toBe(mockStream));

    const { result: hook2 } = renderHook(() => useCameraStream(true));
    await waitFor(() => expect(hook2.current.stream).toBe(mockStream));

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(1);
  });

  it('should retry when NotReadableError occurs', async () => {
    const mockStream = new MockMediaStream();
    const error = new DOMException('Device in use', 'NotReadableError');
    
    (navigator.mediaDevices.getUserMedia as any)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(mockStream);

    const { result } = renderHook(() => useCameraStream(true));

    // Wait for the retry and successful stream
    await waitFor(() => expect(result.current.stream).toBe(mockStream), { timeout: 5000 });
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledTimes(2);
  });

  it('should cleanup stream when no active users remain', async () => {
    const mockStream = new MockMediaStream();
    const stopSpy = vi.fn();
    (mockStream.getTracks() as any)[0].stop = stopSpy;
    (navigator.mediaDevices.getUserMedia as any).mockResolvedValue(mockStream);

    const { unmount } = renderHook(() => useCameraStream(true));
    await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled());

    unmount();

    // Wait for cleanup delay (800ms)
    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(stopSpy).toHaveBeenCalled();
  });
});
