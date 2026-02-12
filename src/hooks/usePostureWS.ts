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
  timestamp: number;
}

interface JointResult {
  results: { id: string; angle: number | null }[];
  timestamp: number;
}

export function usePostureWS(url: string = 'ws://localhost:8000/ws/analyze') {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [jointResult, setJointResult] = useState<JointResult | null>(null);
  const [htmlReport, setHtmlReport] = useState<string | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const savePostureReport = useMeasurementStore(state => state.savePostureReport);
  const currentViewRef = useRef<'front' | 'side' | 'back'>('front');

  const connect = useCallback(() => {
    try {
      setStatus('connecting');
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('Posture WebSocket Connected');
        setStatus('connected');
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ANALYSIS_RESULT') {
            setResult(data);
          } else if (data.type === 'JOINT_RESULT') {
            setJointResult(data);
          } else if (data.type === 'HTML_REPORT') {
            setHtmlReport(data.html);
            savePostureReport(currentViewRef.current, data.html);
          }
        } catch (e) {
          console.error('Failed to parse analysis result:', e);
        }
      };

      ws.current.onclose = () => {
        console.log('Posture WebSocket Disconnected');
        setStatus('disconnected');
        // Auto reconnect
        reconnectTimeout.current = setTimeout(connect, 3000);
      };

      ws.current.onerror = (error) => {
        console.error('Posture WebSocket Error:', error);
        setStatus('error');
      };
    } catch (e) {
      console.error('Connection error:', e);
      setStatus('error');
    }
  }, [url, savePostureReport]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  const analyze = useCallback((view: 'front' | 'side' | 'back', landmarks: Landmark[], width: number, height: number, imageData?: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      currentViewRef.current = view;
      ws.current.send(JSON.stringify({
        type: 'POSTURE_SYNC',
        view,
        width,
        height,
        landmarks,
        image: imageData // Optional image data for backend processing
      }));
    }
  }, []);

  const analyzeJoint = useCallback((
    measurements: { id: string; jointType: string; direction: string; side?: string }[],
    landmarks: Landmark[],
    width: number,
    height: number,
    worldLandmarks?: Landmark[]
  ) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'JOINT_ANALYSIS',
        measurements,
        width,
        height,
        landmarks,
        worldLandmarks
      }));
    }
  }, []);

  const analyzeBatch = useCallback((analysis: TemporalAnalysis) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      currentViewRef.current = analysis.view;
      ws.current.send(JSON.stringify({
        type: 'POSTURE_BATCH_ANALYSIS',
        ...analysis
      }));
    }
  }, []);

  return { result, jointResult, htmlReport, status, analyze, analyzeJoint, analyzeBatch };
}
