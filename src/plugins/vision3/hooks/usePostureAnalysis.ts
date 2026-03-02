import { useState, useRef, useCallback, useEffect } from 'react';
import { Results } from '@/lib/mediapipe-utils';
import { usePostureWS } from '@/hooks/usePostureWS';
import { usePostureAssessmentStore, AssessmentType } from '../store/usePostureAssessmentStore';
import { globalMonitor } from '../services/GlobalMonitor';
import { useCaptureStateMachine, CaptureStatus } from './useCaptureStateMachine';
import { 
  normalizeHeadAxes, 
  smoothHeadAxes, 
  scaleHeadAxes, 
  HeadAxes,
  PoseLandmark
} from '../vision3-utils';
import AssessmentFallbackHandler from '@/utils/assessmentFallback';
import { CONFIG } from '@/config';

interface UsePostureAnalysisProps {
  axesScale: number;
  view: 'front' | 'side' | 'back';
  assessmentMode?: 'realtime' | 'stepped';
  assessmentType: AssessmentType;
}

export function usePostureAnalysis({ 
  axesScale, 
  view,
  assessmentMode = 'realtime',
  assessmentType
}: UsePostureAnalysisProps) {
  const { setStep } = usePostureAssessmentStore();
  const { 
    result: wsResult, 
    analyze, 
    analyzeBatch, 
    analyzeStepped,
    markdownReport: wsMarkdownReport,
    auxiliaryReport,
    timeSeriesData
  } = usePostureWS();

  const [steppedResults, setSteppedResults] = useState<Record<string, { timeSeriesLandmarks: PoseLandmark[][]; width: number; height: number; timestamp: number }>>({});
  const [localMarkdownReport, setLocalMarkdownReport] = useState<string | null>(null);
  
  // Combine WebSocket report with local fallback report
  const markdownReport = wsMarkdownReport || localMarkdownReport;

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
    // 分步模式：等待后端返回 markdownReport 后再完成
    if (markdownReport && assessmentMode === 'stepped' && captureStatus === 'analyzing') {
      captureDispatch({ type: 'ANALYSIS_COMPLETE' });
    }
  }, [wsResult, markdownReport, assessmentMode, captureStatus, captureDispatch]);

  // --- Fallback Handling for Analysis Timeout ---
  useEffect(() => {
    if (captureStatus !== 'analyzing') return;

    const timeout = setTimeout(() => {
      console.warn('[usePostureAnalysis] Analysis timeout, using fallback report');
      
      // Generate fallback report with basic data
      const fallbackReport = AssessmentFallbackHandler.generateFallbackReport({
        reason: 'llm_timeout',
        view,
        assessmentType,
        metrics: wsResult?.metrics
      });

      console.log('[usePostureAnalysis] Fallback report generated:', fallbackReport.markdown?.substring(0, 100));
      
      // Set fallback markdown
      setLocalMarkdownReport(fallbackReport.markdown);
      
      // Complete analysis
      captureDispatch({ type: 'ANALYSIS_COMPLETE' });
    }, CONFIG.analysis.timeout); // Analysis timeout

    return () => clearTimeout(timeout);
  }, [captureStatus, view, assessmentType, wsResult?.metrics]);

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
      const width = results.image?.width || CONFIG.video.defaultWidth;
      const height = results.image?.height || CONFIG.video.defaultHeight;
      
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
        width: CONFIG.video.defaultWidth,
        height: CONFIG.video.defaultHeight,
        timestamp: Date.now()
      });
    }
  };
}
