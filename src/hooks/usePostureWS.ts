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

const MAX_PENDING_MESSAGES = 20;
const STREAM_FLUSH_INTERVAL_MS = 80;

export function usePostureWS(url: string = CONFIG.websocket.url) {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [jointResult, setJointResult] = useState<JointResult | null>(null);
  /** 深度报告 - LLM 解析的报告 */
  const [markdownReport, setMarkdownReport] = useState<string | null>(null);
  /** 流式报告内容 - 用于实时显示 LLM 输出 */
  const [streamingReport, setStreamingReport] = useState<string>('');
  /** 是否正在生成流式报告 */
  const [isStreamingReport, setIsStreamingReport] = useState<boolean>(false);
  /** 基础报告 - 根据规则得出的结论 */
  const [auxiliaryDiagnosis, setAuxiliaryDiagnosis] = useState<string | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TemporalAnalysis['timeSeries'] | null>(null);
  const [analysisAckAt, setAnalysisAckAt] = useState<number | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  // 存储最后一次分析的原始帧数据，用于深度分析请求
  const rawFramesDataRef = useRef<SteppedFrame[]>([]);
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout>();
  const pendingMessages = useRef<string[]>([]);
  const shouldReconnectRef = useRef<boolean>(true);
  const streamingBufferRef = useRef<string>('');
  const streamingFlushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const savePostureReport = useMeasurementStore(state => state.savePostureReport);
  const savePostureReportRef = useRef(savePostureReport);
  const resultRef = useRef<AnalysisResult | null>(null);
  const auxiliaryDiagnosisRef = useRef<string | null>(null);
  const currentViewRef = useRef<'front' | 'side' | 'back'>('front');
  const lastBatchTimeSeriesRef = useRef<TemporalAnalysis['timeSeries']>([]);
  const currentRequestIdRef = useRef<string | null>(null);
  // 存储最后一次分析的原始数据，用于深度分析请求
  const lastAnalysisDataRef = useRef<{
    view: 'front' | 'side' | 'back';
    timeSeriesLandmarks: Landmark[][];
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    savePostureReportRef.current = savePostureReport;
  }, [savePostureReport]);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  useEffect(() => {
    auxiliaryDiagnosisRef.current = auxiliaryDiagnosis;
  }, [auxiliaryDiagnosis]);

  const clearStreamingBuffer = useCallback(() => {
    streamingBufferRef.current = '';
    if (streamingFlushTimeoutRef.current) {
      clearTimeout(streamingFlushTimeoutRef.current);
      streamingFlushTimeoutRef.current = null;
    }
  }, []);

  const flushStreamingBuffer = useCallback(() => {
    if (!streamingBufferRef.current) {
      return;
    }

    const chunk = streamingBufferRef.current;
    streamingBufferRef.current = '';
    setStreamingReport(prev => prev + chunk);
  }, []);

  const scheduleStreamingFlush = useCallback(() => {
    if (streamingFlushTimeoutRef.current) {
      return;
    }

    streamingFlushTimeoutRef.current = setTimeout(() => {
      streamingFlushTimeoutRef.current = null;
      flushStreamingBuffer();
    }, STREAM_FLUSH_INTERVAL_MS);
  }, [flushStreamingBuffer]);

  const flushPending = useCallback(() => {
    console.log('[usePostureWS] Flushing pending messages, count:', pendingMessages.current.length);
    if (ws.current?.readyState === WebSocket.OPEN && pendingMessages.current.length) {
      pendingMessages.current.forEach(message => ws.current?.send(message));
      pendingMessages.current = [];
      console.log('[usePostureWS] Pending messages flushed');
    }
  }, []);

  const sendMessage = useCallback((payload: Record<string, unknown>) => {
    const message = JSON.stringify(payload);
    console.log('[usePostureWS] sendMessage called, readyState:', ws.current?.readyState, 'OPEN:', WebSocket.OPEN);
    if (ws.current?.readyState === WebSocket.OPEN) {
      console.log('[usePostureWS] Sending message via WebSocket:', payload.type);
      ws.current.send(message);
      return;
    }
    console.log('[usePostureWS] WebSocket not ready, adding to pending queue:', payload.type);
    if (pendingMessages.current.length >= MAX_PENDING_MESSAGES) {
      pendingMessages.current.shift();
    }
    pendingMessages.current.push(message);
  }, []);

  const connect = useCallback(() => {
    try {
      shouldReconnectRef.current = true;
      setStatus('connecting');
      console.log('[usePostureWS] Connecting to WebSocket:', url);
      const socket = new WebSocket(url);
      ws.current = socket;

      const handleOpen = () => {
        console.log('Posture WebSocket Connected');
        setStatus('connected');
        flushPending();
      };

      const handleMessage = (event: MessageEvent) => {
        try {
          console.log('[usePostureWS] Received message:', event.data.substring(0, 100) + '...');
          const data = JSON.parse(event.data);
          console.log('[usePostureWS] Received message type:', data.type);
          if (data.type === 'ANALYSIS_RESULT') {
            setResult(data);
            const auxReport = generateAuxiliaryReport(data);
            setAuxiliaryDiagnosis(auxReport);
          } else if (data.type === 'POSTURE_ACK') {
            if (data.requestId && currentRequestIdRef.current && data.requestId !== currentRequestIdRef.current) {
              return;
            }
            setAnalysisAckAt(Date.now());
          } else if (data.type === 'JOINT_RESULT') {
            setJointResult(data);
          } else if (data.type === 'POSTURE_REPORT') {
            console.log('[usePostureWS] Received POSTURE_REPORT message');
            
            // 检查是否是深度报告
            const isDeepReport = data.isDeepReport || false;
            
            // 处理深度报告 (markdown) - 只有非空时才设置
            const markdown = typeof data.markdown === 'string' ? data.markdown : '';
            const normalized = markdown.trim();
            if (normalized) {
              console.log('[usePostureWS] Setting markdownReport, length:', normalized.length);
              console.log('[usePostureWS] Markdown content snippet:', normalized.substring(0, 100) + '...');
              setMarkdownReport(markdown);
            } else {
              console.log('[usePostureWS] No markdown report, clearing...');
              setMarkdownReport(null);
            }
            
            // 清除流式状态
            clearStreamingBuffer();
            setIsStreamingReport(false);
            setStreamingReport('');
            const timeSeries = Array.isArray(data.timeSeries) ? data.timeSeries : lastBatchTimeSeriesRef.current;
            setTimeSeriesData(timeSeries);
            
            // Set basic metrics and issues if available
            const hasMetrics = !!data.metrics && Object.keys(data.metrics).length > 0;
            const hasIssues = Array.isArray(data.issues) && data.issues.length > 0;
            const hasAuxiliaryDiagnosis =
              typeof data.auxiliaryDiagnosis === 'string' && data.auxiliaryDiagnosis.trim().length > 0;

            const effectiveMetrics = hasMetrics ? data.metrics : resultRef.current?.metrics;
            const effectiveIssues = hasIssues
              ? data.issues
              : isDeepReport
                ? (resultRef.current?.issues || [])
                : [];
            const effectiveAuxiliaryDiagnosis = hasAuxiliaryDiagnosis
              ? data.auxiliaryDiagnosis
              : isDeepReport
                ? auxiliaryDiagnosisRef.current
                : null;

            if (effectiveMetrics) {
              console.log('[usePostureWS] Applying posture metrics:', {
                incomingMetricCount: hasMetrics ? Object.keys(data.metrics).length : 0,
                effectiveMetricCount: Object.keys(effectiveMetrics).length,
                effectiveIssueCount: effectiveIssues.length,
                isDeepReport
              });
              setResult({
                metrics: effectiveMetrics,
                issues: effectiveIssues,
                timestamp: data.timestamp || Date.now()
              });
            }
            
            // Set auxiliary diagnosis from backend (基础报告)
            if (effectiveAuxiliaryDiagnosis !== null) {
              console.log('[usePostureWS] Applying auxiliaryDiagnosis, length:', effectiveAuxiliaryDiagnosis.length);
              setAuxiliaryDiagnosis(effectiveAuxiliaryDiagnosis);
            }
            
            console.log('[usePostureWS] Saving posture report:', {
              view: currentViewRef.current,
              hasMarkdown: !!normalized,
              hasTimeSeries: timeSeries && timeSeries.length > 0,
              timeSeriesLength: timeSeries ? timeSeries.length : 0,
              hasAuxiliaryDiagnosis: !!effectiveAuxiliaryDiagnosis,
              isDeepReport
            });
            
            savePostureReportRef.current(
              currentViewRef.current, 
              effectiveAuxiliaryDiagnosis || normalized, 
              normalized || null, 
              timeSeries,
              effectiveMetrics,
              effectiveIssues,
              effectiveAuxiliaryDiagnosis || undefined
            );
            console.log('[usePostureWS] Posture report saved successfully');
          } else if (data.type === 'DEEP_REPORT_STREAM') {
            // Handle streaming chunks from LLM
            console.log('[usePostureWS] Received DEEP_REPORT_STREAM chunk');
            const content = typeof data.content === 'string' ? data.content : '';
            if (content) {
              setIsStreamingReport(true);
              streamingBufferRef.current += content;
              scheduleStreamingFlush();
            }
          }
        } catch (e) {
          console.error('Failed to parse analysis result:', e);
          console.error('Original message:', event.data);
        }
      };

      const handleClose = () => {
        console.log('Posture WebSocket Disconnected');
        setStatus('disconnected');
        if (shouldReconnectRef.current) {
          // Auto reconnect
          reconnectTimeout.current = setTimeout(connect, 3000);
        }
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
  }, [url, flushPending, clearStreamingBuffer, scheduleStreamingFlush]); // Removed savePostureReport from dependencies as it's a stable store method

  useEffect(() => {
    console.log('[usePostureWS] Initializing WebSocket connection');
    connect();
    return () => {
      console.log('[usePostureWS] Cleaning up WebSocket connection');
      shouldReconnectRef.current = false;
      clearStreamingBuffer();
      if (ws.current) ws.current.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [connect, clearStreamingBuffer]);

  const analyze = useCallback((view: 'front' | 'side' | 'back', timeSeriesLandmarks: Landmark[][], width: number, height: number) => {
    console.log('[usePostureWS] analyze called:', { view, landmarksCount: timeSeriesLandmarks.length, width, height });
    clearStreamingBuffer();
    setMarkdownReport(null);
    setAuxiliaryDiagnosis(null);
    setTimeSeriesData(null);
    setIsStreamingReport(false);
    setStreamingReport('');
    setResult(null);
    currentViewRef.current = view;
    // 保存分析数据用于后续深度分析请求
    lastAnalysisDataRef.current = { view, timeSeriesLandmarks, width, height };
    const message = {
      type: 'POSTURE_SYNC',
      view,
      width,
      height,
      timeSeriesLandmarks
    };
    console.log('[usePostureWS] Sending POSTURE_SYNC message');
    sendMessage(message);
  }, [sendMessage, clearStreamingBuffer]);

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

  const analyzeBatch = useCallback((analysis: TemporalAnalysis & { timeSeriesLandmarks?: Landmark[][] }) => {
    console.log('[usePostureWS] analyzeBatch called:', { view: analysis.view, landmarksCount: analysis.timeSeriesLandmarks?.length || 0 });
    setMarkdownReport(null);
    setAuxiliaryDiagnosis(null);
    setTimeSeriesData(null);
    setIsStreamingReport(false);
    setStreamingReport('');
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
    
    // 存储原始帧数据，用于后续的深度分析请求
    const framesData = frames.map(f => ({
      view: f.view,
      timeSeriesLandmarks: f.timeSeriesLandmarks,
      width: f.width,
      height: f.height,
      timestamp: f.timestamp
    }));
    rawFramesDataRef.current = framesData;
    console.log('[usePostureWS] Stored raw frames data for deep analysis:', framesData.length, 'frames');
    
    // 清除之前的报告状态
    setResult(null);
    setMarkdownReport(null);
    setAuxiliaryDiagnosis(null);
    setTimeSeriesData(null);
    setIsStreamingReport(false);
    setStreamingReport('');
    
    if (frames.length === 0) {
      console.error('[usePostureWS] ERROR: No frames to analyze!');
      return;
    }
    
    currentViewRef.current = frames[0].view;
    setAnalysisAckAt(null);
    currentRequestIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    
    const message = {
      type: 'POSTURE_STEPPED_ANALYSIS',
      frames,
      assessmentType,
      requestId: currentRequestIdRef.current
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

  // 新增：请求深度报告
  const requestDeepAnalysis = useCallback(() => {
    const rawFramesData = rawFramesDataRef.current;
    if (!rawFramesData || rawFramesData.length === 0) {
      console.error('[usePostureWS] requestDeepAnalysis: No frames data available');
      return;
    }
    
    console.log('[usePostureWS] requestDeepAnalysis called:', { 
      framesCount: rawFramesData.length,
      frames: rawFramesData.map(f => ({ view: f.view, landmarksCount: f.timeSeriesLandmarks.length }))
    });
    
    // 清除之前的深度报告状态，准备接收新的流式报告
    clearStreamingBuffer();
    setMarkdownReport(null);
    setIsStreamingReport(true);
    setStreamingReport('');
    currentRequestIdRef.current = `deep-${Date.now()}`;
    
    const message = {
      type: 'POSTURE_DEEP_ANALYSIS',
      frames: rawFramesData,
      assessmentType: 'quick',
      auxiliaryDiagnosis: auxiliaryDiagnosis, // 传递基础报告内容
      requestId: currentRequestIdRef.current
    };
    console.log('[usePostureWS] Sending POSTURE_DEEP_ANALYSIS message');
    sendMessage(message);
  }, [sendMessage, auxiliaryDiagnosis, clearStreamingBuffer]);

  return {
    result,
    jointResult,
    markdownReport,
    streamingReport,
    isStreamingReport,
    auxiliaryDiagnosis,
    timeSeriesData,
    status,
    analyze,
    analyzeBatch,
    analyzeStepped,
    analyzeJoint,
    requestDeepAnalysis,
    analysisAckAt,
    connect,
    disconnect: () => {
      shouldReconnectRef.current = false;
      clearStreamingBuffer();
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      ws.current?.close();
      setStatus('disconnected');
    }
  };
}
