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
import { COLORS } from '@/constants/uiStyles';
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
    {unit ? <span className={cn('mb-1 text-xs', COLORS.neutral.slate500)}>{unit}</span> : null}
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

const sectionClass = cn('rounded-[26px] border p-5 shadow-sm', COLORS.neutral.light.border, COLORS.neutral.light.bg);
const subCardClass = cn('rounded-20 border p-4', COLORS.neutral.light.border, COLORS.neutral.light.bgSoft);
const compactCardClass = cn('rounded-xl border p-3', COLORS.neutral.light.border, COLORS.neutral.light.bgSoft);
const nestedCardClass = cn('rounded-lg border p-2', COLORS.neutral.light.border, COLORS.neutral.light.bg);
const titleClass = cn('text-lg font-semibold', COLORS.neutral.light.text);
const bodyClass = cn('text-sm', COLORS.neutral.slate500);
const eyebrowClass = cn('text-[11px] font-semibold tracking-[0.18em]', COLORS.neutral.light.textLight);
const cardLabelClass = cn('text-xs', COLORS.neutral.slate500);
const cardValueClass = cn('text-3xl font-semibold tabular-nums', COLORS.neutral.light.text);
const neutralChipClass = cn(
  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
  COLORS.neutral.light.border,
  COLORS.neutral.light.bg,
  COLORS.neutral.slate600,
  COLORS.neutral.light.hover,
);

const sectionJumpButtonClass = (tone: 'blue' | 'cyan' | 'slate' | 'amber') => {
  const base = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors';
  switch (tone) {
    case 'blue':
      return `${base} border-blue-200 bg-white text-blue-700 hover:bg-blue-50`;
    case 'cyan':
      return `${base} border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50`;
    case 'amber':
      return `${base} border-amber-200 bg-white text-amber-700 hover:bg-amber-50`;
    default:
      return neutralChipClass;
  }
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
            <h3 className={cn('flex items-center gap-2 text-sm font-semibold', COLORS.neutral.light.text)}>
              <Settings2 size={14} className={COLORS.neutral.light.textMuted} />
              ROM 评估配置
            </h3>
            <span className="status-badge status-processing h-6">ROM</span>
          </div>
          <JointSelector />
        </div>

        <div className={cn('min-h-[420px] flex-1 rounded-20 border p-4', COLORS.neutral.light.border, COLORS.neutral.light.bg)}>
          <MeasurementChart />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1 custom-scrollbar">
      <div className="sticky top-0 z-10 -mx-1 rounded-[1.25rem] bg-white/95 px-1 pb-1 backdrop-blur-sm">
        <div className={cn('flex flex-wrap items-center gap-2 rounded-[1.1rem] border px-3 py-2', COLORS.neutral.light.border, 'bg-slate-50/90')}>
          <span className={eyebrowClass}>量化分区</span>
          <button
            type="button"
            className={sectionJumpButtonClass('blue')}
            onClick={() => overviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            总览
          </button>
          <button
            type="button"
            className={sectionJumpButtonClass('cyan')}
            onClick={() => metricsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            指标
          </button>
          <button
            type="button"
            className={sectionJumpButtonClass('slate')}
            onClick={() => headRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            头部姿态
          </button>
          <button
            type="button"
            className={sectionJumpButtonClass('amber')}
            onClick={() => issuesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            风险
          </button>
        </div>
      </div>

      {!result ? (
        <div className="state-panel flex min-h-[340px] flex-1 flex-col items-center justify-center gap-3">
          <Activity size={40} className={COLORS.neutral.light.textLight} />
          <h3>等待评估数据</h3>
          <p>完成拍摄后，这里会展示量化指标、风险提示和可追溯的姿态数据。</p>
        </div>
      ) : (
        <>
          <section ref={overviewRef} className={sectionClass}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className={eyebrowClass}>量化总览</p>
                <h3 className={cn('mt-1', titleClass)}>量化指标概览</h3>
                <p className={cn('mt-1', bodyClass)}>
                  这里只展示支撑结论的关键指标、风险提示和姿态观察，不再重复报告正文。
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  onClick={() => onNavigateToReport?.('report-basic')}
                >
                  <FileText size={14} />
                  查看基础报告
                </button>
                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  onClick={() => onNavigateToReport?.('report-deep')}
                >
                  <TrendingUp size={14} />
                  查看深度报告
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className={subCardClass}>
                <p className={cardLabelClass}>健康分数</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={cardValueClass}>{healthScore}</span>
                  {healthScore !== null ? (
                    <span className={cn('status-badge h-6', scoreClass(healthScore))}>
                      {healthScore >= 80 ? '良好' : healthScore >= 60 ? '关注' : '高风险'}
                    </span>
                  ) : null}
                </div>
                <p className={cn('mt-1 text-xs', COLORS.neutral.slate500)}>当前风险项 {result.issues.length} 条</p>
              </div>

              <div className={subCardClass}>
                <p className={cardLabelClass}>可复核指标</p>
                <p className={cn('mt-2', cardValueClass)}>
                  {Object.values(result.metrics).filter((value) => typeof value === 'number' && Number.isFinite(value)).length}
                </p>
                <p className={cn('mt-1 text-xs', COLORS.neutral.slate500)}>当前已回传的量化指标数量，可用于结果复核。</p>
              </div>

              <div className={subCardClass}>
                <p className={cardLabelClass}>阅读路径</p>
                <p className={cn('mt-2 text-sm font-medium', COLORS.neutral.light.text)}>先看指标，再看风险，最后回到报告。</p>
                <p className={cn('mt-1 text-xs', COLORS.neutral.slate500)}>这样更容易定位问题来源和对应结论。</p>
              </div>
            </div>
          </section>

          <section ref={metricsRef} className={sectionClass}>
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className={titleClass}>核心指标</h3>
                <p className={cn('mt-1', bodyClass)}>优先展示最常用的体态偏移指标，便于快速复核。</p>
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
              <div className={subCardClass}>
                <p className={cardLabelClass}>肩部平衡</p>
                <MetricValue value={result.metrics.shoulderAngle || 0} unit="deg" className={COLORS.neutral.light.text} />
                <span className={cn('status-badge mt-2 h-6', statusClassFromColor(getShoulderStatus(result.metrics.shoulderAngle || 0).color))}>
                  {getShoulderStatus(result.metrics.shoulderAngle || 0).text}
                </span>
              </div>

              <div className={subCardClass}>
                <p className={cardLabelClass}>头前引</p>
                <MetricValue value={result.metrics.headForward || 0} unit="deg" className={COLORS.neutral.light.text} />
                <span className={cn('status-badge mt-2 h-6', getHeadStatus(result.metrics.headForward || 0).bgColor, getHeadStatus(result.metrics.headForward || 0).color)}>
                  {getHeadStatus(result.metrics.headForward || 0).text}
                </span>
              </div>

              <div className={subCardClass}>
                <p className={cardLabelClass}>骨盆倾斜</p>
                <MetricValue value={result.metrics.hipAngle || 0} unit="deg" className={COLORS.neutral.light.text} />
                <span className={cn('status-badge mt-2 h-6', getHipStatus(result.metrics.hipAngle || 0).bgColor, getHipStatus(result.metrics.hipAngle || 0).color)}>
                  {getHipStatus(result.metrics.hipAngle || 0).text}
                </span>
              </div>
            </div>

            <div className={cn('mt-4', subCardClass)}>
              <div className="mb-2 flex items-center justify-between">
                <p className={cn('text-sm font-semibold', COLORS.neutral.light.text)}>肩部偏移条</p>
                <p className={cardLabelClass}>中心线代表理想对称位。</p>
              </div>
              <div className={cn('relative h-3 overflow-hidden rounded-full', COLORS.neutral.light.selected)}>
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
                <div className={cn('absolute top-0 bottom-0 left-1/2 w-px', COLORS.neutral.light.textLight.replace('text', 'bg'))} />
              </div>
            </div>
          </section>

          {result.metrics.headYaw !== undefined ? (
            <section ref={headRef} className={sectionClass}>
              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className={titleClass}>头部姿态</h3>
                  <p className={cn('mt-1', bodyClass)}>查看头部偏航、俯仰和翻滚的量化结果。</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowHeadAxes((prev) => !prev)}
                    className={cn(
                      'h-8 rounded-lg border px-3 text-xs font-medium transition-colors',
                      showHeadAxes
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : cn(COLORS.neutral.light.border, COLORS.neutral.light.bg, COLORS.neutral.slate600, COLORS.neutral.light.hover),
                    )}
                  >
                    {showHeadAxes ? '头部坐标已开启' : '头部坐标已关闭'}
                  </button>

                  <label className={cn('flex items-center gap-2 text-xs', COLORS.neutral.light.textMuted)}>
                    坐标长度
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
                <div className={compactCardClass}>
                  <p className={cn('mb-1 text-xs', COLORS.neutral.slate500)}>偏航</p>
                  <MetricValue value={result.metrics.headYaw} unit="deg" className={COLORS.neutral.light.text} />
                </div>
                <div className={compactCardClass}>
                  <p className={cn('mb-1 text-xs', COLORS.neutral.slate500)}>俯仰</p>
                  <MetricValue value={result.metrics.headPitch || 0} unit="deg" className={COLORS.neutral.light.text} />
                </div>
                <div className={compactCardClass}>
                  <p className={cn('mb-1 text-xs', COLORS.neutral.slate500)}>翻滚</p>
                  <MetricValue value={result.metrics.headRoll || 0} unit="deg" className={COLORS.neutral.light.text} />
                </div>
              </div>
            </section>
          ) : null}

          <section ref={issuesRef} className={cn('flex min-h-0 flex-col', sectionClass)}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className={titleClass}>风险列表</h3>
                <p className={cn('mt-1', bodyClass)}>按影响程度查看问题描述、建议动作和报告跳转入口。</p>
              </div>
              <button
                type="button"
                className="btn-secondary h-9 px-3 self-start"
                onClick={() => onNavigateToReport?.('report-deep')}
              >
                <FileText size={14} />
                查看深度报告
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {result.issues.length === 0 ? (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                  当前未发现明显异常，建议结合病史和复测结果持续观察。
                </div>
              ) : (
                result.issues.map((issue, idx) => (
                  <div key={`${issue.type}-${idx}`} className={compactCardClass}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={15} className={cn('mt-0.5', COLORS.neutral.slate500)} />
                        <div>
                          <p className={cn('text-sm font-semibold', COLORS.neutral.light.text)}>{issue.title || issue.type}</p>
                          <p className={cn('mt-1 text-xs', COLORS.neutral.light.textMuted)}>{issue.description}</p>
                        </div>
                      </div>
                      <span className={cn('status-badge h-6', severityBadgeClass(issue.severity))}>
                        {getSeverityLabel(issue.severity)}
                      </span>
                    </div>
                    <div className={cn('mt-2', nestedCardClass)}>
                      <p className={cardLabelClass}>建议动作</p>
                      <p className={cn('mt-1 text-xs', COLORS.neutral.light.textSoft)}>{issue.recommendation}</p>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <button
                        type="button"
                        className="btn-secondary h-8 px-3"
                        onClick={() => onNavigateToReport?.('report-deep')}
                      >
                        <FileText size={14} />
                        查看报告
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
