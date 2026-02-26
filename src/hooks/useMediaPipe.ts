import { useEffect, useCallback, useState, useRef } from 'react';
import { Pose, Results, Options } from '@/lib/mediapipe-utils';

/**
 * Singleton MediaPipe Pose instance management
 */
const GLOBAL_KEY = '__NEXUS_POSE_SINGLETON__';

type PoseConstructor = NonNullable<typeof Pose>;
type PoseInstance = PoseConstructor extends new (...args: never[]) => infer Instance ? Instance : never;

interface GlobalState {
  pose: PoseInstance | null;
  activeListeners: Set<(results: Results) => void>;
  isProcessing: boolean;
  requestRef: number | null;
  videoElement: HTMLVideoElement | null;
}

const createGlobalState = (): GlobalState => ({
  pose: null,
  activeListeners: new Set(),
  isProcessing: false,
  requestRef: null,
  videoElement: null
});

const getGlobalState = (): GlobalState => {
  if (typeof window === 'undefined') {
    return createGlobalState();
  }
  const globalWindow = window as unknown as Record<string, unknown>;
  if (!globalWindow[GLOBAL_KEY]) {
    globalWindow[GLOBAL_KEY] = createGlobalState();
  }
  return globalWindow[GLOBAL_KEY] as GlobalState;
};

const DEFAULT_OPTIONS: Options = {
  modelComplexity: 0, // 0: Lite (Fastest), 1: Full, 2: Heavy
  smoothLandmarks: true,
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
  const enabledRef = useRef(enabled);

  // Frame processing loop
  const processFrame = useCallback(async () => {
    const state = getGlobalState();
    if (!state.pose || !state.videoElement || state.activeListeners.size === 0) {
      state.isProcessing = false;
      if (state.requestRef) cancelAnimationFrame(state.requestRef);
      state.requestRef = null;
      return;
    }

    if (state.videoElement.readyState >= 2) {
      try {
        await state.pose.send({ image: state.videoElement });
      } catch (err) {
        console.error("[MediaPipe] Frame processing error:", err);
      }
    }
    
    state.requestRef = requestAnimationFrame(processFrame);
  }, []);

  // Update refs
  useEffect(() => {
    onResultsRef.current = onResults;
    optionsRef.current = options;
    enabledRef.current = enabled;
    
    const state = getGlobalState();
    if (enabled && videoElement) {
      state.videoElement = videoElement;
      if (state.pose && !state.isProcessing) {
        state.isProcessing = true;
        state.requestRef = requestAnimationFrame(processFrame);
      }
    } else if (!enabled) {
      // Don't stop entirely if other listeners might need it
      // but if this specific instance is disabled, we might want to detach
    }
  }, [onResults, options, enabled, videoElement, processFrame]);

  // Initialize Pose model
  const initPose = useCallback(async () => {
    const state = getGlobalState();
    if (state.pose) return state.pose;

    if (!Pose) {
      const err = new Error('MediaPipe Pose constructor not found. Please ensure @mediapipe/pose is installed and loaded.');
      console.error("[MediaPipe] Resolution Error:", err);
      setError(err);
      return null;
    }

    setIsLoading(true);
    try {
      console.log("[MediaPipe] Initializing Pose model with version 0.5.1675469404 assets...");
      
      const PoseConstructor = Pose;
      const pose = new PoseConstructor({
        locateFile: (file: string) => {
          /**
           * Use local assets for maximum reliability and speed.
           * Assets have been copied to /public/mediapipe/pose/
           */
          const localUrl = `/mediapipe/pose/${file}`;
          console.log(`[MediaPipe] Loading local asset: ${localUrl}`);
          return localUrl;
        }
      });

      pose.setOptions({ ...DEFAULT_OPTIONS, ...optionsRef.current });
      
      pose.onResults((results: Results) => {
        const s = getGlobalState();
        s.activeListeners.forEach(listener => listener(results));
      });

      state.pose = pose;
      console.log("[MediaPipe] Pose model successfully initialized.");
      return pose;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize MediaPipe Pose');
      setError(error);
      console.error("[MediaPipe] CRITICAL Initialization error:", err);
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
    const listener = (results: Results) => onResultsRef.current(results);
    state.activeListeners.add(listener);
    state.videoElement = videoElement;
    
    const start = async () => {
      const instance = await initPose();
      if (instance && !state.isProcessing && state.videoElement) {
        state.isProcessing = true;
        processFrame();
      }
    };

    start();

    return () => {
      const s = getGlobalState();
      s.activeListeners.delete(listener);
      if (s.activeListeners.size === 0) {
        s.isProcessing = false;
        if (s.requestRef) {
          cancelAnimationFrame(s.requestRef);
          s.requestRef = null;
        }
        s.videoElement = null;
      }
    };
  }, [enabled, videoElement, initPose, processFrame]); 

  return { isLoading, error };
};
