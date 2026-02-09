import { useState, useEffect, useCallback, useRef } from 'react';

export interface CameraState {
  stream: MediaStream | null;
  error: Error | null;
  isLoading: boolean;
  trackInfo: {
    label: string;
    muted: boolean;
    readyState: string;
  } | null;
}

/**
 * useCameraV2 - 第二代摄像头核心 Hook
 * 特点：极其简单的生命周期管理，透明的错误上报，内置轨道状态监测
 */
export function useCameraV2(enabled: boolean = true) {
  const [state, setState] = useState<CameraState>({
    stream: null,
    error: null,
    isLoading: false,
    trackInfo: null,
  });

  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      console.log('[useCameraV2] Stopping stream tracks');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startStream = useCallback(async () => {
    if (!enabled) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // 停止旧流
      stopStream();

      console.log('[useCameraV2] Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: false
      });

      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];

      const updateTrackState = () => {
        setState(prev => ({
          ...prev,
          stream,
          isLoading: false,
          trackInfo: {
            label: track.label,
            muted: track.muted,
            readyState: track.readyState
          }
        }));
      };

      track.onmute = updateTrackState;
      track.onunmute = updateTrackState;
      track.onended = updateTrackState;
      
      updateTrackState();

    } catch (err: any) {
      console.error('[useCameraV2] Error:', err);
      setState({
        stream: null,
        error: err,
        isLoading: false,
        trackInfo: null
      });
    }
  }, [enabled, stopStream]);

  useEffect(() => {
    if (enabled) {
      startStream();
    } else {
      stopStream();
      setState(prev => ({ ...prev, stream: null, trackInfo: null }));
    }

    return () => {
      stopStream();
    };
  }, [enabled, startStream, stopStream]);

  return {
    ...state,
    refresh: startStream
  };
}
