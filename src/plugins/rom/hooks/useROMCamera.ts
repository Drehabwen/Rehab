import { useState, useRef, useCallback, useEffect } from 'react';

export const useROMCamera = () => {
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  
  const toggleFullscreen = useCallback(() => {
    if (!videoContainerRef.current) return;
    
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  }, []);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);
  
  return {
    isCameraOn,
    setIsCameraOn,
    isMirrored,
    setIsMirrored,
    isFullscreen,
    toggleFullscreen,
    videoContainerRef,
  };
};
