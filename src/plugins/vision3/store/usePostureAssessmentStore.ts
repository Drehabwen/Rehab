import { create } from 'zustand';

export type AssessmentScope = 'full' | 'upper' | 'lower';

export type AssessmentStep = 
  | 'idle'
  | 'prep'
  | 'prep_upper'
  | 'prep_lower'
  | 'capturing'
  | 'capturing_upper'
  | 'capturing_lower'
  | 'stitching'
  | 'analyzing'
  | 'completed'
  | 'error'
  | 'stepped_guide';

export type AnalysisPhase = 
  | 'idle'
  | 'sending_data'
  | 'cleaning_data'
  | 'analyzing_views'
  | 'calling_llm'
  | 'generating_report'
  | 'completed';

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
  fullBodyLandmarks: Landmark[];
  metrics: Record<string, number>;
  timestamp: number;
}

interface PostureAssessmentState {
  step: AssessmentStep;
  scope: AssessmentScope;
  countdown: number;
  stabilityProgress: number;
  captureProgress: number;
  
  analysisPhase: AnalysisPhase;
  analysisProgress: number;
  
  upperFrames: PostureFrame[];
  lowerFrames: PostureFrame[];
  
  result: PostureResult | null;
  error: string | null;

  setStep: (step: AssessmentStep) => void;
  setScope: (scope: AssessmentScope) => void;
  setCountdown: (seconds: number) => void;
  setStabilityProgress: (progress: number) => void;
  setCaptureProgress: (progress: number) => void;
  
  setAnalysisPhase: (phase: AnalysisPhase) => void;
  setAnalysisProgress: (progress: number) => void;
  
  addUpperFrame: (frame: PostureFrame) => void;
  addLowerFrame: (frame: PostureFrame) => void;
  
  setResult: (result: PostureResult) => void;
  setError: (error: string | null) => void;
  
  reset: () => void;
}

export const usePostureAssessmentStore = create<PostureAssessmentState>((set) => ({
  step: 'idle',
  scope: 'full',
  countdown: 0,
  stabilityProgress: 0,
  captureProgress: 0,
  analysisPhase: 'idle',
  analysisProgress: 0,
  upperFrames: [],
  lowerFrames: [],
  result: null,
  error: null,

  setStep: (step) => set({ step }),
  setScope: (scope) => set({ scope }),
  setCountdown: (seconds) => set({ countdown: seconds }),
  setStabilityProgress: (progress) => set({ stabilityProgress: progress }),
  setCaptureProgress: (progress) => set({ captureProgress: progress }),

  setAnalysisPhase: (phase) => set({ analysisPhase: phase }),
  setAnalysisProgress: (progress) => set({ analysisProgress: progress }),

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
    scope: 'full',
    countdown: 0,
    stabilityProgress: 0,
    captureProgress: 0,
    analysisPhase: 'idle',
    analysisProgress: 0,
    upperFrames: [],
    lowerFrames: [],
    result: null,
    error: null,
  }),
}));
