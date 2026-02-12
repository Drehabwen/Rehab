import { useCameraV2 } from '@/nexus-v2/hooks/useCameraV2';

/**
 * useCameraStream - Legacy Hook (V2 Transition)
 * Redirected to V2 engine to restore camera functionality.
 */
export const useCameraStream = (enabled: boolean = true) => {
  const { stream, error, isLoading } = useCameraV2(enabled);
  
  return {
    stream,
    error,
    isLoading,
    startStream: async () => null, // Managed by V2 internally
    stopStream: () => {}           // Managed by V2 internally
  };
};

export const resetCameraStreamForTesting = () => {};
