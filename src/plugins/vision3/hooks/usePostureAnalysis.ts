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
    requestDeepAnalysis,
    markdownReport: wsMarkdownReport,
    streamingReport,
    isStreamingReport,
    auxiliaryDiagnosis,
    timeSeriesData,
    analysisAckAt
  } = usePostureWS();

  const [steppedResults, setSteppedResults] = useState<Record<string, { timeSeriesLandmarks: PoseLandmark[][]; width: number; height: number; timestamp: number }>>({});
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ackedRef = useRef(false);
  
  // Only use WebSocket report, no fallback
  const markdownReport = wsMarkdownReport;

  // Handle Capture Completion
  const onCapture = useCallback((data: { 
    timeSeriesLandmarks: PoseLandmark[][]; 
    width: number; 
    height: number; 
    timestamp: number 
  }) => {
    console.log('[usePostureAnalysis] onCapture called:', { assessmentMode, view, landmarksCount: data.timeSeriesLandmarks.length });
    if (assessmentMode === 'realtime') {
      // 实时模式下直接分析全部时序数据
      console.log('[usePostureAnalysis] Calling analyze for realtime mode');
      analyze(view, data.timeSeriesLandmarks, data.width, data.height);
    } else {
      // 分步模式下存入结果
      console.log('[usePostureAnalysis] Storing result for stepped mode');
      setSteppedResults(prev => {
        const newResults = {
          ...prev,
          [view]: data
        };
        
        // 快速评估模式：采集完立刻触发分析（不管几个视角）
        if (assessmentType === 'quick') {
          console.log('[usePostureAnalysis] Quick assessment: auto-triggering analysis after capture');
          // 延迟一帧，确保状态更新完成
          setTimeout(() => {
            // 将当前视角的数据转换为 SteppedFrame 格式并发送分析
            const frames = Object.entries(newResults).map(([v, result]) => ({
              view: v as 'front' | 'side' | 'back',
              timeSeriesLandmarks: result.timeSeriesLandmarks,
              width: result.width,
              height: result.height,
              timestamp: result.timestamp
            }));
            console.log('[usePostureAnalysis] Calling analyzeStepped with frames:', frames.length);
            analyzeStepped(frames, assessmentType);
          }, 100);
        }
        
        return newResults;
      });
    }
  }, [assessmentMode, assessmentType, analyze, view, analyzeStepped]);

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
    console.log('[usePostureAnalysis] markdownReport changed:', markdownReport ? 'exists' : 'null');
    if (markdownReport) {
      console.log('[usePostureAnalysis] Setting step to completed');
      setStep('completed');
    }
  }, [markdownReport, setStep]);

  useEffect(() => {
    console.log('[usePostureAnalysis] Checking analysis completion:', { markdownReport: markdownReport ? 'exists' : 'null', captureStatus });
    // 所有模式：等待后端返回 markdownReport 后再完成
    if (markdownReport && captureStatus === 'analyzing') {
      console.log('[usePostureAnalysis] Dispatching ANALYSIS_COMPLETE');
      captureDispatch({ type: 'ANALYSIS_COMPLETE' });
    }
  }, [markdownReport, captureStatus, captureDispatch]);

  useEffect(() => {
    if (captureStatus === 'analyzing') {
      ackedRef.current = false;
      if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
      // 不再生成fallback报告，只设置超时
      analysisTimeoutRef.current = setTimeout(() => {
        // 超时后直接完成分析，后端会返回API链接失败信息
        captureDispatch({ type: 'ANALYSIS_COMPLETE' });
      }, CONFIG.analysis.timeout);
      return;
    }
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
  }, [captureStatus, captureDispatch]);

  useEffect(() => {
    if (captureStatus !== 'analyzing' || !analysisAckAt || ackedRef.current) return;
    ackedRef.current = true;
    if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
    // 不再生成fallback报告，只设置超时
    analysisTimeoutRef.current = setTimeout(() => {
      // 超时后直接完成分析，后端会返回API链接失败信息
      captureDispatch({ type: 'ANALYSIS_COMPLETE' });
    }, CONFIG.analysis.timeout);
  }, [analysisAckAt, captureStatus, captureDispatch]);

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
    if (captureStatus === 'completed') {
      setStep('completed');
    } else if (captureStatus === 'analyzing') {
      setStep('analyzing');
    } else if (captureStatus === 'idle') {
      setStep('idle');
    }
  }, [captureStatus, setStep]);

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
    requestDeepAnalysis,
    markdownReport,
    streamingReport,
    isStreamingReport,
    auxiliaryDiagnosis,
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
