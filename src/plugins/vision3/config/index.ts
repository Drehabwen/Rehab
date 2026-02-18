import { PostureIssue } from '@/hooks/usePostureWS';

// 体态评估阈值
export const THRESHOLDS = {
  // 重心偏移阈值 (mm)
  swayOffset: {
    excellent: 15,
    good: 25,
    fair: 35,
  },
  
  // 肩部角度阈值 (度)
  shoulderAngle: {
    balanced: 3,
    acceptable: 6,
  },
  
  // 头部前倾阈值 (度)
  headForward: {
    good: 10,
    fair: 20,
  },
  
  // 骨盆角度阈值 (度)
  hipAngle: {
    balanced: 2,
    acceptable: 4,
  },
  
  // 稳定性阈值 (标准差)
  stability: {
    clinical: 10,
  },
  
  // 置信度
  confidence: 0.85,
} as const;

// 临床参考值
export const CLINICAL_REFERENCES = {
  // 关节活动度参考值 (度)
  rom: {
    shoulderFlexion: 180,
    shoulderAbduction: 180,
    elbowFlexion: 145,
    hipFlexion: 120,
    kneeFlexion: 135,
  },
} as const;

// 系统配置
export const SYSTEM_CONFIG = {
  // 骨骼点数量
  skeletonPoints: 33,
  
  // 版本号
  version: 'v3.2',
  
  // 评估视图顺序
  viewOrder: ['front', 'side', 'back'] as const,
  
  // 健康指数计算
  healthIndex: {
    base: 100,
    penalty: 15,
  },
  
  // 图表缩放因子
  chartScaling: {
    swayOffset: 2,
    shoulderAngle: 8,
  },
} as const;

// UI 配置
export const UI_CONFIG = {
  sidebar: {
    width: 'w-80',
    position: {
      top: '100px',
    },
  },
  
  // 动画配置
  animation: {
    duration: {
      fast: 300,
      normal: 500,
      slow: 1000,
    },
  },
} as const;

// 工具函数
export function getSeverityColor(severity: PostureIssue['severity']) {
  const colors = {
    severe: 'bg-rose-50 text-rose-500',
    moderate: 'bg-amber-50 text-amber-500',
    mild: 'bg-blue-50 text-blue-500',
  };
  return colors[severity] || colors.mild;
}

export function getSeverityBadge(severity: PostureIssue['severity']) {
  const badges = {
    severe: 'bg-rose-100 text-rose-600',
    moderate: 'bg-amber-100 text-amber-600',
    mild: 'bg-blue-100 text-blue-600',
  };
  return badges[severity] || badges.mild;
}

export function getStatusColor(value: number, thresholds: { [key: string]: number }) {
  if (value < thresholds.excellent || value < thresholds.balanced) {
    return 'bg-emerald-500/10 text-emerald-600';
  }
  if (value < thresholds.good || value < thresholds.acceptable) {
    return 'bg-amber-500/10 text-amber-600';
  }
  return 'bg-rose-500/10 text-rose-600';
}
