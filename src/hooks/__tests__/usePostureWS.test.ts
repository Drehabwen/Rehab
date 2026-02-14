/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePostureWS } from '../usePostureWS';
import { PoseLandmark } from '../plugins/vision3/vision3-utils';

interface AnalysisResult {
  angles: Array<{ name: string; value: number }>;
  joints: Array<{ name: string; status: string }>;
  recommendations: string[];
}

interface JointResult {
  id: string;
  angle: number;
}

describe('usePostureWS', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    mockWebSocket = {
      readyState: 0,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    const MockWS = vi.fn(() => mockWebSocket);
    (MockWS as any).OPEN = 1;
    (MockWS as any).CLOSED = 3;
    (MockWS as any).CLOSING = 2;
    (MockWS as any).CONNECTING = 0;
    
    global.WebSocket = MockWS as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('WebSocket connection management', () => {
    it('should initialize with disconnected status', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      expect(result.current.status).toBe('disconnected');
      expect(result.current.result).toBeNull();
      expect(result.current.jointResult).toBeNull();
      expect(result.current.htmlReport).toBeNull();
    });

    it('should connect to WebSocket on mount', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8001/ws/analyze');
    });

    it('should update status to connecting when WebSocket is opening', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const openCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'open'
      )?.[1];

      act(() => {
        if (openCallback) openCallback();
      });

      expect(result.current.status).toBe('connected');
    });

    it('should update status to disconnected when WebSocket closes', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const closeCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'close'
      )?.[1];

      act(() => {
        if (closeCallback) closeCallback({ code: 1000, reason: 'Normal closure' });
      });

      expect(result.current.status).toBe('disconnected');
    });

    it('should update status to error when WebSocket errors', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const errorCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];

      act(() => {
        if (errorCallback) errorCallback(new Error('WebSocket error'));
      });

      expect(result.current.status).toBe('error');
    });

    it('should reconnect on disconnection', async () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const closeCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'close'
      )?.[1];

      act(() => {
        if (closeCallback) closeCallback({ code: 1000, reason: 'Normal closure' });
      });

      expect(result.current.status).toBe('disconnected');

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(global.WebSocket).toHaveBeenCalledTimes(2);
      });

      vi.useRealTimers();
    });
  });

  describe('Message handling', () => {
    it('should handle POSTURE_ANALYSIS response', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const messageCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];

      const mockResponse = {
        type: 'POSTURE_ANALYSIS',
        angles: [
          { name: 'left_shoulder_angle', value: 45.5 },
          { name: 'right_shoulder_angle', value: 44.8 }
        ],
        joints: [
          { name: 'left_shoulder', status: 'normal' },
          { name: 'right_shoulder', status: 'normal' }
        ],
        recommendations: ['Maintain good posture']
      };

      act(() => {
        if (messageCallback) messageCallback({ data: JSON.stringify(mockResponse) });
      });

      expect(result.current.result).toEqual(mockResponse);
    });

    it('should handle JOINT_ANALYSIS response', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const messageCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];

      const mockResponse = {
        type: 'JOINT_ANALYSIS',
        results: [
          { id: 'joint_1', angle: 45.5 },
          { id: 'joint_2', angle: 44.8 }
        ]
      };

      act(() => {
        if (messageCallback) messageCallback({ data: JSON.stringify(mockResponse) });
      });

      expect(result.current.jointResult).toEqual(mockResponse.results);
    });

    it('should handle POSTURE_BATCH_ANALYSIS response', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const messageCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];

      const mockResponse = {
        type: 'POSTURE_BATCH_ANALYSIS',
        html: '<div class="report">Test Report</div>',
        reportId: 'test-report-123'
      };

      act(() => {
        if (messageCallback) messageCallback({ data: JSON.stringify(mockResponse) });
      });

      expect(result.current.htmlReport).toBe('<div class="report">Test Report</div>');
    });

    it('should handle POSTURE_STEPPED_ANALYSIS response', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const messageCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];

      const mockResponse = {
        type: 'POSTURE_STEPPED_ANALYSIS',
        html: '<div class="stepped-report">Stepped Report</div>',
        reportId: 'stepped-report-456'
      };

      act(() => {
        if (messageCallback) messageCallback({ data: JSON.stringify(mockResponse) });
      });

      expect(result.current.htmlReport).toBe('<div class="stepped-report">Stepped Report</div>');
    });

    it('should handle unknown message types', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const messageCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];

      const mockResponse = {
        type: 'UNKNOWN_TYPE',
        data: 'some data'
      };

      act(() => {
        if (messageCallback) messageCallback({ data: JSON.stringify(mockResponse) });
      });

      expect(result.current.result).toBeNull();
      expect(result.current.jointResult).toBeNull();
      expect(result.current.htmlReport).toBeNull();
    });

    it('should handle invalid JSON messages', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const messageCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];

      act(() => {
        if (messageCallback) messageCallback({ data: 'invalid json' });
      });

      expect(result.current.result).toBeNull();
    });
  });

  describe('analyzeStepped method', () => {
    it('should send POSTURE_STEPPED_ANALYSIS message', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const frames = [
        {
          view: 'front' as const,
          timeSeriesLandmarks: [
            [{ x: 0.5, y: 0.5, z: 0.5, visibility: 1.0 } as PoseLandmark]
          ],
          width: 640,
          height: 480
        },
        {
          view: 'side' as const,
          timeSeriesLandmarks: [
            [{ x: 0.5, y: 0.5, z: 0.5, visibility: 1.0 } as PoseLandmark]
          ],
          width: 640,
          height: 480
        }
      ];

      act(() => {
        result.current.analyzeStepped(frames);
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"POSTURE_STEPPED_ANALYSIS"')
      );
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"frames"')
      );
    });

    it('should send empty frames array', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      act(() => {
        result.current.analyzeStepped([]);
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"frames":[]')
      );
    });

    it('should handle WebSocket not ready (queue message)', () => {
      mockWebSocket.readyState = 0;
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const frames = [
        {
          view: 'front' as const,
          timeSeriesLandmarks: [
            [{ x: 0.5, y: 0.5, z: 0.5, visibility: 1.0 } as PoseLandmark]
          ],
          width: 640,
          height: 480
        }
      ];

      act(() => {
        result.current.analyzeStepped(frames);
      });

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should send queued messages when WebSocket connects', () => {
      mockWebSocket.readyState = 0;
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const frames = [
        {
          view: 'front' as const,
          timeSeriesLandmarks: [
            [{ x: 0.5, y: 0.5, z: 0.5, visibility: 1.0 } as PoseLandmark]
          ],
          width: 640,
          height: 480
        }
      ];

      act(() => {
        result.current.analyzeStepped(frames);
      });

      expect(mockWebSocket.send).not.toHaveBeenCalled();

      const openCallback = mockWebSocket.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'open'
      )?.[1];

      act(() => {
        if (openCallback) openCallback();
      });

      expect(mockWebSocket.send).toHaveBeenCalled();
    });

    it('should serialize timeSeriesLandmarks correctly', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const createLandmarks = (): PoseLandmark[] => {
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

      const frames = [
        {
          view: 'front' as const,
          timeSeriesLandmarks: [createLandmarks(), createLandmarks()],
          width: 640,
          height: 480
        }
      ];

      act(() => {
        result.current.analyzeStepped(frames);
      });

      const sentData = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentData.type).toBe('POSTURE_STEPPED_ANALYSIS');
      expect(sentData.frames[0].view).toBe('front');
      expect(sentData.frames[0].timeSeriesLandmarks).toHaveLength(2);
      expect(sentData.frames[0].timeSeriesLandmarks[0]).toHaveLength(33);
    });

    it('should handle all three view types', () => {
      const { result } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      const createLandmarks = (): PoseLandmark[] => {
        return Array.from({ length: 33 }, (_, i) => ({
          x: 0.5 + i * 0.001,
          y: 0.5 + i * 0.002,
          z: 0.5,
          visibility: 0.8
        }));
      };

      const frames = [
        {
          view: 'front' as const,
          timeSeriesLandmarks: [createLandmarks()],
          width: 640,
          height: 480
        },
        {
          view: 'side' as const,
          timeSeriesLandmarks: [createLandmarks()],
          width: 640,
          height: 480
        },
        {
          view: 'back' as const,
          timeSeriesLandmarks: [createLandmarks()],
          width: 640,
          height: 480
        }
      ];

      act(() => {
        result.current.analyzeStepped(frames);
      });

      const sentData = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      expect(sentData.frames).toHaveLength(3);
      expect(sentData.frames[0].view).toBe('front');
      expect(sentData.frames[1].view).toBe('side');
      expect(sentData.frames[2].view).toBe('back');
    });
  });

  describe('Default URL', () => {
    it('should use default URL when no URL is provided', () => {
      const { result } = renderHook(() => usePostureWS());

      expect(global.WebSocket).toHaveBeenCalledWith('ws://localhost:8001/ws/analyze');
    });
  });

  describe('Cleanup', () => {
    it('should close WebSocket on unmount', () => {
      const { unmount } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      unmount();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should remove event listeners on unmount', () => {
      const { unmount } = renderHook(() => usePostureWS('ws://localhost:8001/ws/analyze'));

      unmount();

      expect(mockWebSocket.removeEventListener).toHaveBeenCalled();
    });
  });
});
