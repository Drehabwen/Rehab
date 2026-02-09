/**
 * useCameraStream - Legacy Hook (V2 Transition)
 * Temporarily disabled to prevent crashes during V2 reconstruction.
 */
export const useCameraStream = (enabled: boolean = true) => {
  return {
    stream: null,
    error: null,
    isLoading: false,
    startStream: async () => null,
    stopStream: () => {}
  };
};

export const resetCameraStreamForTesting = () => {};
