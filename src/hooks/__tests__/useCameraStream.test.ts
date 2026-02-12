import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCameraStream } from '../useCameraStream';

class MockVideoTrack {
  kind = 'video';
  label = 'Mock Camera';
  muted = false;
  readyState: MediaStreamTrackState = 'live';
  onmute: (() => void) | null = null;
  onunmute: (() => void) | null = null;
  onended: (() => void) | null = null;
  stop = vi.fn();
}

class MockMediaStream {
  active = true;
  tracks: MockVideoTrack[] = [];
  
  constructor() {
    this.tracks = [new MockVideoTrack()];
  }

  getTracks() {
    return this.tracks;
  }

  getVideoTracks() {
    return this.tracks.filter(t => t.kind === 'video');
  }
}

const getUserMediaMock = () =>
  navigator.mediaDevices.getUserMedia as unknown as {
    mockResolvedValue: (value: unknown) => void;
    mockRejectedValue: (value: unknown) => void;
  };

describe('useCameraStream (V2)', () => {
  beforeEach(() => {
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
    getUserMediaMock().mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCameraStream(true));

    await waitFor(() => {
      expect(result.current.stream).toBe(mockStream);
      expect(result.current.isLoading).toBe(false);
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    });
  });

  it('should not request stream when disabled', async () => {
    const mockStream = new MockMediaStream();
    getUserMediaMock().mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCameraStream(false));

    await waitFor(() => {
      expect(result.current.stream).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });

    expect(navigator.mediaDevices.getUserMedia).not.toHaveBeenCalled();
  });

  it('should handle camera errors', async () => {
    const error = new Error('Camera not found');
    getUserMediaMock().mockRejectedValue(error);

    const { result } = renderHook(() => useCameraStream(true));

    await waitFor(() => {
      expect(result.current.error).toBe(error);
      expect(result.current.stream).toBeNull();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should provide track info when stream is active', async () => {
    const mockStream = new MockMediaStream();
    const mockTrack = new MockVideoTrack();
    mockStream.tracks[0] = mockTrack;
    getUserMediaMock().mockResolvedValue(mockStream);

    const { result } = renderHook(() => useCameraStream(true));

    await waitFor(() => {
      expect(result.current.trackInfo).toEqual({
        label: 'Mock Camera',
        muted: false,
        readyState: 'live'
      });
    });
  });

  it('should cleanup stream when unmounted', async () => {
    const mockStream = new MockMediaStream();
    const mockTrack = new MockVideoTrack();
    mockStream.tracks[0] = mockTrack;
    const stopSpy = vi.fn();
    mockTrack.stop = stopSpy;
    getUserMediaMock().mockResolvedValue(mockStream);

    const { unmount, result } = renderHook(() => useCameraStream(true));

    await waitFor(() => expect(result.current.stream).toBe(mockStream));

    unmount();

    expect(stopSpy).toHaveBeenCalled();
  });
});
