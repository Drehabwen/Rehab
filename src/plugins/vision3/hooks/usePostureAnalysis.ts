import { useState, useRef, useCallback, useEffect } from 'react';
import { Results } from '@/lib/mediapipe-utils';
import { usePostureWS } from '@/hooks/usePostureWS';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';
import { globalMonitor } from '../services/GlobalMonitor';
import { useCaptureStateMachine, CaptureStatus } from './useCaptureStateMachine';
import { 
  normalizeHeadAxes, 
  smoothHeadAxes, 
  scaleHeadAxes, 
  HeadAxes,
  PoseLandmark
} from '../vision3-utils';

interface UsePostureAnalysisProps {
  axesScale: number;
  view: 'front' | 'side' | 'back';
  assessmentMode?: 'realtime' | 'stepped';
}

export function usePostureAnalysis({ 
  axesScale, 
  view,
  assessmentMode = 'realtime'
}: UsePostureAnalysisProps) {
  const { setStep } = usePostureAssessmentStore();
  const { 
    result: wsResult, 
    analyze, 
    analyzeBatch, 
    analyzeStepped,
    markdownReport,
    auxiliaryReport,
    timeSeriesData
  } = usePostureWS();

  const [steppedResults, setSteppedResults] = useState<Record<string, { timeSeriesLandmarks: PoseLandmark[][]; width: number; height: number; timestamp: number }>>({});

  // Handle Capture Completion
  const onCapture = useCallback((data: { 
    timeSeriesLandmarks: PoseLandmark[][]; 
    width: number; 
    height: number; 
    timestamp: number 
  }) => {
    if (assessmentMode === 'realtime') {
      // 实时模式下直接分析全部时序数据
      analyze(view, data.timeSeriesLandmarks, data.width, data.height);
    } else {
      // 分步模式下存入结果
      setSteppedResults(prev => ({
        ...prev,
        [view]: data
      }));
    }
  }, [assessmentMode, analyze, view]);

  // --- Capture Logic (StateMachine) ---
  const {
    status: captureStatus,
    dispatch: captureDispatch,
    countdown,
    recordingProgress,
    isInPosition,
    processLandmarks
  } = useCaptureStateMachine(onCapture);

  useEffect(() => {
    // 实时模式：等到后端返回结果后再完成
    if (wsResult && assessmentMode === 'realtime' && captureStatus === 'analyzing') {
      captureDispatch({ type: 'ANALYSIS_COMPLETE' });
    }
    // 分步模式：录制完成后直接标记为该视角拍摄完成（预览状态）
    if (assessmentMode === 'stepped' && captureStatus === 'analyzing') {
      captureDispatch({ type: 'ANALYSIS_COMPLETE' });
    }
  }, [wsResult, assessmentMode, captureStatus, captureDispatch]);

  // --- Analysis Visualization Logic ---
  const [headAxes, setHeadAxes] = useState<HeadAxes | null>(null);
  const smoothedAxesRef = useRef<HeadAxes | null>(null);

  useEffect(() => {
    if (wsResult) {
      const normalized = normalizeHeadAxes(wsResult.metrics.head_axes);
      if (normalized) {
        const smoothed = smoothHeadAxes(smoothedAxesRef.current, normalized, 0.35);
        smoothedAxesRef.current = smoothed;
        setHeadAxes(scaleHeadAxes(smoothed, axesScale));
      } else {
        smoothedAxesRef.current = null;
        setHeadAxes(null);
      }
    } else {
      setHeadAxes(null);
    }
  }, [wsResult, axesScale]);

  useEffect(() => {
    globalMonitor.registerAnalysisCallback((data) => {
      analyzeBatch(data);
    });
  }, [analyzeBatch]);

  useEffect(() => {
    if (wsResult) setStep('completed');
  }, [wsResult, setStep]);

  const onResults = useCallback((results: Results) => {
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks as PoseLandmark[];
      // 获取当前画面的实际尺寸
      const width = results.image?.width || 640;
      const height = results.image?.height || 480;
      
      processLandmarks(landmarks, width, height);
      globalMonitor.onFrame(landmarks);
    }
  }, [processLandmarks]);

  return {
    wsResult,
    analyze,
    analyzeBatch,
    analyzeStepped,
    markdownReport,
    auxiliaryReport,
    onResults,
    captureStatus,
    setCaptureStatus: (value: React.SetStateAction<CaptureStatus>) => {
      const nextStatus = typeof value === 'function' ? value(captureStatus) : value;
      switch (nextStatus) {
        case 'scanning':
          captureDispatch({ type: 'START_SCAN' });
          break;
        case 'recording':
          captureDispatch({ type: 'START_RECORDING' });
          break;
        case 'analyzing':
          captureDispatch({ type: 'ANALYSIS_START' });
          break;
        case 'completed':
          captureDispatch({ type: 'ANALYSIS_COMPLETE' });
          break;
        case 'idle':
          captureDispatch({ type: 'RESET' });
          break;
        default:
          console.warn(`[usePostureAnalysis] Unknown status transition: ${nextStatus}`);
      }
    },
    captureDispatch,
    countdown,
    recordingProgress,
    isInPosition,
    steppedResults,
    setSteppedResults,
    headAxes,
    annotations: wsResult?.annotations || [],
    timeSeriesData,
    simulateMockCapture: () => {
      console.log('[Mock] Starting simulation...');
      const mockFrames: PoseLandmark[][] = [];
      for (let f = 0; f < 60; f++) {
        const t = f / 30;
        const landmarks: PoseLandmark[] = Array.from({ length: 33 }, (_, i) => ({
          x: 0.5 + (i === 11 || i === 12 ? 0.02 * Math.sin(Math.PI * t) : 0),
          y: 0.5 + (i * 0.01),
          z: 0,
          visibility: 0.95
        }));
        mockFrames.push(landmarks);
      }
      
      onCapture({
        timeSeriesLandmarks: mockFrames,
        width: 640,
        height: 480,
        timestamp: Date.now()
      });
    }
  };
}
