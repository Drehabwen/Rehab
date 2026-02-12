import { useEffect, useRef, useCallback, useState } from 'react';
import { Holistic, Results, Options } from '@mediapipe/holistic';

/**
 * Singleton MediaPipe Holistic instance management
 */
let globalHolistic: Holistic | null = null;
let activeListeners: Set<(results: Results) => void> = new Set();
let isProcessing = false;
let requestRef: number | null = null;

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
    if (!globalHolistic || !videoElement || !enabled) {
      isProcessing = false;
      if (requestRef) cancelAnimationFrame(requestRef);
      return;
    }

    if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
      try {
        await globalHolistic.send({ image: videoElement });
      } catch (err) {
        console.error("[MediaPipe] Frame processing error:", err);
      }
    }
    
    requestRef = requestAnimationFrame(processFrame);
  }, [videoElement, enabled]);

  useEffect(() => {
    if (!enabled) return;

    activeListeners.add(onResults);
    
    const start = async () => {
      const instance = await initHolistic();
      if (instance && !isProcessing && videoElement) {
        isProcessing = true;
        processFrame();
      }
    };

    start();

    return () => {
      activeListeners.delete(onResults);
      if (activeListeners.size === 0) {
        console.log("[MediaPipe] No active listeners, stopping loop...");
        isProcessing = false;
        if (requestRef) {
          cancelAnimationFrame(requestRef);
          requestRef = null;
        }
        // We keep the model instance warm but stop processing
      }
    };
  }, [enabled, onResults, initHolistic, processFrame, videoElement]);

  return { isLoading, error };
};
