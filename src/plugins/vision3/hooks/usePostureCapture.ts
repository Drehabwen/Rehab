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
 * 负责：位置检测、倒计时、2秒时序数据采集、状态流转
 */
export const usePostureCapture = ({ 
  activeTab, 
  isEntryMode, 
  assessmentMode,
  onCapture 
}: UsePostureCaptureProps) => {
  const [captureStatus, setCaptureStatus] = useState<CaptureStatus>('idle');
  const [countdown, setCountdown] = useState(5);
  const [recordingProgress, setRecordingProgress] = useState(0); // 0-100
  const [isInPosition, setIsInPosition] = useState(false);
  
  const landmarksBufferRef = useRef<PoseLandmark[][]>([]);
  const recordingBufferRef = useRef<PoseLandmark[][]>([]);
  const recordingStartTimeRef = useRef<number>(0);

  // 1. 位置检测逻辑
  const checkUserPosition = useCallback((landmarks: PoseLandmark[]) => {
    if (!landmarks || landmarks.length < 33) return false;
    const keyPointsIndices = [0, 11, 12, 23, 24]; // Nose, Shoulders, Hips
    const visible = keyPointsIndices.every(idx => (landmarks[idx].visibility ?? 0) > 0.5);
    return visible;
  }, []);

  // 2. 外部调用的关键点处理函数
  const handleLandmarks = useCallback((landmarks: PoseLandmark[]) => {
    // 实时 Buffer (用于位置检测等)
    landmarksBufferRef.current.push(landmarks);
    if (landmarksBufferRef.current.length > 30) landmarksBufferRef.current.shift();
    
    // 如果正在录制，则存入录制 Buffer
    if (captureStatus === 'recording') {
      recordingBufferRef.current.push(landmarks);
      
      const elapsed = Date.now() - recordingStartTimeRef.current;
      const progress = Math.min(100, (elapsed / 2000) * 100);
      setRecordingProgress(progress);
      
      // 达到 2 秒，结束录制
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
    
    if (activeTab === 'posture' && !isEntryMode) {
      if (captureStatus === 'scanning' || captureStatus === 'idle') {
        const inPos = checkUserPosition(landmarks);
        setIsInPosition(prev => prev !== inPos ? inPos : prev);
        
        if (inPos && captureStatus === 'scanning') {
          setCaptureStatus('countdown');
        }
      }
    }
  }, [activeTab, isEntryMode, captureStatus, checkUserPosition, assessmentMode, onCapture]);

  // 3. 状态监听与录制初始化
  useEffect(() => {
    if (captureStatus === 'recording') {
      setRecordingProgress(0);
      recordingStartTimeRef.current = Date.now();
      recordingBufferRef.current = [];
    }
  }, [captureStatus]);

  // 4. 倒计时时机控制
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (captureStatus === 'countdown' && countdown > 0) {
      timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    } else if (captureStatus === 'countdown' && countdown === 0) {
      // 倒计时结束，开始录制
      setCaptureStatus('recording');
    }
    return () => clearTimeout(timer);
  }, [captureStatus, countdown]);

  // 4. 状态重置
  useEffect(() => {
    if (captureStatus === 'countdown') {
      setCountdown(5);
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
