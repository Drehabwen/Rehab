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
  PoseLandmark,
} from '../vision3-utils';
import { CONFIG } from '@/config';
import { PostureProcessor } from '@/lib/posture-processor';
import type { PostureIssue, PostureMetrics } from '@/types/posture';
import { buildImmediateBasicReport, inferImmediateIssues } from '../report-insights';

interface UsePostureAnalysisProps {
  axesScale: number;
  view: 'front' | 'side' | 'back';
  assessmentMode?: 'realtime' | 'stepped';
  assessmentType: AssessmentType;
}

const hasStructuredPostureResult = (
  result: ReturnType<typeof usePostureWS>['result'] | null,
) => {
  if (!result) {
    return false;
  }

  const hasMetrics = Object.values(result.metrics || {}).some(
    (value) => typeof value === 'number' && Number.isFinite(value),
  );
  const hasIssues = (result.issues?.length ?? 0) > 0;

  return hasMetrics || hasIssues;
};

const QUICK_ANALYSIS_ERROR_MESSAGE =
  '\u5feb\u901f\u8bc4\u4f30\u81ea\u52a8\u5206\u6790\u89e6\u53d1\u5931\u8d25\uff0c\u8bf7\u91cd\u8bd5\u4e00\u6b21\u3002';

interface ImmediateQuickResult {
  metrics: PostureMetrics;
  issues: PostureIssue[];
  timestamp: number;
}

const estimateCaptureDurationMs = (frames: PoseLandmark[][]) => {
  return Math.max(1000, Math.round((frames.length / 30) * 1000));
};

export function usePostureAnalysis({
  axesScale,
  view,
  assessmentMode = 'realtime',
  assessmentType,
}: UsePostureAnalysisProps) {
  const { setStep, setError } = usePostureAssessmentStore();
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
    analysisAckAt,
  } = usePostureWS();

  const [steppedResults, setSteppedResults] = useState<
    Record<string, { timeSeriesLandmarks: PoseLandmark[][]; width: number; height: number; timestamp: number }>
  >({});
  const analysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickAnalysisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureDispatchRef = useRef<React.Dispatch<{ type: string; payload?: unknown }> | null>(null);
  const ackedRef = useRef(false);
  const [immediateQuickResult, setImmediateQuickResult] = useState<ImmediateQuickResult | null>(null);
  const [immediateQuickReport, setImmediateQuickReport] = useState<string | null>(null);
  const [immediateQuickTimeSeries, setImmediateQuickTimeSeries] = useState<ReturnType<typeof PostureProcessor.process>['timeSeries'] | null>(null);

  const markdownReport = wsMarkdownReport;
  const hasImmediateQuickReport = assessmentType === 'quick' && Boolean(
    immediateQuickReport || hasStructuredPostureResult(wsResult),
  );
  const hasCompletedReport = Boolean(markdownReport || auxiliaryDiagnosis || hasImmediateQuickReport);

  const failQuickAnalysis = useCallback((error: unknown) => {
    console.error('[usePostureAnalysis] Quick assessment auto analysis failed:', error);
    setError(QUICK_ANALYSIS_ERROR_MESSAGE);
    captureDispatchRef.current?.({ type: 'SET_ERROR', payload: QUICK_ANALYSIS_ERROR_MESSAGE });
  }, [setError]);

  const onCapture = useCallback((data: {
    timeSeriesLandmarks: PoseLandmark[][];
    width: number;
    height: number;
    timestamp: number;
  }) => {
    console.log('[usePostureAnalysis] onCapture called:', {
      assessmentMode,
      view,
      landmarksCount: data.timeSeriesLandmarks.length,
    });

    if (assessmentMode === 'realtime') {
      console.log('[usePostureAnalysis] Calling analyze for realtime mode');
      setImmediateQuickResult(null);
      setImmediateQuickReport(null);
      setImmediateQuickTimeSeries(null);
      analyze(view, data.timeSeriesLandmarks, data.width, data.height);
      return;
    }

    console.log('[usePostureAnalysis] Storing result for stepped mode');
    if (assessmentType !== 'quick') {
      setImmediateQuickResult(null);
      setImmediateQuickReport(null);
      setImmediateQuickTimeSeries(null);
    }
    setSteppedResults((prev) => {
      const newResults = {
        ...prev,
        [view]: data,
      };

      if (assessmentType === 'quick') {
        try {
          const localAnalysis = PostureProcessor.process(
            data.timeSeriesLandmarks,
            view,
            estimateCaptureDurationMs(data.timeSeriesLandmarks),
          );
          const inferredIssues = inferImmediateIssues(localAnalysis.averages);
          const fallbackReport = buildImmediateBasicReport({
            metrics: localAnalysis.averages,
            issues: inferredIssues,
          });

          setImmediateQuickResult({
            metrics: localAnalysis.averages,
            issues: inferredIssues,
            timestamp: data.timestamp,
          });
          setImmediateQuickReport(fallbackReport);
          setImmediateQuickTimeSeries(localAnalysis.timeSeries);
        } catch (error) {
          console.warn('[usePostureAnalysis] Failed to build local quick preview:', error);
          setImmediateQuickResult(null);
          setImmediateQuickReport(null);
          setImmediateQuickTimeSeries(null);
        }

        console.log('[usePostureAnalysis] Quick assessment: auto-triggering analysis after capture');
        if (quickAnalysisTimeoutRef.current) {
          clearTimeout(quickAnalysisTimeoutRef.current);
        }

        quickAnalysisTimeoutRef.current = setTimeout(() => {
          try {
            const frames = Object.entries(newResults).map(([capturedView, result]) => ({
              view: capturedView as 'front' | 'side' | 'back',
              timeSeriesLandmarks: result.timeSeriesLandmarks,
              width: result.width,
              height: result.height,
              timestamp: result.timestamp,
            }));

            if (frames.length === 0) {
              throw new Error('No stepped frames available for quick analysis');
            }

            console.log('[usePostureAnalysis] Calling analyzeStepped with frames:', frames.length);
            analyzeStepped(frames, assessmentType);
          } catch (error) {
            failQuickAnalysis(error);
          } finally {
            quickAnalysisTimeoutRef.current = null;
          }
        }, 100);
      }

      return newResults;
    });
  }, [assessmentMode, assessmentType, analyze, analyzeStepped, failQuickAnalysis, view]);

  const {
    status: captureStatus,
    dispatch: captureDispatch,
    countdown,
    recordingProgress,
    isInPosition,
    processLandmarks,
  } = useCaptureStateMachine(onCapture);

  captureDispatchRef.current = captureDispatch;

  useEffect(() => () => {
    if (quickAnalysisTimeoutRef.current) {
      clearTimeout(quickAnalysisTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (captureStatus === 'idle') {
      setImmediateQuickResult(null);
      setImmediateQuickReport(null);
      setImmediateQuickTimeSeries(null);
    }
  }, [captureStatus]);

  useEffect(() => {
    console.log('[usePostureAnalysis] Checking analysis completion:', {
      markdownReport: markdownReport ? 'exists' : 'null',
      auxiliaryDiagnosis: auxiliaryDiagnosis ? 'exists' : 'null',
      hasImmediateQuickReport,
      captureStatus,
    });
    if (hasCompletedReport && captureStatus === 'analyzing') {
      console.log('[usePostureAnalysis] Dispatching ANALYSIS_COMPLETE');
      captureDispatch({ type: 'ANALYSIS_COMPLETE' });
    }
  }, [auxiliaryDiagnosis, captureDispatch, captureStatus, hasCompletedReport, hasImmediateQuickReport, markdownReport]);

  useEffect(() => {
    if (captureStatus === 'analyzing') {
      ackedRef.current = false;
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      analysisTimeoutRef.current = setTimeout(() => {
        captureDispatch({ type: 'ANALYSIS_COMPLETE' });
      }, CONFIG.analysis.timeout);
      return;
    }

    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
      analysisTimeoutRef.current = null;
    }
  }, [captureDispatch, captureStatus]);

  useEffect(() => {
    if (captureStatus !== 'analyzing' || !analysisAckAt || ackedRef.current) {
      return;
    }

    ackedRef.current = true;
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }
    analysisTimeoutRef.current = setTimeout(() => {
      captureDispatch({ type: 'ANALYSIS_COMPLETE' });
    }, CONFIG.analysis.timeout);
  }, [analysisAckAt, captureDispatch, captureStatus]);

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
  }, [axesScale, wsResult]);

  useEffect(() => {
    globalMonitor.registerAnalysisCallback((data) => {
      analyzeBatch(data);
    });
  }, [analyzeBatch]);

  useEffect(() => {
    if (hasCompletedReport || captureStatus === 'completed') {
      setStep('completed');
    } else if (captureStatus === 'analyzing') {
      setStep('analyzing');
    } else if (captureStatus === 'idle') {
      setStep('idle');
    }
  }, [captureStatus, hasCompletedReport, setStep]);

  const onResults = useCallback((results: Results) => {
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks as PoseLandmark[];
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
    immediateQuickReport,
    immediateQuickResult,
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
    immediateQuickTimeSeries,
    simulateMockCapture: () => {
      console.log('[Mock] Starting simulation...');
      const mockFrames: PoseLandmark[][] = [];
      for (let f = 0; f < 60; f += 1) {
        const t = f / 30;
        const landmarks: PoseLandmark[] = Array.from({ length: 33 }, (_, i) => ({
          x: 0.5 + (i === 11 || i === 12 ? 0.02 * Math.sin(Math.PI * t) : 0),
          y: 0.5 + (i * 0.01),
          z: 0,
          visibility: 0.95,
        }));
        mockFrames.push(landmarks);
      }

      onCapture({
        timeSeriesLandmarks: mockFrames,
        width: CONFIG.video.defaultWidth,
        height: CONFIG.video.defaultHeight,
        timestamp: Date.now(),
      });
    },
  };
}
