import { useEffect, useCallback, useState, useRef } from 'react';
import { Holistic, Results, Options } from '@mediapipe/holistic';

/**
 * Singleton MediaPipe Holistic instance management
 */
let globalHolistic: Holistic | null = null;
const activeListeners: Set<(results: Results) => void> = new Set();
let globalIsProcessing = false;
let globalRequestRef: number | null = null;
let globalVideoElement: HTMLVideoElement | null = null;

const DEFAULT_OPTIONS: Options = {
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  smoothSegmentation: true,
  refineFaceLandmarks: true,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
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

  // Update listener ref
  useEffect(() => {
    onResultsRef.current = onResults;
  }, [onResults]);

  // Initialize holistic model if not exists
  const initHolistic = useCallback(async () => {
    if (globalHolistic) return globalHolistic;

    setIsLoading(true);
    try {
      console.log("[MediaPipe] Initializing global Holistic model...");
      const holistic = new Holistic({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`
      });

      holistic.setOptions({ ...DEFAULT_OPTIONS, ...options });
      
      holistic.onResults((results) => {
        activeListeners.forEach(listener => listener(results));
      });

      globalHolistic = holistic;
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
  }, [options]);

  // Frame processing loop
  const processFrame = useCallback(async () => {
    if (!globalHolistic || !globalVideoElement || activeListeners.size === 0) {
      console.log("[MediaPipe] Stopping loop: no model, no video, or no listeners");
      globalIsProcessing = false;
      if (globalRequestRef) cancelAnimationFrame(globalRequestRef);
      globalRequestRef = null;
      return;
    }

    if (globalVideoElement.readyState >= 2) { // HAVE_CURRENT_DATA
      try {
        await globalHolistic.send({ image: globalVideoElement });
      } catch (err) {
        console.error("[MediaPipe] Frame processing error:", err);
      }
    }
    
    globalRequestRef = requestAnimationFrame(processFrame);
  }, []);

  useEffect(() => {
    if (!enabled || !videoElement) {
      if (videoElement === globalVideoElement) {
         // If this was the active video element and it's now disabled, stop
         // But wait, other listeners might still be active.
      }
      return;
    }

    // Wrap the onResults to use the latest ref
    const listener = (results: Results) => onResultsRef.current(results);
    activeListeners.add(listener);
    globalVideoElement = videoElement;
    
    const start = async () => {
      const instance = await initHolistic();
      if (instance && !globalIsProcessing && globalVideoElement) {
        console.log("[MediaPipe] Starting processing loop...");
        globalIsProcessing = true;
        processFrame();
      }
    };

    start();

    return () => {
      activeListeners.delete(listener);
      if (activeListeners.size === 0) {
        console.log("[MediaPipe] No active listeners, stopping loop...");
        globalIsProcessing = false;
        if (globalRequestRef) {
          cancelAnimationFrame(globalRequestRef);
          globalRequestRef = null;
        }
        globalVideoElement = null;
      }
    };
  }, [enabled, videoElement, initHolistic, processFrame]);

  return { isLoading, error };
};
