import { useState, useRef, useCallback, useEffect } from 'react';
import { PoseLandmark } from '../vision3-utils';

export type CaptureStatus = 'idle' | 'scanning' | 'countdown' | 'recording' | 'analyzing' | 'completed' | 'error';

interface UsePostureCaptureProps {
  activeTab: string;
  isEntryMode: boolean;
  assessmentMode: 'realtime' | 'stepped';
  onCapture: (data: { 
    timeSeriesLandmarks: PoseLandmark[][]; 
    width: number; 
    height: number; 
    timestamp: number 
  }) => void;
}

/**
 * usePostureCapture - 原子化捕获逻辑 Hook
 * 负责：直接录制2秒时序数据，简化流程
 */
export const usePostureCapture = ({ 
  activeTab, 
  isEntryMode, 
  assessmentMode,
  onCapture 
}: UsePostureCaptureProps) => {
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('idle');
  const [countdown, setCountdown] = useState(5);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isInPosition, setIsInPosition] = useState(true);
  
  const landmarksBufferRef = useRef<PoseLandmark[][]>([]);
  const recordingBufferRef = useRef<PoseLandmark[][]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  const handleLandmarks = useCallback((landmarks: PoseLandmark[]) => {
    landmarksBufferRef.current.push(landmarks);
    if (landmarksBufferRef.current.length > 30) landmarksBufferRef.current.shift();
    
    if (captureStatus === 'recording') {
      recordingBufferRef.current.push(landmarks);
      
      const elapsed = Date.now() - recordingStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setRecordingProgress(progress);
      
      if (elapsed >= 2000) {
        const video = document.querySelector('video') as HTMLVideoElement | null;
        onCapture({
          timeSeriesLandmarks: [...recordingBufferRef.current],
          width: video?.videoWidth || 0,
          height: video?.videoHeight || 0,
          timestamp: Date.now()
        });
        
        setCaptureStatus(assessmentMode === 'realtime' ? 'analyzing' : 'completed');
        recordingBufferRef.current = [];
      }
    }
  }, [captureStatus, assessmentMode, onCapture]);

  useEffect(() => {
    if (captureStatus === 'recording') {
      setRecordingProgress(0);
      recordingStartTimeRef.current = Date.now();
      recordingBufferRef.current = [];
    }
  }, [captureStatus]);

  return {
    captureStatus,
    setCaptureStatus,
    countdown,
    recordingProgress,
    isInPosition,
    handleLandmarks
  };
};
