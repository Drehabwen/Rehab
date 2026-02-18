import type { AssessmentScope } from '../store/usePostureAssessmentStore';

export interface ViewConfig {
  id: 'front' | 'side' | 'back';
  label: string;
  description: string;
  hint: string;
  requiredLandmarks: number[];
}

export interface ScopeConfig {
  scope: AssessmentScope;
  label: string;
  views: ViewConfig[];
  metrics: string[];
}

export const SCOPE_CONFIGS: Record<AssessmentScope, ScopeConfig> = {
  full: {
    scope: 'full',
    label: '全身评估',
    views: [
      {
        id: 'front',
        label: '正面',
        description: '请站在摄像头前，保持身体直立，双臂自然下垂',
        hint: '全身在画面内，双脚与肩同宽',
        requiredLandmarks: [11, 12, 23, 24, 27, 28]
      },
      {
        id: 'side',
        label: '侧面',
        description: '请转身至侧面站立，保持身体直立',
        hint: '侧面对摄像头，保持平衡',
        requiredLandmarks: [11, 12, 23, 24, 27, 28]
      },
      {
        id: 'back',
        label: '背面',
        description: '请转身至背面站立，双臂自然下垂',
        hint: '背面对摄像头，双肩水平',
        requiredLandmarks: [11, 12, 23, 24, 27, 28]
      }
    ],
    metrics: [
      'headForward', 'headPitch', 'headYaw', 'headRoll',
      'shoulderAngle', 'shoulderLevel', 'shoulderRounded',
      'hipAngle', 'hipLevel', 'pelvisTilt',
      'kneeAngle', 'kneeValgus',
      'ankleAngle', 'footAngle'
    ]
  },
  upper: {
    scope: 'upper',
    label: '上半身',
    views: [
      {
        id: 'front',
        label: '正面',
        description: '请站在摄像头前，双臂自然下垂或叉腰',
        hint: '肩膀和头部在画面中心',
        requiredLandmarks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
      },
      {
        id: 'side',
        label: '侧面',
        description: '请转身至侧面站立，双臂自然下垂',
        hint: '头部、肩部、躯干在画面内',
        requiredLandmarks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
      }
    ],
    metrics: [
      'headForward', 'headPitch', 'headYaw', 'headRoll',
      'shoulderAngle', 'shoulderLevel', 'shoulderRounded',
      'chestAngle', 'upperBackCurve'
    ]
  },
  lower: {
    scope: 'lower',
    label: '下半身',
    views: [
      {
        id: 'front',
        label: '正面',
        description: '请站在摄像头前，双脚与肩同宽',
        hint: '髋部、膝盖、脚踝在画面内',
        requiredLandmarks: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
      },
      {
        id: 'side',
        label: '侧面',
        description: '请转身至侧面站立，保持身体直立',
        hint: '髋、膝、踝关节在画面内',
        requiredLandmarks: [23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
      }
    ],
    metrics: [
      'hipAngle', 'hipLevel', 'pelvisTilt',
      'kneeAngle', 'kneeValgus',
      'ankleAngle', 'footAngle',
      'legLengthDiff'
    ]
  }
};

export const getViewsForScope = (scope: AssessmentScope): ViewConfig[] => {
  return SCOPE_CONFIGS[scope].views;
};

export const getMetricsForScope = (scope: AssessmentScope): string[] => {
  return SCOPE_CONFIGS[scope].metrics;
};

export const getScopeLabel = (scope: AssessmentScope): string => {
  return SCOPE_CONFIGS[scope].label;
};

export const getNextView = (
  scope: AssessmentScope,
  currentView: 'front' | 'side' | 'back'
): 'front' | 'side' | 'back' | null => {
  const views = SCOPE_CONFIGS[scope].views;
  const currentIndex = views.findIndex(v => v.id === currentView);
  
  if (currentIndex === -1 || currentIndex >= views.length - 1) {
    return null;
  }
  
  return views[currentIndex + 1].id;
};

export const getTotalSteps = (scope: AssessmentScope): number => {
  return SCOPE_CONFIGS[scope].views.length;
};
