import { useState, useRef, useCallback, useEffect } from 'react';
import { Results } from '@mediapipe/holistic';
import { PostureProcessor } from '@/lib/posture-processor';
import { checkUserPosition } from '../utils';
import type { Landmark } from '@/hooks/usePostureWS';

export interface UsePostureCaptureProps {
  view: 'front' | 'back' | 'side';
  analyze: (view: any, landmarks: any[], width: number, height: number) => void;
  analyzeBatch: (analysis: any) => void;
}

export interface UsePostureCaptureReturn {
  captureStatus: 'idle' | 'scanning' | 'countdown' | 'recording' | 'analyzing' | 'completed';
  setCaptureStatus: (status: any) => void;
  countdown: number;
  recordingProgress: number;
  isInPosition: boolean;
  showQualityWarning: boolean;
  onResults: (results: Results) => void;
  startScanning: () => void;
  resetAnalysis: () => void;
  handleCapture: (video: HTMLVideoElement) => void;
}

export const usePostureCapture = ({
  view,
  analyze,
  analyzeBatch
}: UsePostureCaptureProps): UsePostureCaptureReturn => {
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'scanning' | 'countdown' | 'recording' | 'analyzing' | 'completed'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [isInPosition, setIsInPosition] = useState(false);
  const [showQualityWarning, setShowQualityWarning] = useState(false);

  const recordingStartTimeRef = useRef<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const landmarksBufferRef = useRef<Landmark[][]>([]);
  const captureStatusRef = useRef(captureStatus);

  useEffect(() => {
    captureStatusRef.current = captureStatus;
  }, [captureStatus]);

  const startScanning = useCallback(() => {
    console.log('[Posture] Starting scan mode');
    setCaptureStatus('scanning');
    setCountdown(3);
    setIsInPosition(false);
    landmarksBufferRef.current = [];
  }, []);

  const resetAnalysis = useCallback(() => {
    console.log('[Posture] Resetting analysis state');
    setCaptureStatus('idle');
    setIsInPosition(false);
    landmarksBufferRef.current = [];
  }, []);

  const handleCapture = useCallback((video: HTMLVideoElement) => {
    if (landmarksBufferRef.current.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageSrc = canvas.toDataURL('image/jpeg');

    const buffer = landmarksBufferRef.current;
    if (buffer.length === 0) return;

    const avgLandmarks = buffer[0].map(() => ({ x: 0, y: 0, z: 0, visibility: 0 }));

    for (const frame of buffer) {
      frame.forEach((lm, idx) => {
        if (avgLandmarks[idx]) {
          avgLandmarks[idx].x += lm.x;
          avgLandmarks[idx].y += lm.y;
          avgLandmarks[idx].z += lm.z ?? 0;
          avgLandmarks[idx].visibility += lm.visibility ?? 0;
        }
      });
    }

    const count = buffer.length;
    let currentLandmarks: Landmark[] = avgLandmarks.map(lm => ({
      x: lm.x / count,
      y: lm.y / count,
      z: lm.z / count,
      visibility: lm.visibility / count
    }));

    if (view === 'front') {
      currentLandmarks = currentLandmarks.map((lm) => ({
        ...lm,
        x: 1 - lm.x
      }));
    }

    if (imageSrc) {
      analyze(view, [currentLandmarks], video.videoWidth, video.videoHeight);
    }
  }, [view, analyze]);

  const onResults = useCallback((results: Results) => {
    if (results.poseLandmarks) {
      const poseLandmarks = results.poseLandmarks as Landmark[];
      const status = captureStatusRef.current;

      if (status === 'recording') {
        if (poseLandmarks && checkUserPosition(poseLandmarks)) {
          landmarksBufferRef.current.push(poseLandmarks);
        }
      } else {
        landmarksBufferRef.current.push(poseLandmarks);
        if (landmarksBufferRef.current.length > 30) {
          landmarksBufferRef.current.shift();
        }
      }

      if (status === 'scanning' || status === 'countdown') {
        const inPos = checkUserPosition(poseLandmarks);
        if (inPos !== isInPosition) {
          console.log(`[Posture] User position changed: ${inPos}, status: ${status}`);
          setIsInPosition(inPos);
        }

        if (status === 'scanning' && inPos) {
          console.log('[Posture] User in position, starting countdown');
          setCaptureStatus('countdown');
          setCountdown(3);
          landmarksBufferRef.current = [];
        } else if (status === 'countdown' && !inPos) {
          console.log('[Posture] User left position, cancelling countdown');
          setCaptureStatus('scanning');
          setCountdown(3);
        }
      } else if (status === 'recording') {
        const now = performance.now();
        const elapsed = now - recordingStartTimeRef.current;
        const progress = Math.min((elapsed / 2000) * 100, 100);
        console.log(`[Posture] Recording progress: ${progress.toFixed(1)}%, frames: ${landmarksBufferRef.current.length}`);
        setRecordingProgress(progress);

        if (elapsed >= 2000) {
          console.log(`[Posture] Recording finished. Captured ${landmarksBufferRef.current.length} frames.`);
          setCaptureStatus('analyzing');

          if (landmarksBufferRef.current.length < 15) {
            console.warn('[Posture] Insufficient frames for analysis');
            setCaptureStatus('idle');
            setShowQualityWarning(true);
            setTimeout(() => setShowQualityWarning(false), 5000);
            landmarksBufferRef.current = [];
            return;
          }

          const analysis = PostureProcessor.process(
            landmarksBufferRef.current,
            view,
            2000
          );
          analyzeBatch(analysis);
          landmarksBufferRef.current = [];
        }
      }
    }
  }, [isInPosition, analyzeBatch, view]);

  useEffect(() => {
    if (captureStatus === 'countdown') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            setCaptureStatus('recording');
            recordingStartTimeRef.current = performance.now();
            landmarksBufferRef.current = [];
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [captureStatus]);

  useEffect(() => {
    if (captureStatus === 'countdown' && countdown === 0) {
      console.log('[Posture] Countdown finished, starting recording phase');
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (video) handleCapture(video);
    }
  }, [countdown, captureStatus, handleCapture]);

  return {
    captureStatus,
    setCaptureStatus,
    countdown,
    recordingProgress,
    isInPosition,
    showQualityWarning,
    onResults,
    startScanning,
    resetAnalysis,
    handleCapture
  };
};
