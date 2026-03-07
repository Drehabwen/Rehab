import { AssessmentMode } from './assessment';
import { PostureMetrics } from './posture';

/**
 * 对比数据主接口
 * 使用 ID + 快照模式，避免存储完整的 Assessment 对象
 */
export interface ComparisonData {
  patientId: string;
  patientName?: string;
  
  // 评估记录 ID（用于追溯）
  baselineAssessmentId: string;
  currentAssessmentId: string;
  
  // 评估快照（只包含必要数据）
  baselineSnapshot: AssessmentSnapshot;
  currentSnapshot: AssessmentSnapshot;
  
  // 对比指标
  metrics: MetricComparison[];
  
  // 对比结果
  comparisonDate: number;
  overallScore: number;
  recommendations: string[];
}

/**
 * 评估快照
 * 只包含对比所需的核心数据，不包含 timeSeriesLandmarks 等大字段
 */
export interface AssessmentSnapshot {
  id: string;
  createdAt: number;
  mode: AssessmentMode;
  metrics: PostureMetrics;
  notes?: string;
}

/**
 * 单个指标的对比数据
 */
export interface MetricComparison {
  key: string;
  label: string;
  unit: string;
  baseline: number;
  current: number;
  change: number;
  improvement: number;
  status: 'improved' | 'stable' | 'worsened';
}

/**
 * 趋势数据
 * 用于历史趋势图表
 */
export interface TrendData {
  timestamp: number;
  date: string;
  metrics: Record<string, number>;
}

/**
 * 指标方向性配置
 * true = 越大越好（正向指标）
 * false = 越小越好（负向指标）
 */
export const METRIC_DIRECTIONS: Record<string, boolean> = {
  // 正向指标（越大越好）
  stabilityScore: true,
  
  // 负向指标（越小越好）
  shoulderAngle: false,
  headForward: false,
  headDeviation: false,
  headPitch: false,
  headYaw: false,
  headRoll: false,
  hipAngle: false,
  swayOffset: false,
  shoulderRounded: false,
};

/**
 * 指标标签映射
 */
export const METRIC_LABELS: Record<string, { label: string; unit: string }> = {
  shoulderAngle: { label: '高低肩', unit: '°' },
  headForward: { label: '头前伸', unit: 'cm' },
  headDeviation: { label: '头部偏移', unit: 'cm' },
  headPitch: { label: '头部俯仰', unit: '°' },
  headYaw: { label: '头部旋转', unit: '°' },
  headRoll: { label: '头部侧倾', unit: '°' },
  hipAngle: { label: '骨盆倾斜', unit: '°' },
  swayOffset: { label: '摇摆偏移', unit: 'cm' },
  stabilityScore: { label: '稳定性评分', unit: '分' },
  shoulderRounded: { label: '圆肩程度', unit: '°' },
};

/**
 * 状态标签映射
 */
export const STATUS_LABELS: Record<string, string> = {
  improved: '改善',
  worsened: '恶化',
  stable: '稳定',
};
