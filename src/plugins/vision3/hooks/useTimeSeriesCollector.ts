import { useRef, useCallback, useState } from 'react';
import { PoseLandmark } from '../vision3-utils';

export interface TimeSeriesData {
  view: string;
  timeSeriesLandmarks: PoseLandmark[][];
  width: number;
  height: number;
  timestamp: number;
}

export interface UseTimeSeriesCollectorProps {
  view: string;
  isCollecting: boolean;
  onCollectionComplete: (data: TimeSeriesData) => void;
  requiredFrames?: number; // Default 60 frames (approx 2s at 30fps)
}

/**
 * Headless hook for collecting time-series landmark data.
 * Pure logic, no UI dependencies.
 */
export function useTimeSeriesCollector({
  view,
  isCollecting,
  onCollectionComplete,
  requiredFrames = 60
}: UseTimeSeriesCollectorProps) {
  const bufferRef = useRef<PoseLandmark[][]>([]);
  const [progress, setProgress] = useState(0);
  
  // This function should be called every time new landmarks are available
  const collectFrame = useCallback((landmarks: PoseLandmark[], width: number, height: number) => {
    if (!isCollecting) {
      if (bufferRef.current.length > 0) {
        // Reset if collection stopped abruptly
        bufferRef.current = [];
        setProgress(0);
      }
      return;
    }

    // Add current frame to buffer
    bufferRef.current.push(landmarks);
    
    // Update progress (0-100)
    const currentProgress = Math.min(100, (bufferRef.current.length / requiredFrames) * 100);
    setProgress(currentProgress);

    // Check if we have enough frames
    if (bufferRef.current.length >= requiredFrames) {
      const data: TimeSeriesData = {
        view,
        timeSeriesLandmarks: [...bufferRef.current],
        width,
        height,
        timestamp: Date.now()
      };
      
      onCollectionComplete(data);
      
      // Reset after completion
      bufferRef.current = [];
      setProgress(0);
    }
  }, [isCollecting, requiredFrames, view, onCollectionComplete]);

  return {
    collectFrame,
    progress
  };
}
