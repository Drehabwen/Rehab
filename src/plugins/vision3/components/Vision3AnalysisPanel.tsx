import React, { useEffect, useRef } from 'react';
import {
  Activity,
  FileText,
  Layers,
  Loader2,
  Sparkles,
  TriangleAlert,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { Vision3Dashboard } from './Vision3Dashboard';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { AssessmentType } from '../store/usePostureAssessmentStore';
import { ASSESSMENT_TEXTS, PANEL_TEXTS } from '../constants/uiText';
import { ANIMATIONS } from '@/constants/uiStyles';

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
  isLoadingDeepReport?: boolean;
  onRequestDeepAnalysis?: () => void;
  focusTarget?: WorkspaceFocusTarget;
  onNavigate?: (panel: 'dashboard' | 'report', target: WorkspaceFocusTarget) => void;
}

const panelButtonClass = (active: boolean, tone: 'blue' | 'violet') => {
  if (!active) {
    return 'h-9 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900';
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
      return 'border-slate-200 bg-slate-50 text-slate-600';
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
  isLoadingDeepReport,
  onRequestDeepAnalysis,
  focusTarget,
  onNavigate,
}) => {
  const isCompleted = captureStatus === 'completed';
  const hasAuxiliaryReport = Boolean(auxiliaryDiagnosis);
  const hasDeepReport = Boolean(markdownReport || streamingReport);
  const hasAnyReport = hasAuxiliaryReport || hasDeepReport;
  const canRequestDeepReport = isCompleted && !hasDeepReport && Boolean(onRequestDeepAnalysis);
  const issueCount = result?.issues.length ?? 0;
  const deepReportContent = isStreamingReport ? streamingReport || '' : markdownReport || '';
  const reportIntro = hasDeepReport
    ? '\u62a5\u544a\u4e2d\u5fc3\u4ee5\u7ed3\u8bba\u3001\u98ce\u9669\u89e3\u8bfb\u548c\u4e0b\u4e00\u6b65\u64cd\u4f5c\u4e3a\u4e3b\uff0c\u6570\u636e\u8bc1\u636e\u8bf7\u8f6c\u5165\u6570\u636e\u4e2d\u5fc3\u67e5\u770b\u3002'
    : hasAuxiliaryReport
      ? '\u57fa\u7840\u62a5\u544a\u5df2\u5230\u4f4d\uff0c\u53ef\u5148\u9605\u8bfb\u7ed3\u8bba\uff0c\u518d\u6309\u9700\u8865\u5145\u6df1\u5ea6\u5206\u6790\u3002'
      : '\u62a5\u544a\u4e2d\u5fc3\u4f1a\u5728\u5b8c\u6210\u62cd\u6444\u540e\u627f\u63a5\u7ed3\u8bba\u9605\u8bfb\u4e0e\u52a8\u4f5c\u5efa\u8bae\u3002';
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
    <div className="flex h-full flex-col gap-4 rounded-[2rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm lg:p-6">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 rounded-[1.4rem] bg-white/90 px-1 pb-1 backdrop-blur-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('status-badge h-7 px-3 text-xs', assessmentBadgeClass(assessmentType))}>
            {assessmentType === 'quick' ? <Zap size={14} /> : <Layers size={14} />}
            {assessmentType === 'quick' ? ASSESSMENT_TEXTS.quick.label : ASSESSMENT_TEXTS.standard.label}
          </span>
          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(activePanel === 'report' ? 'violet' : 'blue'))}>
            {activePanel === 'report' ? '\u62a5\u544a\u4e2d\u5fc3' : '\u6570\u636e\u4e2d\u5fc3'}
          </span>
        </div>

        <div className="flex items-center rounded-xl border border-slate-300 bg-white p-1 shadow-sm">
          <button type="button" onClick={() => setActivePanel('dashboard')} className={panelButtonClass(activePanel === 'dashboard', 'blue')}>
            {PANEL_TEXTS.dataPanel}
          </button>
          <button type="button" onClick={() => setActivePanel('report')} className={panelButtonClass(activePanel === 'report', 'violet')}>
            {PANEL_TEXTS.aiReport}
          </button>
        </div>
      </div>

      {activePanel === 'report' ? (
        <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(250,250,255,0.98),rgba(255,255,255,1))] p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Report Center</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">{'\u7ed3\u8bba\u4e0e\u52a8\u4f5c'}</h3>
              <p className="mt-1 text-sm text-slate-500">{reportIntro}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {result ? (
                <button
                  type="button"
                  className="btn-secondary h-9 px-3"
                  onClick={() => onNavigate?.('dashboard', 'data-metrics')}
                >
                  <Activity size={14} />
                  {'\u67e5\u770b\u6570\u636e\u8bc1\u636e'}
                </button>
              ) : null}
              {canRequestDeepReport ? (
                <button
                  type="button"
                  onClick={() => onRequestDeepAnalysis?.()}
                  disabled={isLoadingDeepReport}
                  className="btn-primary h-9 whitespace-nowrap px-3"
                >
                  {isLoadingDeepReport ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      {'\u751f\u6210\u4e2d...'}
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      {PANEL_TEXTS.deepAnalysis}
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(hasAuxiliaryReport ? 'cyan' : 'slate'))}>
              {'\u57fa\u7840\u62a5\u544a'}
              {hasAuxiliaryReport ? '\u00b7\u5df2\u751f\u6210' : '\u00b7\u5f85\u751f\u6210'}
            </span>
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(hasDeepReport ? 'violet' : 'slate'))}>
              {'\u6df1\u5ea6\u62a5\u544a'}
              {hasDeepReport ? '\u00b7\u5df2\u751f\u6210' : canRequestDeepReport ? '\u00b7\u53ef\u53d1\u8d77' : '\u00b7\u672a\u5c31\u7eea'}
            </span>
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(issueCount > 0 ? 'amber' : 'blue'))}>
              {`\u98ce\u9669\u89e3\u8bfb\u00b7${issueCount}`}
            </span>
            {hasAuxiliaryReport ? (
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-50"
                onClick={() => onNavigate?.('report', 'report-basic')}
              >
                {'\u5b9a\u4f4d\u57fa\u7840\u62a5\u544a'}
              </button>
            ) : null}
            {hasDeepReport || canRequestDeepReport ? (
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-50"
                onClick={() => onNavigate?.('report', 'report-deep')}
              >
                {'\u5b9a\u4f4d\u6df1\u5ea6\u62a5\u544a'}
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.98),rgba(255,255,255,1))] p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Data Center</p>
              <h3 className="mt-1 text-xl font-semibold text-slate-900">{'\u8bc1\u636e\u4e0e\u8ffd\u6eaf'}</h3>
              <p className="mt-1 text-sm text-slate-500">{dataIntro}</p>
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
              className="inline-flex items-center rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50"
              onClick={() => onNavigate?.('dashboard', 'data-metrics')}
            >
              {'\u8df3\u5230\u6307\u6807'}
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50"
              onClick={() => onNavigate?.('dashboard', 'data-issues')}
            >
              {'\u8df3\u5230\u98ce\u9669'}
            </button>
            <button
              type="button"
              className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              onClick={() => onNavigate?.('dashboard', 'data-head')}
            >
              {'\u8df3\u5230 3D \u4f4d\u59ff'}
            </button>
          </div>
        </section>
      )}

      <div className="min-h-0 flex-1 overflow-hidden">
        {activePanel === 'report' ? (
          <div className={cn('h-full overflow-y-auto custom-scrollbar space-y-4 pr-1', ANIMATIONS.fadeIn)}>
            {hasAnyReport || isLoadingDeepReport ? (
              <div className={cn('grid gap-4', hasAuxiliaryReport && (hasDeepReport || isLoadingDeepReport) ? 'xl:grid-cols-[0.92fr_1.08fr]' : 'grid-cols-1')}>
                {hasAuxiliaryReport ? (
                  <section ref={basicReportRef} className="rounded-[26px] border border-cyan-100 bg-gradient-to-b from-cyan-50/70 to-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700 ring-1 ring-cyan-100">
                          <Zap size={12} />
                          {'\u5feb\u901f\u7ed3\u8bba'}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">{PANEL_TEXTS.auxiliaryDiagnosis}</h3>
                        <p className="mt-1 text-sm text-slate-500">{'\u9762\u5411\u7b5b\u67e5\u548c\u521d\u6b65\u5224\u65ad\u7684\u57fa\u7840\u7ed3\u8bba\uff0c\u53ef\u5148\u7528\u4e8e\u5feb\u901f\u8bfb\u53d6\u5f53\u524d\u98ce\u9669\u3002'}</p>
                      </div>

                      <button
                        type="button"
                        className="btn-secondary h-8 px-3"
                        onClick={() => onNavigate?.('dashboard', 'data-metrics')}
                      >
                        <Activity size={14} />
                        {'\u8bc1\u636e'}
                      </button>
                    </div>

                    <div className="mt-4">
                      <MarkdownReport
                        content={auxiliaryDiagnosis || ''}
                        loading={false}
                        animate={false}
                        showChrome={false}
                        tone="cyan"
                        className="min-h-[260px] bg-white/90 sm:min-h-[300px]"
                      />
                    </div>
                  </section>
                ) : null}

                {hasDeepReport || isLoadingDeepReport ? (
                  <section ref={deepReportRef} className="rounded-[26px] border border-violet-100 bg-gradient-to-b from-violet-50/70 to-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700 ring-1 ring-violet-100">
                          <Sparkles size={12} />
                          {'AI Insight'}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">{PANEL_TEXTS.deepAnalysis}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {hasDeepReport ? '\u8fd9\u4e00\u533a\u57df\u4e13\u6ce8\u4e8e\u7ed3\u8bba\u89e3\u91ca\u3001\u98ce\u9669\u62c6\u89e3\u548c\u5efa\u8bae\u52a8\u4f5c\uff0c\u5bf9\u5e94\u6570\u636e\u8bc1\u636e\u8bf7\u8df3\u8f6c\u5230\u6570\u636e\u4e2d\u5fc3\u3002' : '\u6df1\u5ea6\u5206\u6790\u6b63\u5728\u751f\u6210\uff0c\u751f\u6210\u671f\u95f4\u53ef\u5148\u9605\u8bfb\u57fa\u7840\u62a5\u544a\u3002'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {!hasDeepReport && onRequestDeepAnalysis && !isLoadingDeepReport ? (
                          <button
                            type="button"
                            className="btn-primary h-9 px-3"
                            onClick={() => onRequestDeepAnalysis()}
                          >
                            <Sparkles size={14} />
                            {PANEL_TEXTS.deepAnalysis}
                          </button>
                        ) : (
                          <span className={cn('status-badge h-7 px-3', hasDeepReport ? 'status-success' : 'status-processing')}>
                            {hasDeepReport ? '\u5df2\u751f\u6210' : '\u751f\u6210\u4e2d'}
                          </span>
                        )}
                        <button
                          type="button"
                          className="btn-secondary h-8 px-3"
                          onClick={() => onNavigate?.('dashboard', issueCount > 0 ? 'data-issues' : 'data-metrics')}
                        >
                          <TriangleAlert size={14} />
                          {'\u67e5\u770b\u8bc1\u636e'}
                        </button>
                      </div>
                    </div>

                    {(isStreamingReport || isLoadingDeepReport) && !markdownReport ? (
                      <div className="mt-4 rounded-2xl border border-violet-100 bg-white/80 p-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-violet-700">
                          <Loader2 size={14} className="animate-spin" />
                          {'\u6b63\u5728\u8f93\u51fa\u6df1\u5ea6\u5206\u6790'}
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-100">
                          <div className="h-full w-1/3 animate-pulse rounded-full bg-violet-500" />
                        </div>
                        <p className="mt-3 text-xs text-slate-500">{'\u6df1\u5ea6\u62a5\u544a\u4f1a\u6301\u7eed\u8865\u5168\uff0c\u5173\u952e\u6307\u6807\u53ef\u5148\u5728\u6570\u636e\u4e2d\u5fc3\u67e5\u770b\u3002'}</p>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <MarkdownReport
                        content={deepReportContent}
                        loading={Boolean(isLoadingDeepReport && !deepReportContent)}
                        animate={!isStreamingReport}
                        showChrome={false}
                        tone="violet"
                        className="min-h-[260px] bg-white/90 sm:min-h-[300px]"
                        emptyTitle={'\u6682\u65e0\u6df1\u5ea6\u62a5\u544a'}
                        emptyDescription={'\u53ef\u5728\u8bc4\u4f30\u5b8c\u6210\u540e\u53d1\u8d77 AI \u6df1\u5ea6\u5206\u6790\u3002'}
                      />
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <div className="state-panel flex min-h-[360px] flex-col items-center justify-center gap-3">
                <FileText className="h-10 w-10 text-slate-400" />
                <h3>{'\u6682\u65e0\u62a5\u544a'}</h3>
                <p>{'\u5b8c\u6210\u62cd\u6444\u540e\u4f1a\u81ea\u52a8\u751f\u6210\u57fa\u7840\u62a5\u544a\uff0c\u4f60\u4e5f\u53ef\u4ee5\u5728\u5b8c\u6210\u540e\u53d1\u8d77\u6df1\u5ea6\u5206\u6790\u3002'}</p>
                {isCompleted && onRequestDeepAnalysis ? (
                  <button
                    type="button"
                    className="btn-secondary mt-2"
                    onClick={() => onRequestDeepAnalysis()}
                    disabled={isLoadingDeepReport}
                  >
                    <Sparkles size={14} />
                    {'\u751f\u6210\u6df1\u5ea6\u5206\u6790'}
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className={cn('h-full', ANIMATIONS.fadeIn)}>
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
    </div>
  );
};
