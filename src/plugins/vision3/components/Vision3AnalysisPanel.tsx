import React, { useEffect, useRef } from 'react';
import {
  FileText,
  Layers,
  Sparkles,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { Vision3Dashboard } from './Vision3Dashboard';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { COLORS } from '@/constants/uiStyles';
import { AssessmentType } from '../store/usePostureAssessmentStore';
import { ASSESSMENT_TEXTS, PANEL_TEXTS } from '../constants/uiText';
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
    return cn('h-9 rounded-lg px-3 text-sm font-medium transition-colors', COLORS.neutral.slate600, COLORS.neutral.light.hover, COLORS.neutral.light.hoverText);
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

const centerChipClass = (tone: 'slate' | 'cyan' | 'violet' | 'amber' | 'blue') => {
  switch (tone) {
    case 'cyan':
      return 'border-cyan-200 bg-cyan-50 text-cyan-700';
    case 'violet':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'amber':
      return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'blue':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    default:
      return cn(COLORS.neutral.light.border, COLORS.neutral.light.bgSoft, COLORS.neutral.slate600);
  }
};

const panelShellClass = cn('flex h-full flex-col gap-4 rounded-[2rem] border p-4 shadow-sm backdrop-blur-sm lg:p-6', COLORS.neutral.light.borderSubtle, COLORS.neutral.whiteBg95);
const stickyHeaderClass = cn('sticky top-0 z-10 -mx-1 flex flex-col gap-3 rounded-[1.4rem] px-1 pb-1 backdrop-blur-sm xl:flex-row xl:items-center xl:justify-between', COLORS.neutral.whiteBg90);
const headerToggleClass = cn('flex items-center rounded-xl border p-1 shadow-sm', COLORS.neutral.light.borderStrong, COLORS.neutral.light.bg);
const sectionShellClass = cn('rounded-[28px] border p-4 shadow-sm', COLORS.neutral.light.border);
const titleClass = cn('mt-1 text-xl font-semibold', COLORS.neutral.light.text);
const subtitleClass = cn('mt-1 text-sm', COLORS.neutral.slate500);
const eyebrowClass = cn('text-[11px] font-semibold uppercase tracking-[0.22em]', COLORS.neutral.light.textLight);
const markdownSurfaceClass = cn('min-h-[300px] sm:min-h-[340px]', COLORS.neutral.whiteBg90);
const emptyStateIconClass = cn('h-10 w-10', COLORS.neutral.light.textLight);
const reportSyncBadgeClass = (tone: 'cyan' | 'violet') =>
  cn(
    'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ring-1',
    COLORS.neutral.whiteBg80,
    tone === 'cyan' ? 'text-cyan-700 ring-cyan-100' : 'text-violet-700 ring-violet-100',
  );
const quickJumpButtonClass = (tone: 'cyan' | 'violet' | 'blue' | 'amber' | 'slate') => {
  const base = 'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors';
  switch (tone) {
    case 'cyan':
      return `${base} border-cyan-200 ${COLORS.neutral.light.bg} text-cyan-700 hover:bg-cyan-50`;
    case 'violet':
      return `${base} border-violet-200 ${COLORS.neutral.light.bg} text-violet-700 hover:bg-violet-50`;
    case 'blue':
      return `${base} border-blue-200 ${COLORS.neutral.light.bg} text-blue-700 hover:bg-blue-50`;
    case 'amber':
      return `${base} border-amber-200 ${COLORS.neutral.light.bg} text-amber-700 hover:bg-amber-50`;
    default:
      return `${base} ${COLORS.neutral.light.border} ${COLORS.neutral.light.bg} ${COLORS.neutral.slate600} ${COLORS.neutral.light.hover}`;
  }
};

export const Vision3AnalysisPanel: React.FC<Vision3AnalysisPanelProps> = ({
  activePanel,
  setActivePanel,
  captureStatus,
  markdownReport,
  streamingReport,
  isStreamingReport,
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
  const hasAuxiliaryReport = Boolean(auxiliaryDiagnosis);
  const hasDeepReport = Boolean(markdownReport || streamingReport);
  const hasAnyReport = hasAuxiliaryReport || hasDeepReport;
  const issueCount = result?.issues.length ?? 0;
  const deepReportContent = isStreamingReport ? streamingReport || '' : markdownReport || '';
  const immediateBasicReport = !hasAuxiliaryReport
    ? buildImmediateBasicReport({
        metrics: result?.metrics,
        issues: result?.issues,
      })
    : null;
  const basicReportContent = auxiliaryDiagnosis || immediateBasicReport || null;
  const hasBasicReportContent = Boolean(basicReportContent);
  const reportIntro = hasDeepReport
    ? '\u62a5\u544a\u4e2d\u5fc3\u53ea\u7528\u4e8e\u9605\u8bfb\u672c\u6b21\u4f53\u6001\u8bc4\u4f30\u7684\u57fa\u7840\u7ed3\u8bba\u548c\u6269\u5c55\u62a5\u544a\uff0c\u6570\u636e\u8bc1\u636e\u8bf7\u5355\u72ec\u5230\u6570\u636e\u4e2d\u5fc3\u67e5\u770b\u3002'
    : hasAuxiliaryReport
      ? '\u57fa\u7840\u62a5\u544a\u5df2\u5230\u4f4d\uff0c\u8fd9\u91cc\u53ea\u4fdd\u7559\u62a5\u544a\u9605\u8bfb\uff0c\u4e0d\u518d\u6df7\u5165\u6570\u636e\u4e2d\u5fc3\u7684\u8bc1\u636e\u5757\u3002'
      : immediateBasicReport
        ? '\u5f53\u524d\u5148\u5c55\u793a\u5373\u65f6\u57fa\u7840\u7ed3\u8bba\uff0c\u540e\u7eed\u5982\u6709\u62a5\u544a\u6269\u5c55\u4e5f\u53ea\u5728\u672c\u533a\u9605\u8bfb\u3002'
        : '\u5b8c\u6210\u62cd\u6444\u540e\uff0c\u8fd9\u91cc\u4f1a\u7acb\u5373\u627f\u63a5\u672c\u6b21\u4f53\u6001\u57fa\u7840\u62a5\u544a\u4e0e\u672c\u5730\u7ed3\u8bba\u3002';
  const dataIntro = result
    ? '\u6570\u636e\u4e2d\u5fc3\u7528\u4e8e\u67e5\u770b\u6307\u6807\u3001\u5f02\u5e38\u8bc1\u636e\u3001\u5934\u90e8\u4f4d\u59ff\u548c\u98ce\u9669\u6765\u6e90\uff0c\u652f\u6491\u62a5\u544a\u7ed3\u8bba\u3002'
    : '\u6570\u636e\u4e2d\u5fc3\u4f1a\u5728\u6709\u6548\u7ed3\u679c\u56de\u4f20\u540e\u663e\u793a\u91cf\u5316\u8bc1\u636e\u548c\u5206\u6790\u652f\u6491\u3002';
  const basicReportRef = useRef<HTMLElement | null>(null);
  const deepReportRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (activePanel !== 'report') {
      return;
    }

    if (focusTarget === 'report-basic') {
      basicReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (focusTarget === 'report-deep') {
      deepReportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [activePanel, focusTarget]);

  return (
    <div className={panelShellClass}>
      <div className={stickyHeaderClass}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('status-badge h-7 px-3 text-xs', assessmentBadgeClass(assessmentType))}>
            {assessmentType === 'quick' ? <Zap size={14} /> : <Layers size={14} />}
            {assessmentType === 'quick' ? ASSESSMENT_TEXTS.quick.label : ASSESSMENT_TEXTS.standard.label}
          </span>
          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(activePanel === 'report' ? 'violet' : 'blue'))}>
            {activePanel === 'report' ? '\u8bc4\u4f30\u62a5\u544a' : '\u6570\u636e\u4e2d\u5fc3'}
          </span>
        </div>

        <div className={headerToggleClass}>
          <button type="button" onClick={() => setActivePanel('dashboard')} className={panelButtonClass(activePanel === 'dashboard', 'blue')}>
            {PANEL_TEXTS.dataPanel}
          </button>
          <button type="button" onClick={() => setActivePanel('report')} className={panelButtonClass(activePanel === 'report', 'violet')}>
            {'\u8bc4\u4f30\u62a5\u544a'}
          </button>
        </div>
      </div>

      {activePanel === 'report' ? (
        <section className={cn(sectionShellClass, 'bg-[linear-gradient(135deg,rgba(250,250,255,0.98),rgba(255,255,255,1))]')}>
          <div>
            <div>
              <p className={eyebrowClass}>Assessment Report</p>
              <h3 className={titleClass}>{'\u62a5\u544a\u9605\u8bfb\u4e2d\u5fc3'}</h3>
              <p className={subtitleClass}>{reportIntro}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(hasBasicReportContent ? 'cyan' : 'slate'))}>
              {'\u57fa\u7840\u62a5\u544a'}
              {hasAuxiliaryReport ? '\u00b7\u5df2\u751f\u6210' : immediateBasicReport ? '\u00b7\u5373\u65f6\u7ed3\u8bba' : '\u00b7\u5f85\u751f\u6210'}
            </span>
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(hasDeepReport ? 'violet' : 'slate'))}>
              {'\u62a5\u544a\u6269\u5c55'}
              {hasDeepReport ? '\u00b7\u5df2\u540c\u6b65' : '\u00b7\u7531\u5168\u5c40\u62a5\u544a\u4e2d\u5fc3\u7edf\u4e00\u751f\u6210'}
            </span>
            {hasBasicReportContent ? (
              <button
                type="button"
                className={quickJumpButtonClass('cyan')}
                onClick={() => onNavigate?.('report', 'report-basic')}
              >
                {'\u5b9a\u4f4d\u57fa\u7840\u62a5\u544a'}
              </button>
            ) : null}
            {hasDeepReport ? (
              <button
                type="button"
                className={quickJumpButtonClass('violet')}
                onClick={() => onNavigate?.('report', 'report-deep')}
              >
                {'\u5b9a\u4f4d\u62a5\u544a\u6269\u5c55'}
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className={cn(sectionShellClass, 'bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,255,255,1))]')}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className={eyebrowClass}>Data Center</p>
              <h3 className={titleClass}>{'\u8bc1\u636e\u4e0e\u8ffd\u6eaf'}</h3>
              <p className={subtitleClass}>{dataIntro}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {hasAnyReport ? (
                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  onClick={() => onNavigate?.('report', hasDeepReport ? 'report-deep' : 'report-basic')}
                >
                  <FileText size={14} />
                  {'\u8fd4\u56de\u62a5\u544a\u7ed3\u8bba'}
                </button>
              ) : null}
              {issueCount > 0 ? (
                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  onClick={() => onNavigate?.('dashboard', 'data-issues')}
                >
                  <TriangleAlert size={14} />
                  {'\u5b9a\u4f4d\u98ce\u9669\u9879'}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass('blue'))}>
              {'\u91cf\u5316\u6307\u6807'}
            </span>
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass('amber'))}>
              {'\u98ce\u9669\u8bc1\u636e'}
            </span>
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass('slate'))}>
              {'3D \u4f4d\u59ff'}
            </span>
            <button
              type="button"
              className={quickJumpButtonClass('blue')}
              onClick={() => onNavigate?.('dashboard', 'data-metrics')}
            >
              {'\u8df3\u5230\u6307\u6807'}
            </button>
            <button
              type="button"
              className={quickJumpButtonClass('amber')}
              onClick={() => onNavigate?.('dashboard', 'data-issues')}
            >
              {'\u8df3\u5230\u98ce\u9669'}
            </button>
            <button
              type="button"
              className={quickJumpButtonClass('slate')}
              onClick={() => onNavigate?.('dashboard', 'data-head')}
            >
              {'\u8df3\u5230 3D \u4f4d\u59ff'}
            </button>
          </div>
        </section>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={cn('h-full overflow-y-auto custom-scrollbar space-y-4 pr-1', activePanel !== 'report' && 'hidden')}>
            {hasAnyReport ? (
              <div className="space-y-4">
                <div className={cn('grid gap-4', hasBasicReportContent && hasDeepReport ? 'xl:grid-cols-[1fr_1fr]' : 'grid-cols-1')}>
                  {hasBasicReportContent ? (
                  <section ref={basicReportRef} className="rounded-[26px] border border-cyan-100 bg-gradient-to-b from-cyan-50/70 to-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={reportSyncBadgeClass('cyan')}>
                          <Zap size={12} />
                          {hasAuxiliaryReport ? '\u5feb\u901f\u7ed3\u8bba' : '\u5373\u65f6\u7ed3\u8bba'}
                        </div>
                        <h3 className={cn('mt-3 text-lg font-semibold', COLORS.neutral.light.text)}>{PANEL_TEXTS.auxiliaryDiagnosis}</h3>
                        <p className={cn('mt-1 text-sm', COLORS.neutral.slate500)}>
                          {hasAuxiliaryReport
                            ? '\u9762\u5411\u7b5b\u67e5\u548c\u521d\u6b65\u5224\u65ad\u7684\u57fa\u7840\u7ed3\u8bba\uff0c\u53ef\u5148\u7528\u4e8e\u5feb\u901f\u8bfb\u53d6\u5f53\u524d\u98ce\u9669\u3002'
                            : '\u8fd9\u662f\u5b8c\u6210\u8bc4\u4f30\u540e\u7acb\u5373\u751f\u6210\u7684\u672c\u5730\u7ed3\u8bba\uff0c\u7528\u6765\u907f\u514d\u62a5\u544a\u672a\u843d\u4f4d\u65f6\u53f3\u4fa7\u51fa\u73b0\u7a7a\u767d\u3002'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <MarkdownReport
                        content={basicReportContent}
                        loading={false}
                        animate={false}
                        showChrome={false}
                        tone="cyan"
                        className={markdownSurfaceClass}
                      />
                    </div>
                  </section>
                ) : null}

                  {hasDeepReport ? (
                    <section ref={deepReportRef} className="rounded-[26px] border border-violet-100 bg-gradient-to-b from-violet-50/70 to-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={reportSyncBadgeClass('violet')}>
                          <Sparkles size={12} />
                          {'Report Sync'}
                        </div>
                        <h3 className={cn('mt-3 text-lg font-semibold', COLORS.neutral.light.text)}>{'\u62a5\u544a\u6269\u5c55\u5185\u5bb9'}</h3>
                        <p className={cn('mt-1 text-sm', COLORS.neutral.slate500)}>
                          {'\u5982\u679c\u5168\u5c40\u62a5\u544a\u4e2d\u5fc3\u5df2\u540c\u6b65\u56de\u4f20\u62a5\u544a\u6269\u5c55\u5185\u5bb9\uff0c\u4f1a\u5728\u8fd9\u91cc\u4e0e\u672c\u5730\u4f53\u6001\u57fa\u7840\u62a5\u544a\u4e00\u8d77\u9605\u8bfb\u3002'}
                        </p>
                      </div>

                      <span className={cn('status-badge h-7 px-3', hasDeepReport ? 'status-success' : 'status-processing')}>
                        {hasDeepReport ? '\u5df2\u540c\u6b65' : '\u5f85\u62a5\u544a\u4e2d\u5fc3'}
                      </span>
                    </div>

                    <div className="mt-4">
                      <MarkdownReport
                        content={deepReportContent}
                        loading={false}
                        animate={Boolean(isStreamingReport)}
                        showChrome={false}
                        tone="violet"
                        className={markdownSurfaceClass}
                        emptyTitle={'\u6682\u65e0\u62a5\u544a\u6269\u5c55\u5185\u5bb9'}
                        emptyDescription={'\u8fd9\u4e00\u533a\u57df\u4f1a\u5728\u5168\u5c40\u62a5\u544a\u4e2d\u5fc3\u540c\u6b65\u56de\u4f20\u540e\u663e\u793a\u6269\u5c55\u62a5\u544a\u5185\u5bb9\u3002'}
                      />
                    </div>
                    </section>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="state-panel flex min-h-[360px] flex-col items-center justify-center gap-3">
                <FileText className={emptyStateIconClass} />
                <h3>{'\u6682\u65e0\u62a5\u544a'}</h3>
                <p>{isCompleted ? '\u5b8c\u6210\u62cd\u6444\u540e\u4f1a\u81ea\u52a8\u751f\u6210\u672c\u6b21\u4f53\u6001\u57fa\u7840\u62a5\u544a\uff0c\u7efc\u5408 LLM \u62a5\u544a\u5219\u7531\u5168\u5c40\u62a5\u544a\u4e2d\u5fc3\u7edf\u4e00\u751f\u6210\u3002' : '\u62cd\u6444\u5b8c\u6210\u540e\u8fd9\u91cc\u4f1a\u627f\u63a5\u672c\u6b21\u4f53\u6001\u8bc4\u4f30\u7684\u57fa\u7840\u62a5\u544a\u3002'}</p>
              </div>
            )}
        </div>

        <div className={cn('h-full', activePanel !== 'dashboard' && 'hidden')}>
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
      </div>
    </div>
  );
};
