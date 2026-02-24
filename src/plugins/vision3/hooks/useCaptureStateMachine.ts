import { useReducer, useEffect, useCallback, useRef } from 'react';
import { PoseLandmark } from '../vision3-utils';
import { Vision3Geometry } from '../vision3-geometry';

export type CaptureStatus = 
  | 'idle' 
  | 'scanning' 
  | 'countdown' 
  | 'recording' 
  | 'analyzing' 
  | 'completed' 
  | 'error';

interface CaptureState {
  status: CaptureStatus;
  countdown: number;
  recordingProgress: number; // 0-100
  isInPosition: boolean;
  error: string | null;
}

type CaptureAction =
  | { type: 'START_SCAN' }
  | { type: 'POSITION_CHANGED'; payload: boolean }
  | { type: 'COUNTDOWN_TICK' }
  | { type: 'START_RECORDING' }
  | { type: 'RECORDING_PROGRESS'; payload: number }
  | { type: 'COMPLETE_RECORDING' }
  | { type: 'ANALYSIS_START' }
  | { type: 'ANALYSIS_COMPLETE' }
  | { type: 'RESET' }
  | { type: 'SET_ERROR'; payload: string };

const INITIAL_STATE: CaptureState = {
  status: 'idle',
  countdown: 5,
  recordingProgress: 0,
  isInPosition: false,
  error: null
};

function captureReducer(state: CaptureState, action: CaptureAction): CaptureState {
  switch (action.type) {
    case 'START_SCAN':
      return { ...state, status: 'scanning', error: null };
    
    case 'POSITION_CHANGED':
      if (state.status === 'scanning' && action.payload) {
        return { ...state, isInPosition: true, status: 'countdown', countdown: 5 };
      }
      return { ...state, isInPosition: action.payload };
    
    case 'COUNTDOWN_TICK':
      if (state.status === 'countdown' && state.countdown > 0) {
        return { ...state, countdown: state.countdown - 1 };
      }
      if (state.status === 'countdown' && state.countdown === 0) {
        return { ...state, status: 'recording', recordingProgress: 0 };
      }
      return state;
    
    case 'START_RECORDING':
      return { ...state, status: 'recording', recordingProgress: 0 };
    
    case 'RECORDING_PROGRESS':
      return { ...state, recordingProgress: action.payload };
    
    case 'COMPLETE_RECORDING':
      return { ...state, status: 'analyzing', recordingProgress: 100 };
    
    case 'ANALYSIS_START':
      return { ...state, status: 'analyzing' };
    
    case 'ANALYSIS_COMPLETE':
      return { ...state, status: 'completed' };
    
    case 'RESET':
      return INITIAL_STATE;
    
    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.payload };
    
    default:
      return state;
  }
}

/**
 * useCaptureStateMachine - 核心捕获状态机
 * 隔离 UI 逻辑与状态流转，提高可预测性
 */
export function useCaptureStateMachine(onCaptureComplete?: (data: { 
  timeSeriesLandmarks: PoseLandmark[][]; 
  width: number; 
  height: number; 
  timestamp: number 
}) => void) {
  const [state, dispatch] = useReducer(captureReducer, INITIAL_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const landmarksBufferRef = useRef<PoseLandmark[][]>([]);
  const lastSizeRef = useRef({ width: 640, height: 480 });
  const RECORDING_DURATION = 2000; // 2秒采样

  const onCaptureCompleteRef = useRef(onCaptureComplete);
  useEffect(() => {
    onCaptureCompleteRef.current = onCaptureComplete;
  }, [onCaptureComplete]);

  // 2. 位置监测与帧收集辅助函数
  const processLandmarks = useCallback((landmarks: PoseLandmark[] | null, width: number = 640, height: number = 480) => {
    // 只有在扫描或就位倒计时状态下才检测位置
    if (state.status === 'scanning' || state.status === 'countdown') {
      const inPos = Vision3Geometry.checkUserPosition(landmarks);
      dispatch({ type: 'POSITION_CHANGED', payload: inPos });
    }

    // 录制状态下收集帧数据
    if (state.status === 'recording' && landmarks) {
      landmarksBufferRef.current.push(landmarks);
      // 更新最后已知的宽高
      lastSizeRef.current = { width, height };
    }
  }, [state.status]);

  // 1. 定时器与录制逻辑管理
  useEffect(() => {
    if (state.status === 'countdown') {
      console.log("[useCaptureStateMachine] Entering countdown state");
      timerRef.current = setInterval(() => {
        dispatch({ type: 'COUNTDOWN_TICK' });
      }, 1000);
    } else if (state.status === 'recording') {
      console.log("[useCaptureStateMachine] Starting recording session...");
      // 开始录制初始化
      recordingStartTimeRef.current = Date.now();
      landmarksBufferRef.current = [];
      
      // 进度更新定时器
      timerRef.current = setInterval(() => {
        if (!recordingStartTimeRef.current) return;
        const elapsed = Date.now() - recordingStartTimeRef.current;
        const progress = Math.min((elapsed / RECORDING_DURATION) * 100, 100);
        
        dispatch({ type: 'RECORDING_PROGRESS', payload: progress });
        
        if (elapsed >= RECORDING_DURATION) {
          if (timerRef.current) clearInterval(timerRef.current);
          
          console.log(`[useCaptureStateMachine] Recording complete. Collected ${landmarksBufferRef.current.length} frames.`);
          
          // 捕获完成回调
          if (onCaptureCompleteRef.current) {
            onCaptureCompleteRef.current({
              timeSeriesLandmarks: [...landmarksBufferRef.current], // Create a copy
              width: lastSizeRef.current.width,
              height: lastSizeRef.current.height,
              timestamp: Date.now()
            });
          }
          
          dispatch({ type: 'COMPLETE_RECORDING' });
        }
      }, 50); // 50ms 更新一次进度
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.status]);

  return {
    ...state,
    dispatch,
    processLandmarks
  };
}
