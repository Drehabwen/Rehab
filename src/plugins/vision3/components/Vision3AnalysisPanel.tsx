import React, { useEffect, useMemo, useRef } from 'react';
import { FileText, Layers, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownReport, sanitizeReadableText } from '@/components/shared/MarkdownReport';
import { Vision3Dashboard } from './Vision3Dashboard';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { COLORS } from '@/constants/uiStyles';
import { AssessmentType } from '../store/usePostureAssessmentStore';
import { ASSESSMENT_TEXTS } from '../constants/uiText';
import { buildImmediateBasicReport } from '../report-insights';

type WorkspaceFocusTarget =
  | 'workspace-summary'
  | 'report-basic'
  | 'report-deep'
  | 'data-overview'
  | 'data-metrics'
  | 'data-issues'
  | 'data-head';

interface Vision3AnalysisPanelProps {
  activePanel: 'dashboard' | 'report';
  setActivePanel: (panel: 'dashboard' | 'report') => void;
  captureStatus: string;
  markdownReport: string | null;
  streamingReport?: string;
  isStreamingReport?: boolean;
  auxiliaryDiagnosis: string | null;
  activeTab: 'posture' | 'rom';
  result: { issues: PostureIssue[]; metrics: PostureMetrics } | null;
  showHeadAxes: boolean;
  setShowHeadAxes: (show: boolean) => void;
  axesScale: number;
  setAxesScale: (scale: number) => void;
  getShoulderStatus: (angle: number) => { text: string; color: string; bgColor?: string };
  getHeadStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getHipStatus: (angle: number) => { text: string; color: string; bgColor: string };
  getSeverityLabel: (severity: string) => string;
  assessmentType: AssessmentType;
  focusTarget?: WorkspaceFocusTarget;
  onNavigate?: (panel: 'dashboard' | 'report', target: WorkspaceFocusTarget) => void;
}

const panelButtonClass = (active: boolean, tone: 'blue' | 'violet') => {
  if (!active) {
    return cn(
      'h-9 rounded-lg px-3 text-sm font-medium transition-colors',
      COLORS.neutral.slate600,
      COLORS.neutral.light.hover,
      COLORS.neutral.light.hoverText,
    );
  }

  return tone === 'blue'
    ? 'h-9 rounded-lg border border-blue-100 bg-blue-50 px-3 text-sm font-semibold text-blue-700 shadow-sm'
    : 'h-9 rounded-lg border border-violet-100 bg-violet-50 px-3 text-sm font-semibold text-violet-700 shadow-sm';
};

const assessmentBadgeClass = (assessmentType: AssessmentType) => {
  if (assessmentType === 'quick') {
    return 'border border-cyan-100 bg-cyan-50 text-cyan-700';
  }

  return 'border border-emerald-100 bg-emerald-50 text-emerald-700';
};

const panelShellClass = cn(
  'flex min-h-0 flex-col gap-4 rounded-[2rem] border p-4 shadow-sm backdrop-blur-sm lg:p-6',
  COLORS.neutral.light.borderSubtle,
  COLORS.neutral.whiteBg95,
);
const dashboardShellClass = cn(panelShellClass, 'h-full overflow-hidden');
const reportShellClass = cn(panelShellClass, 'overflow-visible');
const headerToggleClass = cn(
  'flex items-center rounded-xl border p-1 shadow-sm',
  COLORS.neutral.light.borderStrong,
  COLORS.neutral.light.bg,
);
const sectionShellClass = cn('rounded-[28px] border p-4 shadow-sm lg:p-5', COLORS.neutral.light.border);
const titleClass = cn('text-2xl font-semibold', COLORS.neutral.light.text);
const subtitleClass = cn('mt-2 text-sm leading-6', COLORS.neutral.slate500);
const emptyStateIconClass = cn('h-10 w-10', COLORS.neutral.light.textLight);
const quickJumpButtonClass = (tone: 'violet' | 'blue' | 'slate') => {
  const base = 'inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm font-medium transition-colors';
  switch (tone) {
    case 'violet':
      return `${base} border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100`;
    case 'blue':
      return `${base} border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100`;
    default:
      return `${base} ${COLORS.neutral.light.border} ${COLORS.neutral.light.bg} ${COLORS.neutral.slate600} ${COLORS.neutral.light.hover}`;
  }
};

const sanitizeReportSource = (value?: string | null) => {
  const cleaned = sanitizeReadableText(value);
  return cleaned || null;
};

export const Vision3AnalysisPanel: React.FC<Vision3AnalysisPanelProps> = ({
  activePanel,
  setActivePanel,
  captureStatus,
  markdownReport,
  streamingReport,
  auxiliaryDiagnosis,
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
  assessmentType,
  focusTarget,
  onNavigate,
}) => {
  const isCompleted = captureStatus === 'completed';
  const safeAuxiliaryDiagnosis = sanitizeReportSource(auxiliaryDiagnosis);
  const safeMarkdownReport = sanitizeReportSource(markdownReport);
  const safeStreamingReport = sanitizeReportSource(streamingReport);
  const hasAuxiliaryReport = Boolean(safeAuxiliaryDiagnosis);
  const hasDeepReport = Boolean(safeMarkdownReport || safeStreamingReport);
  const immediateBasicReport = !hasAuxiliaryReport
    ? buildImmediateBasicReport({
        metrics: result?.metrics,
        issues: result?.issues,
      })
    : null;
  const basicReportContent = safeAuxiliaryDiagnosis || immediateBasicReport || null;
  const readableBasicReport = sanitizeReadableText(basicReportContent);
  const hasBasicReportContent = Boolean(readableBasicReport);
  const basicReportRef = useRef<HTMLElement | null>(null);
  const showPanelToggle = !isCompleted || activePanel === 'dashboard';

  const reportLines = useMemo(() => {
    return readableBasicReport
      .split(/\r?\n/)
      .map((line) => line.replace(/\*\*/g, '').trim())
      .filter(Boolean);
  }, [readableBasicReport]);

  const reportHighlights = useMemo(() => {
    return reportLines
      .map((line) => line.replace(/^#{1,6}\s*/, '').replace(/^[-*+]\s*/, '').trim())
      .filter((line) => line.length > 0)
      .filter((line) => !['基础报告', '即时基础结论', '正面评估', '侧面评估', '背面评估', '建议动作'].includes(line))
      .slice(0, 6);
  }, [reportLines]);

  const findingCards = (result?.issues || []).slice(0, 3);
  const actionCards = findingCards
    .map((issue) => issue.recommendation?.trim())
    .filter((value): value is string => Boolean(value))
    .slice(0, 3);
  const summaryCards = reportHighlights.slice(0, 3);
  const visibleActionCards = actionCards.length > 0 ? actionCards : ['建议保持当前训练与日常姿势管理，并结合后续复测持续观察。'];
  const reportIntro = hasBasicReportContent
    ? '基础报告会在当前界面完整展开，首屏先看结论，再向下继续阅读完整正文。'
    : '完成评估后，这里会立即承接本次体态评估的基础报告。';

  useEffect(() => {
    if (activePanel !== 'report') {
      return;
    }

    if (focusTarget === 'report-basic') {
      basicReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activePanel, focusTarget]);

  return (
    <div className={activePanel === 'report' ? reportShellClass : dashboardShellClass}>
      <div className="flex flex-col gap-3 rounded-[1.4rem]">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('status-badge h-7 px-3 text-xs', assessmentBadgeClass(assessmentType))}>
            {assessmentType === 'quick' ? <Zap size={14} /> : <Layers size={14} />}
            {assessmentType === 'quick' ? ASSESSMENT_TEXTS.quick.label : ASSESSMENT_TEXTS.standard.label}
          </span>
          <span className="inline-flex items-center rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-medium text-cyan-700">
            当前页直读
          </span>
        </div>

        {showPanelToggle ? (
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h3 className={titleClass}>{activePanel === 'report' ? '基础报告' : '量化指标'}</h3>
              <p className={subtitleClass}>{activePanel === 'report' ? reportIntro : '查看本次姿态量化结果与结构化指标。'}</p>
            </div>

            <div className={headerToggleClass}>
              <button
                type="button"
                onClick={() => setActivePanel('dashboard')}
                className={panelButtonClass(activePanel === 'dashboard', 'blue')}
              >
                量化指标
              </button>
              <button
                type="button"
                onClick={() => setActivePanel('report')}
                className={panelButtonClass(activePanel === 'report', 'violet')}
              >
                基础报告
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {activePanel === 'report' ? (
        <section ref={basicReportRef} className={cn(sectionShellClass, 'bg-[linear-gradient(180deg,rgba(248,252,255,0.98),rgba(255,255,255,1))]')}>
          {hasBasicReportContent ? (
            <div className="space-y-5">
              <div className="grid gap-3 xl:grid-cols-3">
                <div className="rounded-[24px] border border-cyan-100 bg-cyan-50/75 p-4">
                  <div className="text-xs font-semibold tracking-[0.12em] text-cyan-700">结论摘要</div>
                  <div className="mt-3 space-y-2">
                    {(summaryCards.length > 0 ? summaryCards : ['本次基础报告已经生成，下面可直接继续阅读完整正文。']).map((item) => (
                      <p key={item} className="rounded-xl bg-white/85 px-3 py-2 text-sm leading-6 text-slate-700">
                        {item}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-amber-100 bg-amber-50/75 p-4">
                  <div className="text-xs font-semibold tracking-[0.12em] text-amber-700">关键异常</div>
                  {findingCards.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      {findingCards.map((issue) => (
                        <div key={`${issue.type}-${issue.title}`} className="rounded-xl bg-white/90 px-3 py-2">
                          <div className="text-sm font-semibold text-slate-900">{issue.title}</div>
                          <div className="mt-1 text-xs leading-5 text-slate-500">{issue.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 rounded-xl bg-white/90 px-3 py-3 text-sm leading-6 text-emerald-700">
                      当前未见明显高风险异常，整体表现偏稳定。
                    </div>
                  )}
                </div>

                <div className="rounded-[24px] border border-violet-100 bg-violet-50/75 p-4">
                  <div className="text-xs font-semibold tracking-[0.12em] text-violet-700">建议动作</div>
                  <div className="mt-3 space-y-2">
                    {visibleActionCards.map((action) => (
                      <p key={action} className="rounded-xl bg-white/90 px-3 py-2 text-sm leading-6 text-slate-700">
                        {action}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-xl font-semibold text-slate-900">基础报告正文</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-500">这里直接保留完整基础报告，不折叠，不使用内部滚动条。</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result ? (
                      <button
                        type="button"
                        className={quickJumpButtonClass('blue')}
                        onClick={() => setActivePanel('dashboard')}
                      >
                        查看量化指标
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className={quickJumpButtonClass('violet')}
                      onClick={() => onNavigate?.('report', 'report-basic')}
                    >
                      前往报告中心
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <MarkdownReport
                    content={basicReportContent}
                    loading={false}
                    animate={false}
                    showChrome={false}
                    tone="cyan"
                    className="min-h-0 border-0 bg-transparent shadow-none"
                    emptyTitle="暂无基础报告"
                    emptyDescription="完成体态评估后，这里会直接显示本次基础报告。"
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-base font-semibold text-slate-900">报告流转</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      当前页优先阅读基础报告，报告中心会自动汇总本次基础报告；如需跨模块深度报告，再前往报告中心统一查看。
                    </p>
                  </div>
                  {hasDeepReport ? (
                    <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                      深度报告可继续查看
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="state-panel flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-[26px]">
              <FileText className={emptyStateIconClass} />
              <h3>暂无基础报告</h3>
              <p>
                {isCompleted
                  ? '本次评估已完成，基础报告正在整理中，稍后会直接显示在这里并自动汇总到报告中心。'
                  : '完成拍摄和分析后，这里会直接显示基础报告。'}
              </p>
            </div>
          )}
        </section>
      ) : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <Vision3Dashboard
            activeTab={activeTab}
            result={result}
            showHeadAxes={showHeadAxes}
            setShowHeadAxes={setShowHeadAxes}
            axesScale={axesScale}
            setAxesScale={setAxesScale}
            getShoulderStatus={getShoulderStatus}
            getHeadStatus={getHeadStatus}
            getHipStatus={getHipStatus}
            getSeverityLabel={getSeverityLabel}
            focusTarget={focusTarget}
            onNavigateToReport={(target) => onNavigate?.('report', target)}
          />
        </div>
      )}
    </div>
  );
};
