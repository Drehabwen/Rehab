import { useState, useEffect, useRef, useCallback } from 'react';
import { PostureMetrics, PostureIssue, Landmark } from '@/types/posture';
import { TemporalAnalysis } from '@/lib/posture-processor';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { 
  generateAuxiliaryReport, 
  AnalysisResult, 
  VisualAnnotation 
} from '@/utils/posture-report-utils';
import { CONFIG } from '@/config';

// Re-export types for backward compatibility
export type { PostureMetrics, PostureIssue, Landmark, AnalysisResult, VisualAnnotation };

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

export function usePostureWS(url: string = CONFIG.websocket.url) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [jointResult, setJointResult] = useState<JointResult | null>(null);
  const [markdownReport, setMarkdownReport] = useState<string | null>(null);
  const [auxiliaryReport, setAuxiliaryReport] = useState<string | null>(null);
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

  const sendMessage = useCallback((payload: Record<string, unknown>) => {
    const message = JSON.stringify(payload);
    console.log('[usePostureWS] sendMessage called, readyState:', ws.current?.readyState, 'OPEN:', WebSocket.OPEN);
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[usePostureWS] Sending message via WebSocket');
      ws.current.send(message);
      return;
    }
    console.log('[usePostureWS] WebSocket not ready, adding to pending queue');
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
          console.log('[usePostureWS] Received message:', data.type);
          console.log('[usePostureWS] Full data:', data);
          if (data.type === 'ANALYSIS_RESULT') {
            setResult(data);
            const auxReport = generateAuxiliaryReport(data);
            setAuxiliaryReport(auxReport);
          } else if (data.type === 'JOINT_RESULT') {
            setJointResult(data);
          } else if (data.type === 'POSTURE_REPORT') {
            const markdown = typeof data.markdown === 'string' ? data.markdown : '';
            const normalized = markdown.trim();
            const finalMarkdown = normalized ? markdown : '报告生成失败：未收到有效的 Markdown 内容。';
            console.log('[usePostureWS] Setting markdownReport, length:', finalMarkdown.length);
            setMarkdownReport(finalMarkdown);
            const timeSeries = Array.isArray(data.timeSeries) ? data.timeSeries : lastBatchTimeSeriesRef.current;
            setTimeSeriesData(timeSeries);
            
            // Set basic metrics and issues if available
            if (data.metrics) {
              console.log('[usePostureWS] Received basic metrics:', data.metrics);
              setResult({
                metrics: data.metrics,
                issues: data.issues || [],
                timestamp: data.timestamp || Date.now()
              });
            }
            
            console.log('[usePostureWS] Saving posture report:', {
              view: currentViewRef.current,
              reportLength: finalMarkdown.length,
              hasTimeSeries: timeSeries && timeSeries.length > 0,
              timeSeriesLength: timeSeries ? timeSeries.length : 0
            });
            
            savePostureReport(currentViewRef.current, finalMarkdown, finalMarkdown, timeSeries);
            console.log('[usePostureWS] Posture report saved successfully');
            
            // Log the current report state
            console.log('[usePostureWS] Current report state:', {
              markdownReport: markdownReport ? 'exists' : 'null',
              auxiliaryReport: auxiliaryReport ? 'exists' : 'null',
              timeSeriesData: timeSeriesData ? 'exists' : 'null'
            });
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

  const analyzeStepped = useCallback((frames: SteppedFrame[], assessmentType: string = 'standard') => {
    console.log('[usePostureWS] ========== analyzeStepped START ==========');
    console.log('[usePostureWS] frames count:', frames.length);
    console.log('[usePostureWS] assessmentType:', assessmentType);
    
    if (frames.length > 0) {
      console.log('[usePostureWS] frames detail:', frames.map(f => ({ 
        view: f.view, 
        landmarkFrames: f.timeSeriesLandmarks?.length,
        width: f.width,
        height: f.height
      })));
    }
    
    setMarkdownReport(null);
    setResult(null);
    
    if (frames.length === 0) {
      console.error('[usePostureWS] ERROR: No frames to analyze!');
      return;
    }
    
    currentViewRef.current = frames[0].view;
    
    const message = {
      type: 'POSTURE_STEPPED_ANALYSIS',
      frames,
      assessmentType
    };
    
    const readyState = ws.current?.readyState;
    console.log('[usePostureWS] WebSocket readyState:', readyState, '(0=CONNECTING, 1=OPEN, 2=CLOSING, 3=CLOSED)');
    
    if (readyState !== WebSocket.OPEN) {
      console.error('[usePostureWS] ERROR: WebSocket not open! Current state:', readyState);
      console.log('[usePostureWS] Attempting to reconnect...');
      connect();
      setTimeout(() => {
        console.log('[usePostureWS] Retrying after reconnect, readyState:', ws.current?.readyState);
        if (ws.current?.readyState === WebSocket.OPEN) {
          sendMessage(message);
          console.log('[usePostureWS] Message sent after reconnect');
        } else {
          console.error('[usePostureWS] Reconnect failed, readyState still:', ws.current?.readyState);
        }
      }, 1000);
      return;
    }
    
    sendMessage(message);
    console.log('[usePostureWS] Message sent successfully');
    console.log('[usePostureWS] ========== analyzeStepped END ==========');
  }, [sendMessage, connect]);

  return {
    result,
    jointResult,
    markdownReport,
    auxiliaryReport,
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
