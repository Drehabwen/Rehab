import { useState, useEffect, useRef, useCallback } from 'react';

interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PostureIssue {
  id: string;
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  title: string;
  description: string;
  recommendation: string;
  points?: { x: number; y: number }[];
}

export interface PostureMetrics {
  shoulderAngle?: number;
  hipAngle?: number;
  headDeviation?: number;
  headForward?: number;
  shoulderRounded?: number;
  headPitch?: number;
  headYaw?: number;
  headRoll?: number;
  head_axes?: { x: number; y: number }[];
}

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
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

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
            // Update joint results and ensure we keep the latest timestamp
            setJointResult(data);
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
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) ws.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  const analyze = useCallback((view: string, landmarks: Landmark[], width: number, height: number) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'POSTURE_SYNC',
        view,
        width,
        height,
        landmarks
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

  return { result, jointResult, status, analyze, analyzeJoint };
}
