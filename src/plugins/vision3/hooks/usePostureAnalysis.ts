import { useState, useRef, useCallback, useEffect } from 'react';
import { Results } from '@mediapipe/holistic';
import { usePostureWS } from '@/hooks/usePostureWS';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';
import { globalMonitor } from '../services/GlobalMonitor';
import { usePostureCapture } from './usePostureCapture';
import { 
  normalizeHeadAxes, 
  smoothHeadAxes, 
  scaleHeadAxes, 
  HeadAxes,
  PoseLandmark
} from '../vision3-utils';

interface UsePostureAnalysisProps {
  axesScale: number;
  activeTab: string;
  isEntryMode: boolean;
  view: 'front' | 'side' | 'back';
  assessmentMode?: 'realtime' | 'stepped';
}

export function usePostureAnalysis({ 
  axesScale, 
  activeTab,
  isEntryMode,
  view,
  assessmentMode = 'realtime'
}: UsePostureAnalysisProps) {
  const { setStep } = usePostureAssessmentStore();
  const { 
    result: wsResult, 
    analyze, 
    analyzeBatch, 
    analyzeStepped,
    htmlReport 
  } = usePostureWS();

  const [steppedResults, setSteppedResults] = useState<Record<string, { timeSeriesLandmarks: PoseLandmark[][]; width: number; height: number; timestamp: number }>>({});

  // --- Capture Logic (Atomic Hook) ---
  const {
    captureStatus,
    setCaptureStatus,
    countdown,
    recordingProgress,
    isInPosition,
    handleLandmarks
  } = usePostureCapture({
    activeTab,
    isEntryMode,
    assessmentMode,
    onCapture: useCallback((data) => {
      if (assessmentMode === 'realtime') {
        analyze(view, [data.timeSeriesLandmarks[data.timeSeriesLandmarks.length - 1]], data.width, data.height);
      } else {
        setSteppedResults(prev => ({
          ...prev,
          [view]: { 
            timeSeriesLandmarks: data.timeSeriesLandmarks, 
            width: data.width, 
            height: data.height, 
            timestamp: data.timestamp 
          }
        }));
      }
    }, [assessmentMode, analyze, view])
  });

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
    if (htmlReport) setStep('completed');
  }, [htmlReport, setStep]);

  const onResults = useCallback((results: Results) => {
    if (results.poseLandmarks) {
      const landmarks = results.poseLandmarks as PoseLandmark[];
      handleLandmarks(landmarks);
      globalMonitor.onFrame(landmarks);
    }
  }, [handleLandmarks]);

  return {
    wsResult,
    analyze,
    analyzeBatch,
    analyzeStepped,
    htmlReport,
    onResults,
    captureStatus,
    setCaptureStatus,
    countdown,
    recordingProgress,
    isInPosition,
    steppedResults,
    setSteppedResults,
    headAxes,
    annotations: wsResult?.annotations || []
  };
}
