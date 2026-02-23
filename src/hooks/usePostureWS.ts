import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { PostureMetrics, PostureIssue, Landmark } from '@/types/posture';
import { TemporalAnalysis } from '@/lib/posture-processor';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { usePostureAssessmentStore, AnalysisPhase } from '@/plugins/vision3/store/usePostureAssessmentStore';

// Re-export types for backward compatibility
export type { PostureMetrics, PostureIssue, Landmark };

export interface VisualAnnotation {
  type: 'line' | 'point' | 'angle' | 'text';
  points: { x: number; y: number }[];
  color?: string;
  label?: string;
  dashed?: boolean;
  dash?: number[];
  lineWidth?: number;
}

interface AnalysisResult {
  metrics: PostureMetrics;
  issues: PostureIssue[];
  annotations?: VisualAnnotation[];
  stability?: {
    sd: number;
    score: number;
  };
  timestamp: number;
}

interface JointResult {
  results: { id: string; angle: number | null }[];
  timestamp: number;
}

export interface SteppedFrame {
  view: 'front' | 'side' | 'back';
  timeSeriesLandmarks: Landmark[][];
  width: number;
  height: number;
  timestamp: number;
}

export function usePostureWS(url: string = 'ws://localhost:8001/ws/analyze') {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [jointResult, setJointResult] = useState<JointResult | null>(null);
  const [htmlReport, setHtmlReport] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const pendingMessages = useRef<string[]>([]);
  const savePostureReport = useMeasurementStore(state => state.savePostureReport);
  const currentViewRef = useRef<'front' | 'side' | 'back'>('front');
  const lastBatchTimeSeriesRef = useRef<TemporalAnalysis['timeSeries']>([]);
  
  const setAnalysisPhase = usePostureAssessmentStore(state => state.setAnalysisPhase);
  const setAnalysisProgress = usePostureAssessmentStore(state => state.setAnalysisProgress);

  const flushPending = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && pendingMessages.current.length) {
      pendingMessages.current.forEach(message => ws.current?.send(message));
      pendingMessages.current = [];
    }
  }, []);

  const sendMessage = useCallback((payload: object) => {
    const message = JSON.stringify(payload);
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(message);
      return;
    }
    pendingMessages.current.push(message);
  }, []);

  const connect = useCallback(() => {
    try {
      setStatus('connecting');
      const socket = new WebSocket(url);
      ws.current = socket;

      const handleOpen = () => {
        console.log('Posture WebSocket Connected');
        setStatus('connected');
        flushPending();
      };

      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ANALYSIS_RESULT') {
            setResult(data);
          } else if (data.type === 'JOINT_RESULT') {
            setJointResult(data);
          } else if (data.type === 'HTML_REPORT') {
            setHtmlReport(data.html);
            savePostureReport(currentViewRef.current, data.html, lastBatchTimeSeriesRef.current);
            setAnalysisPhase('completed');
            setAnalysisProgress(100);
          }
        } catch (e) {
          console.error('Failed to parse analysis result:', e);
        }
      };

      const handleClose = () => {
        console.log('Posture WebSocket Disconnected');
        setStatus('disconnected');
        // Auto reconnect
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      const handleError = (error: Event) => {
        console.error('Posture WebSocket Error:', error);
        setStatus('error');
      };

      socket.addEventListener('open', handleOpen);
      socket.addEventListener('message', handleMessage);
      socket.addEventListener('close', handleClose);
      socket.addEventListener('error', handleError);

      return () => {
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('message', handleMessage);
        socket.removeEventListener('close', handleClose);
        socket.removeEventListener('error', handleError);
      };
    } catch (e) {
      console.error('Connection error:', e);
      setStatus('error');
    }
  }, [url, savePostureReport, flushPending, setAnalysisPhase, setAnalysisProgress]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  const analyze = useCallback((view: 'front' | 'side' | 'back', timeSeriesLandmarks: Landmark[][], width: number, height: number) => {
    setHtmlReport(null);
    setResult(null);
    currentViewRef.current = view;
    sendMessage({
      type: 'POSTURE_SYNC',
      view,
      width,
      height,
      timeSeriesLandmarks
    });
  }, [sendMessage]);

  const analyzeJoint = useCallback((
    measurements: { id: string; jointType: string; direction: string; side?: string }[],
    landmarks: Landmark[],
    width: number,
    height: number,
    worldLandmarks?: Landmark[]
  ) => {
    sendMessage({
      type: 'JOINT_ANALYSIS',
      measurements,
      width,
      height,
      landmarks,
      worldLandmarks
    });
  }, [sendMessage]);

  const analyzeBatch = useCallback((analysis: TemporalAnalysis) => {
    setHtmlReport(null);
    setResult(null);
    currentViewRef.current = analysis.view;
    lastBatchTimeSeriesRef.current = analysis.timeSeries;
    sendMessage({
      type: 'POSTURE_BATCH_ANALYSIS',
      ...analysis
    });
  }, [sendMessage]);

  const analyzeStepped = useCallback((frames: SteppedFrame[]) => {
    setHtmlReport(null);
    setResult(null);
    if (frames.length) {
      currentViewRef.current = frames[0].view;
    }
    
    setAnalysisPhase('sending_data');
    setAnalysisProgress(10);
    
    const phaseSequence: { phase: AnalysisPhase; progress: number; delay: number }[] = [
      { phase: 'cleaning_data', progress: 25, delay: 400 },
      { phase: 'analyzing_views', progress: 50, delay: 800 },
      { phase: 'calling_llm', progress: 75, delay: 1200 },
      { phase: 'generating_report', progress: 90, delay: 1800 },
    ];
    
    phaseSequence.forEach((item, index) => {
      setTimeout(() => {
        setAnalysisPhase(item.phase);
        setAnalysisProgress(item.progress);
      }, item.delay);
    });
    
    sendMessage({
      type: 'POSTURE_STEPPED_ANALYSIS',
      frames
    });
  }, [sendMessage, setAnalysisPhase, setAnalysisProgress]);

  return useMemo(() => ({ 
    result, 
    jointResult, 
    htmlReport, 
    status, 
    analyze, 
    analyzeJoint, 
    analyzeBatch,
    analyzeStepped
  }), [result, jointResult, htmlReport, status, analyze, analyzeJoint, analyzeBatch, analyzeStepped]);
}
