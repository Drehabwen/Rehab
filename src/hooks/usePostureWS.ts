import { useState, useEffect, useRef, useCallback } from 'react';
import { PostureMetrics, PostureIssue, Landmark } from '@/types/posture';
import { TemporalAnalysis } from '@/lib/posture-processor';
import { useMeasurementStore } from '@/store/useMeasurementStore';

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

export function usePostureWS(url: string = 'ws://localhost:8002/ws/analyze') {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [jointResult, setJointResult] = useState<JointResult | null>(null);
  const [markdownReport, setMarkdownReport] = useState<string | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TemporalAnalysis['timeSeries'] | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const pendingMessages = useRef<string[]>([]);
  const savePostureReport = useMeasurementStore(state => state.savePostureReport);
  const currentViewRef = useRef<'front' | 'side' | 'back'>('front');
  const lastBatchTimeSeriesRef = useRef<TemporalAnalysis['timeSeries']>([]);

  const flushPending = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN && pendingMessages.current.length) {
      pendingMessages.current.forEach(message => ws.current?.send(message));
      pendingMessages.current = [];
    }
  }, []);

  const sendMessage = useCallback((payload: any) => {
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
          } else if (data.type === 'POSTURE_REPORT') {
            setMarkdownReport(data.markdown);
            // Use timeSeries from backend response if available (stepped analysis), otherwise fall back to local ref (batch analysis)
            const timeSeries = data.timeSeries || lastBatchTimeSeriesRef.current;
            setTimeSeriesData(timeSeries);
            savePostureReport(currentViewRef.current, '', data.markdown, timeSeries);
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
  }, [url, savePostureReport, flushPending]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  const analyze = useCallback((view: 'front' | 'side' | 'back', timeSeriesLandmarks: Landmark[][], width: number, height: number) => {
    setMarkdownReport(null);
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
    setMarkdownReport(null);
    setResult(null);
    currentViewRef.current = analysis.view;
    lastBatchTimeSeriesRef.current = analysis.timeSeries;
    sendMessage({
      type: 'POSTURE_BATCH_ANALYSIS',
      ...analysis
    });
  }, [sendMessage]);

  const analyzeStepped = useCallback((frames: SteppedFrame[]) => {
    setMarkdownReport(null);
    setResult(null);
    if (frames.length) {
      currentViewRef.current = frames[0].view;
    }
    sendMessage({
      type: 'POSTURE_STEPPED_ANALYSIS',
      frames
    });
  }, [sendMessage]);

  return {
    result,
    jointResult,
    markdownReport,
    timeSeriesData,
    status,
    analyze,
    analyzeBatch,
    analyzeStepped,
    analyzeJoint,
    connect,
    disconnect: () => {
      ws.current?.close();
      setStatus('disconnected');
    }
  };
}
