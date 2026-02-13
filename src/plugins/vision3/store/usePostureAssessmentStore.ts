import { create } from 'zustand';

/**
 * 评估阶段定义
 */
export type AssessmentStep = 
  | 'idle'             // 闲置状态
  | 'prep_upper'       // 上半身准备 (ROI + 稳定性校验)
  | 'capturing_upper'  // 上半身采样 (2s 录制)
  | 'prep_lower'       // 下半身准备
  | 'capturing_lower'  // 下半身采样 (2s 录制)
  | 'stitching'        // 拼图与去噪计算
  | 'analyzing'        // 语义指标提取
  | 'completed'        // 完成
  | 'error';           // 错误

export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export interface PostureFrame {
  timestamp: number;
  landmarks: Landmark[];
}

export interface PostureResult {
  fullBodyLandmarks: Landmark[]; // 拼图对齐后的全身点位
  metrics: Record<string, number>; // 提取的物理指标（角度、距离等）
  timestamp: number;
}

interface PostureAssessmentState {
  step: AssessmentStep;
  countdown: number;          // 实时倒计时
  stabilityProgress: number;  // 稳定性进度 (0-100)
  captureProgress: number;    // 采样进度 (0-100)
  
  // 采样原始数据
  upperFrames: PostureFrame[];
  lowerFrames: PostureFrame[];
  
  // 最终对齐结果
  result: PostureResult | null;
  error: string | null;

  // Actions
  setStep: (step: AssessmentStep) => void;
  setCountdown: (seconds: number) => void;
  setStabilityProgress: (progress: number) => void;
  setCaptureProgress: (progress: number) => void;
  
  addUpperFrame: (frame: PostureFrame) => void;
  addLowerFrame: (frame: PostureFrame) => void;
  
  setResult: (result: PostureResult) => void;
  setError: (error: string | null) => void;
  
  reset: () => void;
}

export const usePostureAssessmentStore = create<PostureAssessmentState>((set) => ({
  step: 'idle',
  countdown: 0,
  stabilityProgress: 0,
  captureProgress: 0,
  upperFrames: [],
  lowerFrames: [],
  result: null,
  error: null,

  setStep: (step) => set({ step }),
  setCountdown: (seconds) => set({ countdown: seconds }),
  setStabilityProgress: (progress) => set({ stabilityProgress: progress }),
  setCaptureProgress: (progress) => set({ captureProgress: progress }),

  addUpperFrame: (frame) => set((state) => ({ 
    upperFrames: [...state.upperFrames, frame] 
  })),

  addLowerFrame: (frame) => set((state) => ({ 
    lowerFrames: [...state.lowerFrames, frame] 
  })),

  setResult: (result) => set({ result, step: 'completed' }),
  setError: (error) => set({ error, step: 'error' }),

  reset: () => set({
    step: 'idle',
    countdown: 0,
    stabilityProgress: 0,
    captureProgress: 0,
    upperFrames: [],
    lowerFrames: [],
    result: null,
    error: null,
  }),
}));
