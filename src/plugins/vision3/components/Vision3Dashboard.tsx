import React, { useEffect, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  FileText,
  History,
  Settings2,
  TrendingUp,
} from 'lucide-react';
import JointSelector from '@/components/JointSelector';
import MeasurementChart from '@/components/MeasurementChart';
import { PostureMetrics } from '@/hooks/usePostureWS';
import { cn } from '@/lib/utils';

type DataFocusTarget =
  | 'workspace-summary'
  | 'report-basic'
  | 'report-deep'
  | 'data-overview'
  | 'data-metrics'
  | 'data-issues'
  | 'data-head';

const MetricValue: React.FC<{ value: number; unit?: string; className?: string }> = ({
  value,
  unit,
  className,
}) => (
  <div className="flex items-end gap-1">
    <span className={cn('text-2xl font-semibold tabular-nums', className)}>{value.toFixed(1)}</span>
    {unit ? <span className="mb-1 text-xs text-slate-500">{unit}</span> : null}
  </div>
);

interface Vision3DashboardProps {
  activeTab: 'posture' | 'rom';
  result: {
    metrics: PostureMetrics;
    issues: Array<{
      type: string;
      title: string;
      severity: 'mild' | 'moderate' | 'severe';
      description: string;
      recommendation: string;
    }>;
  } | null;
  showHeadAxes: boolean;
  setShowHeadAxes: React.Dispatch<React.SetStateAction<boolean>>;
  axesScale: number;
  setAxesScale: React.Dispatch<React.SetStateAction<number>>;
  getShoulderStatus: (angle: number) => { text: string; color: string; bgColor?: string };
  getHeadStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getHipStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getSeverityLabel: (severity: string) => string;
  focusTarget?: DataFocusTarget;
  onNavigateToReport?: (target: 'report-basic' | 'report-deep') => void;
}

const statusClassFromColor = (textColor: string) => {
  if (textColor.includes('emerald')) return 'status-success';
  if (textColor.includes('amber')) return 'status-warning';
  if (textColor.includes('rose')) return 'status-error';
  return 'status-processing';
};

const severityBadgeClass = (severity: 'mild' | 'moderate' | 'severe') => {
  switch (severity) {
    case 'severe':
      return 'status-error';
    case 'moderate':
      return 'status-warning';
    default:
      return 'status-processing';
  }
};

const scoreClass = (score: number) => {
  if (score >= 80) return 'status-success';
  if (score >= 60) return 'status-warning';
  return 'status-error';
};

export const Vision3Dashboard: React.FC<Vision3DashboardProps> = ({
  activeTab,
  result,
  showHeadAxes,
  setShowHeadAxes,
  axesScale,
  setAxesScale,
  getShoulderStatus,
  getHeadStatus,
  getHipStatus,
  getSeverityLabel,
  focusTarget,
  onNavigateToReport,
}) => {
  const healthScore = result ? Math.max(0, 100 - result.issues.length * 15) : null;
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const metricsRef = useRef<HTMLDivElement | null>(null);
  const issuesRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeTab !== 'posture') {
      return;
    }

    const targetMap = {
      'data-overview': overviewRef,
      'data-metrics': metricsRef,
      'data-issues': issuesRef,
      'data-head': headRef,
    } as const;

    if (!focusTarget || !(focusTarget in targetMap)) {
      return;
    }

    targetMap[focusTarget as keyof typeof targetMap].current?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, [activeTab, focusTarget]);

  if (activeTab === 'rom') {
    return (
      <div className="flex h-full flex-col gap-4 overflow-hidden pr-1">
        <div className="bento-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Settings2 size={14} className="text-slate-600" />
              ROM 配置
            </h3>
            <span className="status-badge status-processing h-6">ROM</span>
          </div>
          <JointSelector />
        </div>

        <div className="min-h-[420px] flex-1 rounded-20 border border-slate-200 bg-white p-4">
          <MeasurementChart />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
      <div className="sticky top-0 z-10 -mx-1 rounded-[1.25rem] bg-white/95 px-1 pb-1 backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-slate-50/90 px-3 py-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Data Sections</span>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
            onClick={() => overviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            概览
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-50"
            onClick={() => metricsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            指标
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
            onClick={() => headRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            3D 位姿
          </button>
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
            onClick={() => issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            风险
          </button>
        </div>
      </div>

      {!result ? (
        <div className="state-panel flex min-h-[340px] flex-1 flex-col items-center justify-center gap-3">
          <Activity size={40} className="text-slate-400" />
          <h3>等待评估数据</h3>
          <p>完成拍摄后，这里会展示量化指标、风险证据和可追溯的数据支撑。</p>
        </div>
      ) : (
        <>
          <section ref={overviewRef} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Data Evidence</p>
                <h3 className="mt-1 text-lg font-semibold text-slate-900">数据证据概览</h3>
                <p className="mt-1 text-sm text-slate-500">
                  这里不重复报告文案，只展示支撑结论的核心指标、异常证据和位姿观察。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  onClick={() => onNavigateToReport?.('report-basic')}
                >
                  <FileText size={14} />
                  基础报告
                </button>
                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  onClick={() => onNavigateToReport?.('report-deep')}
                >
                  <TrendingUp size={14} />
                  报告扩展
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">健康指数</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-3xl font-semibold tabular-nums text-slate-900">{healthScore}</span>
                  {healthScore !== null ? (
                    <span className={cn('status-badge h-6', scoreClass(healthScore))}>
                      {healthScore >= 80 ? '良好' : healthScore >= 60 ? '关注' : '高风险'}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-slate-500">当前风险项 {result.issues.length} 条</p>
              </div>

              <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">可复核指标</p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
                  {Object.values(result.metrics).filter((value) => typeof value === 'number' && Number.isFinite(value)).length}
                </p>
                <p className="mt-1 text-xs text-slate-500">已回传的量化指标数量，可用于证据复核。</p>
              </div>

              <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">阅读路径</p>
                <p className="mt-2 text-sm font-medium text-slate-900">先看指标，再看风险，最后回到报告。</p>
                <p className="mt-1 text-xs text-slate-500">这样能更快定位问题来源和对应结论。</p>
              </div>
            </div>
          </section>

          <section ref={metricsRef} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">指标证据</h3>
                <p className="mt-1 text-sm text-slate-500">优先展示最常用的体态偏移指标，便于快速复核。</p>
              </div>
              <button
                type="button"
                className="btn-secondary h-9 px-3 self-start"
                onClick={() => onNavigateToReport?.('report-basic')}
              >
                <FileText size={14} />
                对照基础报告
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">肩部平衡</p>
                <MetricValue value={result.metrics.shoulderAngle || 0} unit="deg" className="text-slate-900" />
                <span className={cn('status-badge mt-2 h-6', statusClassFromColor(getShoulderStatus(result.metrics.shoulderAngle || 0).color))}>
                  {getShoulderStatus(result.metrics.shoulderAngle || 0).text}
                </span>
              </div>

              <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">头前引</p>
                <MetricValue value={result.metrics.headForward || 0} unit="deg" className="text-slate-900" />
                <span className={cn('status-badge mt-2 h-6', getHeadStatus(result.metrics.headForward || 0).bgColor, getHeadStatus(result.metrics.headForward || 0).color)}>
                  {getHeadStatus(result.metrics.headForward || 0).text}
                </span>
              </div>

              <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">骨盆倾斜</p>
                <MetricValue value={result.metrics.hipAngle || 0} unit="deg" className="text-slate-900" />
                <span className={cn('status-badge mt-2 h-6', getHipStatus(result.metrics.hipAngle || 0).bgColor, getHipStatus(result.metrics.hipAngle || 0).color)}>
                  {getHipStatus(result.metrics.hipAngle || 0).text}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-20 border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">肩部偏移条</p>
                <p className="text-xs text-slate-500">中心线代表理想对称位。</p>
              </div>
              <div className="relative h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={cn(
                    'absolute top-0 bottom-0 rounded-full transition-all duration-300',
                    Math.abs(result.metrics.shoulderAngle || 0) < 1.5
                      ? 'bg-emerald-500'
                      : Math.abs(result.metrics.shoulderAngle || 0) < 3.5
                        ? 'bg-amber-500'
                        : 'bg-rose-500',
                  )}
                  style={{
                    left: '50%',
                    width: `${Math.min(50, Math.abs(result.metrics.shoulderAngle || 0) * 8)}%`,
                    transform: (result.metrics.shoulderAngle || 0) > 0 ? 'none' : 'scaleX(-1)',
                    transformOrigin: 'left',
                  }}
                />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-400" />
              </div>
            </div>
          </section>

          {result.metrics.headYaw !== undefined ? (
            <section ref={headRef} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">3D 头部位姿证据</h3>
                  <p className="mt-1 text-sm text-slate-500">这里用于查看头部偏航、俯仰和翻滚的定量结果。</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHeadAxes((prev) => !prev)}
                    className={cn(
                      'h-8 rounded-lg border px-3 text-xs font-medium transition-colors',
                      showHeadAxes
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {showHeadAxes ? '3D 轴已开启' : '3D 轴已关闭'}
                  </button>

                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    轴长
                    <input
                      type="range"
                      min={0.6}
                      max={1.6}
                      step={0.1}
                      value={axesScale}
                      onChange={(event) => setAxesScale(Number(event.target.value))}
                      className="h-1 w-24 accent-emerald-600"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">Yaw 偏航</p>
                  <MetricValue value={result.metrics.headYaw} unit="deg" className="text-slate-900" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">Pitch 俯仰</p>
                  <MetricValue value={result.metrics.headPitch || 0} unit="deg" className="text-slate-900" />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="mb-1 text-xs text-slate-500">Roll 翻滚</p>
                  <MetricValue value={result.metrics.headRoll || 0} unit="deg" className="text-slate-900" />
                </div>
              </div>
            </section>
          ) : null}

          <section ref={issuesRef} className="flex min-h-0 flex-col rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">风险证据列表</h3>
                <p className="mt-1 text-sm text-slate-500">按影响程度查看问题描述、建议动作和回跳路径。</p>
              </div>
              <button
                type="button"
                className="btn-secondary h-9 px-3 self-start"
                onClick={() => onNavigateToReport?.('report-deep')}
              >
                <FileText size={14} />
                对照报告扩展
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {result.issues.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  当前未发现明显异常，建议结合病史和复测结果持续观察。
                </div>
              ) : (
                result.issues.map((issue, idx) => (
                  <div key={`${issue.type}-${idx}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={15} className="mt-0.5 text-slate-500" />
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{issue.title || issue.type}</p>
                          <p className="mt-1 text-xs text-slate-600">{issue.description}</p>
                        </div>
                      </div>
                      <span className={cn('status-badge h-6', severityBadgeClass(issue.severity))}>
                        {getSeverityLabel(issue.severity)}
                      </span>
                    </div>
                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2">
                      <p className="text-xs text-slate-500">建议动作</p>
                      <p className="mt-1 text-xs text-slate-700">{issue.recommendation}</p>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="btn-secondary h-8 px-3"
                        onClick={() => onNavigateToReport?.('report-deep')}
                      >
                        <FileText size={14} />
                        返回报告
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <button type="button" className="btn-secondary w-full">
              <History size={14} />
              对比历史
            </button>
            <button type="button" className="btn-primary w-full">
              <TrendingUp size={14} />
              导出 PDF
            </button>
          </section>
        </>
      )}
    </div>
  );
};
