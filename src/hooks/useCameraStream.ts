import { useCameraV2 } from '@/nexus-v2/hooks/useCameraV2';

/**
 * useCameraStream - Bridge to V2
 * Redirects legacy calls to the new V2 camera engine.
 */
export const useCameraStream = (enabled: boolean = true) => {
  const { stream, error, isLoading, trackInfo } = useCameraV2(enabled);
  
  return {
    stream,
    error,
    isLoading,
    // Provide compatibility shims if needed, or expose V2 methods directly
    startStream: async () => {}, // V2 handles this internally via useEffect
    stopStream: () => {}, // V2 handles cleanup internally
    trackInfo
  };
};

export const resetCameraStreamForTesting = () => {};
