import { useState, useCallback, useEffect, useRef } from 'react';

interface CameraStreamState {
  stream: MediaStream | null;
  error: Error | null;
  isLoading: boolean;
}

// Singleton state to be shared across components
let globalStream: MediaStream | null = null;
let activeUsers = 0;
let pendingPromise: Promise<MediaStream | null> | null = null;

/**
 * Reset function for testing purposes only.
 */
export const resetCameraStreamForTesting = () => {
  globalStream = null;
  activeUsers = 0;
  pendingPromise = null;
};

export const useCameraStream = (enabled: boolean = true) => {
  const [state, setState] = useState<CameraStreamState>({
    stream: null,
    error: null,
    isLoading: false,
  });

  const stopStream = useCallback(() => {
    if (globalStream) {
      console.log("[Camera] Stopping all tracks of the global camera stream...");
      globalStream.getTracks().forEach(track => track.stop());
      globalStream = null;
      pendingPromise = null;
    }
  }, []);

  const startStream = useCallback(async (retryCount = 0, isRetry = false): Promise<MediaStream | null> => {
    // If there's an ongoing request, wait for it (but not if we are the one retrying)
    if (pendingPromise && !isRetry) {
      console.log("[Camera] Waiting for existing stream request...");
      const stream = await pendingPromise;
      if (stream) {
        setState({ stream, error: null, isLoading: false });
        return stream;
      }
    }

    if (globalStream && globalStream.active) {
      console.log("[Camera] Reusing active global stream");
      setState({ stream: globalStream, error: null, isLoading: false });
      return globalStream;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    
    pendingPromise = (async () => {
      try {
        console.log("[Camera] Requesting new camera stream...");
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 960 },
            facingMode: "user"
          },
          audio: false
        });
        
        globalStream = stream;
        return stream;
      } catch (err) {
        console.error("[Camera] Failed to get camera stream:", err);
        
        // Handle "Device in use" or "NotReadableError" with retry
        if ((err instanceof DOMException && err.name === 'NotReadableError') && retryCount < 3) {
          console.log(`[Camera] Device in use, retrying... (${retryCount + 1}/3)`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          return startStream(retryCount + 1, true);
        }
        
        throw err;
      }
    })();

    try {
      const stream = await pendingPromise;
      setState({ stream, error: null, isLoading: false });
      return stream;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setState({ stream: null, error, isLoading: false });
      pendingPromise = null;
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (enabled) {
      activeUsers++;
      console.log(`[Camera] User joined. Active users: ${activeUsers}`);
      startStream();
    }

    return () => {
      if (enabled) {
        activeUsers--;
        console.log(`[Camera] User left. Active users: ${activeUsers}`);
        
        // Use a more robust cleanup with ref check or mounted flag
        setTimeout(() => {
          if (activeUsers <= 0 && globalStream) {
            console.log("[Camera] No active users, performing cleanup...");
            stopStream();
            if (mounted) {
              setState({ stream: null, error: null, isLoading: false });
            }
          }
        }, 800); // Slightly longer delay to bridge route transitions
      }
      mounted = false;
    };
  }, [enabled, startStream, stopStream]);

  return {
    ...state,
    refresh: startStream,
    stop: stopStream
  };
};
