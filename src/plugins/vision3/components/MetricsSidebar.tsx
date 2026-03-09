import React from 'react';
import { Activity, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THRESHOLDS, SYSTEM_CONFIG } from '../config';
import type { PostureMetrics } from '@/hooks/usePostureWS';
import { DATA_QUALITY_TEXTS } from '../constants/uiText';

type MetricState = {
  label: string;
  badgeClass: string;
  barClass: string;
};

interface MetricRowProps {
  label: string;
  value: number;
  unit: string;
  reference: string;
  meaning: string;
  state: MetricState;
  progress: number;
}

interface MetricsSidebarProps {
  isVisible: boolean;
  metrics?: PostureMetrics;
  stability?: { sd: number };
}

const clampProgress = (value: number) => Math.max(0, Math.min(100, value));

const getMetricState = (value: number, good: number, warn: number): MetricState => {
  const absValue = Math.abs(value);
  if (absValue <= good) {
    return {
      label: '正常',
      badgeClass: 'status-success',
      barClass: 'bg-emerald-500',
    };
  }

  if (absValue <= warn) {
    return {
      label: '待关注',
      badgeClass: 'status-warning',
      barClass: 'bg-amber-500',
    };
  }

  return {
    label: '异常',
    badgeClass: 'status-error',
    barClass: 'bg-rose-500',
  };
};

const MetricRow: React.FC<MetricRowProps> = ({
  label,
  value,
  unit,
  reference,
  meaning,
  state,
  progress,
}) => {
  return (
    <div className="rounded-20 border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="text-xs text-slate-500 mt-1">参考值：{reference}</p>
        </div>
        <span className={cn('status-badge h-6', state.badgeClass)}>{state.label}</span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">{value.toFixed(1)}</span>
        <span className="text-xs font-medium text-slate-500 mb-1">{unit}</span>
      </div>

      <div className="mt-3 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <div className={cn('h-full transition-all duration-500', state.barClass)} style={{ width: `${progress}%` }} />
      </div>

      <p className="mt-3 text-xs text-slate-600 leading-relaxed">{meaning}</p>
    </div>
  );
};

export const MetricsSidebar: React.FC<MetricsSidebarProps> = ({
  isVisible,
  metrics,
  stability,
}) => {
  if (!isVisible || !metrics) return null;

  const swayState = getMetricState(
    metrics.swayOffset || 0,
    THRESHOLDS.swayOffset.excellent,
    THRESHOLDS.swayOffset.good,
  );
  const shoulderState = getMetricState(
    metrics.shoulderAngle || 0,
    THRESHOLDS.shoulderAngle.balanced,
    THRESHOLDS.shoulderAngle.acceptable,
  );
  const hipState = getMetricState(
    metrics.hipAngle || 0,
    THRESHOLDS.hipAngle.balanced,
    THRESHOLDS.hipAngle.acceptable,
  );

  const isStabilityGood = Boolean(stability && stability.sd < THRESHOLDS.stability.clinical);

  return (
    <aside className="absolute right-6 top-[100px] bottom-6 z-30 hidden xl:flex w-[320px] pointer-events-none">
      <div className="bento-card p-4 w-full flex flex-col gap-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">核心生物力学指标</h3>
            <p className="text-xs text-slate-500">用于快速判断姿态风险等级</p>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
          <MetricRow
            label="重心偏移"
            value={metrics.swayOffset || 0}
            unit="mm"
            reference="0-15 mm"
            meaning="重心偏离中线越大，站姿稳定性风险越高。"
            state={swayState}
            progress={clampProgress(Math.abs(metrics.swayOffset || 0) * SYSTEM_CONFIG.chartScaling.swayOffset)}
          />

          <MetricRow
            label="肩部平衡"
            value={metrics.shoulderAngle || 0}
            unit="deg"
            reference="0-3°"
            meaning="反映左右肩高差，提示颈肩代偿风险。"
            state={shoulderState}
            progress={clampProgress(Math.abs(metrics.shoulderAngle || 0) * SYSTEM_CONFIG.chartScaling.shoulderAngle)}
          />

          <MetricRow
            label="骨盆对称"
            value={metrics.hipAngle || 0}
            unit="deg"
            reference="0-2°"
            meaning="骨盆倾斜会影响下肢受力与躯干稳定。"
            state={hipState}
            progress={clampProgress(Math.abs(metrics.hipAngle || 0) * 12)}
          />
        </div>

        <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Activity size={14} className="text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">临床稳定性</span>
            </div>
            <span className={cn('status-badge h-6', isStabilityGood ? 'status-success' : 'status-warning')}>
              {isStabilityGood ? '稳定' : '建议复测'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            {isStabilityGood ? DATA_QUALITY_TEXTS.excellent : DATA_QUALITY_TEXTS.suggestion}
          </p>
        </div>
      </div>
    </aside>
  );
};
