import { useState, useRef, useCallback, useEffect } from 'react';
import { PoseLandmark } from '../vision3-utils';

interface UsePostureCaptureProps {
  analyze: (view: string, landmarks: any[], width: number, height: number, image: string) => void;
  view: string;
  activeTab: string;
  isEntryMode: boolean;
}

export const usePostureCapture = ({ analyze, view, activeTab, isEntryMode }: UsePostureCaptureProps) => {
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'scanning' | 'countdown' | 'analyzing'>('idle');
  const [countdown, setCountdown] = useState(5);
  const [isInPosition, setIsInPosition] = useState(false);
  const landmarksBufferRef = useRef<PoseLandmark[][]>([]);
  const capturedImage = useRef<string | null>(null);

  const checkUserPosition = useCallback((landmarks: PoseLandmark[]) => {
    if (!landmarks || landmarks.length < 33) return false;
    const keyPointsIndices = [0, 11, 12, 23, 24]; // Nose, Shoulders, Hips
    const visible = keyPointsIndices.every(idx => (landmarks[idx].visibility ?? 0) > 0.5);
    return visible;
  }, []);

  const handleLandmarks = useCallback((landmarks: PoseLandmark[]) => {
    landmarksBufferRef.current.push(landmarks);
    if (landmarksBufferRef.current.length > 30) landmarksBufferRef.current.shift();
    
    if (activeTab === 'posture' && !isEntryMode) {
      if (captureStatus === 'scanning') {
        const inPos = checkUserPosition(landmarks);
        
        // Only update if state actually changes to avoid unnecessary re-renders
        setIsInPosition(prev => {
          if (prev !== inPos) return inPos;
          return prev;
        });
        
        if (inPos) {
          setCaptureStatus('countdown');
        }
      }
    }
  }, [activeTab, isEntryMode, captureStatus, checkUserPosition]);

  // Countdown Logic
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (captureStatus === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (captureStatus === 'countdown' && countdown === 0) {
      setCaptureStatus('analyzing');
      
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg');
        capturedImage.current = imageData;
        
        const currentLandmarks = landmarksBufferRef.current[landmarksBufferRef.current.length - 1] || [];
        analyze(view, currentLandmarks, video.videoWidth, video.videoHeight, imageData);
      }
    }
    return () => clearTimeout(timer);
  }, [captureStatus, countdown, analyze, view]);

  // Reset countdown when entering countdown state
  useEffect(() => {
    if (captureStatus === 'countdown') {
      setCountdown(5);
    }
  }, [captureStatus]);

  return {
    captureStatus,
    setCaptureStatus,
    countdown,
    isInPosition,
    handleLandmarks,
    landmarksBufferRef,
    capturedImage
  };
};
