import { useEffect, useCallback, useState, useRef } from 'react';
import { Holistic, Results, Options } from '@mediapipe/holistic';

/**
 * Singleton MediaPipe Holistic instance management
 */
// Use window to preserve across HMR in development
const GLOBAL_KEY = '__NEXUS_HOLISTIC_SINGLETON__';
const getGlobalState = () => {
  if (typeof window !== 'undefined') {
    if (!(window as any)[GLOBAL_KEY]) {
      (window as any)[GLOBAL_KEY] = {
        holistic: null,
        activeListeners: new Set(),
        isProcessing: false,
        requestRef: null,
        videoElement: null
      };
    }
    return (window as any)[GLOBAL_KEY];
  }
  return {
    holistic: null,
    activeListeners: new Set(),
    isProcessing: false,
    requestRef: null,
    videoElement: null
  };
};

const DEFAULT_OPTIONS: Options = {
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: true,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
};

export const useMediaPipe = (
  videoElement: HTMLVideoElement | null,
  onResults: (results: Results) => void,
  enabled: boolean = true,
  options: Partial<Options> = {}
) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const onResultsRef = useRef(onResults);
  const optionsRef = useRef(options);
  const globalState = getGlobalState();

  // Update refs
  useEffect(() => {
    onResultsRef.current = onResults;
    optionsRef.current = options;
  }, [onResults, options]);

  // Frame processing loop
  const processFrame = useCallback(async () => {
    const state = getGlobalState();
    if (!state.holistic || !state.videoElement || state.activeListeners.size === 0) {
      console.log("[MediaPipe] Stopping loop: no model, no video, or no listeners");
      state.isProcessing = false;
      if (state.requestRef) cancelAnimationFrame(state.requestRef);
      state.requestRef = null;
      return;
    }

    if (state.videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
      try {
        await state.holistic.send({ image: state.videoElement });
      } catch (err) {
        console.error("[MediaPipe] Frame processing error:", err);
      }
    }
    
    state.requestRef = requestAnimationFrame(processFrame);
  }, []);

  // Initialize holistic model if not exists
  const initHolistic = useCallback(async () => {
    const state = getGlobalState();
    if (state.holistic) return state.holistic;

    setIsLoading(true);
    try {
      console.log("[MediaPipe] Initializing global Holistic model...");
      const holistic = new Holistic({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
      });

      holistic.setOptions({ ...DEFAULT_OPTIONS, ...optionsRef.current });
      
      holistic.onResults((results) => {
        const s = getGlobalState();
        s.activeListeners.forEach((listener: any) => listener(results));
      });

      state.holistic = holistic;
      console.log("[MediaPipe] Holistic model initialized.");
      return holistic;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize MediaPipe');
      setError(error);
      console.error("[MediaPipe] Initialization error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !videoElement) {
      return;
    }

    const state = getGlobalState();
    // Wrap the onResults to use the latest ref
    const listener = (results: Results) => onResultsRef.current(results);
    state.activeListeners.add(listener);
    state.videoElement = videoElement;
    
    const start = async () => {
      const instance = await initHolistic();
      if (instance && !state.isProcessing && state.videoElement) {
        console.log("[MediaPipe] Starting processing loop...");
        state.isProcessing = true;
        processFrame();
      }
    };

    start();

    return () => {
      const s = getGlobalState();
      s.activeListeners.delete(listener);
      if (s.activeListeners.size === 0) {
        console.log("[MediaPipe] No active listeners, stopping loop...");
        s.isProcessing = false;
        if (s.requestRef) {
          cancelAnimationFrame(s.requestRef);
          s.requestRef = null;
        }
        s.videoElement = null;
      }
    };
  }, [enabled, videoElement, initHolistic, processFrame]); 

  return { isLoading, error };
};
