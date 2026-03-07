import { create } from 'zustand';
import { ComparisonData, MetricComparison, TrendData, METRIC_DIRECTIONS, METRIC_LABELS } from '@/types/comparison';
import { Assessment } from '@/types/assessment';
import { ComparisonService } from '@/services/comparisonService';

interface ComparisonState {
  comparison: ComparisonData | null;
  trendData: TrendData[];
  isLoading: boolean;
  error: string | null;
  
  // 操作方法
  loadComparison: (patientId: string, baselineId: string, currentId: string) => Promise<void>;
  loadTrendData: (patientId: string) => Promise<void>;
  generateComparisonReport: (baseline: Assessment, current: Assessment) => ComparisonData;
  clearComparison: () => void;
  
  // 智能推荐
  getRecommendedBaseline: (patientId: string) => Promise<string | null>;
  getRecommendedCurrent: (patientId: string) => Promise<string | null>;
}

export const useComparisonStore = create<ComparisonState>((set, get) => ({
  comparison: null,
  trendData: [],
  isLoading: false,
  error: null,

  /**
   * 加载对比数据
   * 包含完整的错误处理和参数验证
   */
  loadComparison: async (patientId: string, baselineId: string, currentId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // 使用服务层加载数据（已包含参数验证）
      const { baseline, current } = await ComparisonService.loadComparisonData(
        patientId, baselineId, currentId
      );
      
      // 生成对比报告
      const comparison = get().generateComparisonReport(baseline, current);
      
      set({ comparison, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[useComparisonStore] 加载对比数据失败:', error);
      set({ 
        error: `加载对比数据失败：${errorMessage}`,
        isLoading: false 
      });
    }
  },

  /**
   * 加载趋势数据
   */
  loadTrendData: async (patientId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const trendData = await ComparisonService.loadTrendData(patientId);
      set({ trendData, isLoading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[useComparisonStore] 加载趋势数据失败:', error);
      set({ 
        error: `加载趋势数据失败：${errorMessage}`,
        isLoading: false 
      });
    }
  },

  /**
   * 生成对比报告
   * 包含完善的边界处理和方向性判断
   */
  generateComparisonReport: (baseline: Assessment, current: Assessment): ComparisonData => {
    const baselineMetrics = baseline.data.posture?.metrics || {};
    const currentMetrics = current.data.posture?.metrics || {};
    
    // 获取所有可用的指标键
    const availableKeys = Object.keys(METRIC_LABELS).filter(
      key => baselineMetrics[key] !== undefined && currentMetrics[key] !== undefined
    );
    
    // 生成指标对比
    const metrics: MetricComparison[] = availableKeys.map(key => {
      const baselineValue = baselineMetrics[key] as number;
      const currentValue = currentMetrics[key] as number;
      const change = currentValue - baselineValue;
      const improvement = calculateImprovement(
        baselineValue, 
        currentValue, 
        key
      );
      
      // 判断状态
      let status: 'improved' | 'stable' | 'worsened';
      if (Math.abs(improvement) < 5) {
        status = 'stable';
      } else if (improvement > 0) {
        status = 'improved';
      } else {
        status = 'worsened';
      }

      const metricInfo = METRIC_LABELS[key];
      
      return {
        key,
        label: metricInfo.label,
        unit: metricInfo.unit,
        baseline: Math.round(baselineValue * 10) / 10,
        current: Math.round(currentValue * 10) / 10,
        change: Math.round(change * 10) / 10,
        improvement,
        status
      };
    });

    // 计算综合评分
    const overallScore = metrics.length > 0
      ? Math.round((metrics.reduce((sum, m) => sum + m.improvement, 0) / metrics.length) * 10) / 10
      : 0;

    // 生成治疗建议
    const recommendations = generateRecommendations(overallScore, metrics);

    return {
      patientId: baseline.patientId,
      baselineAssessmentId: baseline.id,
      currentAssessmentId: current.id,
      baselineSnapshot: {
        id: baseline.id,
        createdAt: baseline.createdAt,
        mode: baseline.mode,
        metrics: baselineMetrics,
        notes: baseline.notes
      },
      currentSnapshot: {
        id: current.id,
        createdAt: current.createdAt,
        mode: current.mode,
        metrics: currentMetrics,
        notes: current.notes
      },
      metrics,
      comparisonDate: Date.now(),
      overallScore,
      recommendations
    };
  },

  /**
   * 获取推荐的基线评估 ID
   */
  getRecommendedBaseline: async (patientId: string): Promise<string | null> => {
    const assessment = await ComparisonService.getBaselineAssessment(patientId);
    return assessment?.id || null;
  },

  /**
   * 获取推荐的当前评估 ID
   */
  getRecommendedCurrent: async (patientId: string): Promise<string | null> => {
    const assessment = await ComparisonService.getLatestAssessment(patientId);
    return assessment?.id || null;
  },

  /**
   * 清除对比数据
   */
  clearComparison: () => {
    set({ comparison: null, trendData: [], error: null });
  }
}));

/**
 * 计算改善率
 * 包含完善的边界处理和方向性判断
 */
function calculateImprovement(
  baseline: number,
  current: number,
  metricKey: string
): number {
  // 处理接近 0 的情况
  if (Math.abs(baseline) < 0.001) {
    return current === 0 ? 0 : 100;
  }
  
  // 处理 NaN 和 Infinity
  if (!isFinite(baseline) || !isFinite(current)) {
    return 0;
  }
  
  // 获取指标方向性
  const higherIsBetter = METRIC_DIRECTIONS[metricKey] ?? false;
  
  let improvement: number;
  
  if (higherIsBetter) {
    // 越大越好的指标（如 stabilityScore）
    improvement = ((current - baseline) / Math.abs(baseline)) * 100;
  } else {
    // 越小越好的指标（如 shoulderAngle, headForward）
    improvement = ((baseline - current) / Math.abs(baseline)) * 100;
  }
  
  // 限制范围，避免极端值
  return Math.max(-1000, Math.min(1000, Math.round(improvement * 10) / 10));
}

/**
 * 生成治疗建议
 */
function generateRecommendations(
  overallScore: number,
  metrics: MetricComparison[]
): string[] {
  const recommendations: string[] = [];
  
  // 基于综合评分
  if (overallScore > 15) {
    recommendations.push('治疗效果显著，建议继续当前治疗方案');
  } else if (overallScore > 5) {
    recommendations.push('治疗有一定效果，建议持续观察并微调方案');
  } else if (overallScore > -5) {
    recommendations.push('治疗效果一般，建议重新评估治疗方案');
  } else {
    recommendations.push('治疗效果不理想，建议调整治疗策略或进行进一步检查');
  }
  
  // 基于具体指标
  const worsenedMetrics = metrics.filter(m => m.status === 'worsened');
  if (worsenedMetrics.length > 0) {
    const metricNames = worsenedMetrics.map(m => m.label).join('、');
    recommendations.push(`注意：${metricNames}出现恶化，需要重点关注`);
  }
  
  const improvedMetrics = metrics.filter(m => m.status === 'improved' && m.improvement > 20);
  if (improvedMetrics.length > 0) {
    const metricNames = improvedMetrics.map(m => m.label).join('、');
    recommendations.push(`亮点：${metricNames}改善明显，继续保持`);
  }
  
  return recommendations;
}
