import React, { useEffect, useRef } from 'react';
import {
  Activity,
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
import { AssessmentType } from '../store/usePostureAssessmentStore';
import { ASSESSMENT_TEXTS, PANEL_TEXTS } from '../constants/uiText';
import { buildImmediateBasicReport, buildReportInsightCards } from '../report-insights';

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
  const insightCards = buildReportInsightCards({
    metrics: result?.metrics,
    issues: result?.issues,
    auxiliaryDiagnosis,
    markdownReport: deepReportContent || markdownReport,
  });
  const reportIntro = hasDeepReport
    ? '\u8fd9\u91cc\u627f\u63a5\u672c\u6b21\u4f53\u6001\u8bc4\u4f30\u7684\u62a5\u544a\u9605\u8bfb\u4e0e\u7ed3\u8bba\u68b3\u7406\uff0c\u5bf9\u5e94\u6570\u636e\u8bc1\u636e\u8bf7\u8f6c\u5165\u6570\u636e\u4e2d\u5fc3\u67e5\u770b\u3002'
    : hasAuxiliaryReport
      ? '\u57fa\u7840\u62a5\u544a\u5df2\u5230\u4f4d\uff0c\u53ef\u5148\u9605\u8bfb\u672c\u6b21\u4f53\u6001\u7ed3\u8bba\uff1b\u7efc\u5408 LLM \u62a5\u544a\u5c06\u5728\u5168\u5c40\u62a5\u544a\u4e2d\u5fc3\u7edf\u4e00\u751f\u6210\u3002'
      : immediateBasicReport
        ? '\u540e\u7aef\u57fa\u7840\u62a5\u544a\u6b63\u5728\u843d\u4f4d\uff0c\u76ee\u524d\u5148\u6839\u636e\u5df2\u56de\u4f20\u6307\u6807\u4e0e\u95ee\u9898\u751f\u6210\u4e00\u4efd\u5373\u65f6\u7ed3\u8bba\uff0c\u4fdd\u8bc1\u5b8c\u6210\u540e\u5c31\u80fd\u8bfb\u3002'
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
    <div className="flex h-full flex-col gap-4 rounded-[2rem] border border-slate-200/80 bg-white/95 p-4 shadow-sm backdrop-blur-sm lg:p-6">
      <div className="sticky top-0 z-10 -mx-1 flex flex-col gap-3 rounded-[1.4rem] bg-white/90 px-1 pb-1 backdrop-blur-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('status-badge h-7 px-3 text-xs', assessmentBadgeClass(assessmentType))}>
            {assessmentType === 'quick' ? <Zap size={14} /> : <Layers size={14} />}
            {assessmentType === 'quick' ? ASSESSMENT_TEXTS.quick.label : ASSESSMENT_TEXTS.standard.label}
          </span>
          <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(activePanel === 'report' ? 'violet' : 'blue'))}>
            {activePanel === 'report' ? '\u8bc4\u4f30\u62a5\u544a' : '\u6570\u636e\u4e2d\u5fc3'}
          </span>
        </div>

        <div className="flex items-center rounded-xl border border-slate-300 bg-white p-1 shadow-sm">
          <button type="button" onClick={() => setActivePanel('dashboard')} className={panelButtonClass(activePanel === 'dashboard', 'blue')}>
            {PANEL_TEXTS.dataPanel}
          </button>
          <button type="button" onClick={() => setActivePanel('report')} className={panelButtonClass(activePanel === 'report', 'violet')}>
            {'\u8bc4\u4f30\u62a5\u544a'}
          </button>
        </div>
      </div>

      {activePanel === 'report' ? (
        <section className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,rgba(250,250,255,0.98),rgba(255,255,255,1))] p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Assessment Report</p>
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
            <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium', centerChipClass(issueCount > 0 ? 'amber' : 'blue'))}>
              {`\u98ce\u9669\u89e3\u8bfb\u00b7${issueCount}`}
            </span>
            {hasBasicReportContent ? (
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-cyan-200 bg-white px-3 py-1 text-xs font-medium text-cyan-700 transition-colors hover:bg-cyan-50"
                onClick={() => onNavigate?.('report', 'report-basic')}
              >
                {'\u5b9a\u4f4d\u57fa\u7840\u62a5\u544a'}
              </button>
            ) : null}
            {hasDeepReport ? (
              <button
                type="button"
                className="inline-flex items-center rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-50"
                onClick={() => onNavigate?.('report', 'report-deep')}
              >
                {'\u5b9a\u4f4d\u62a5\u544a\u6269\u5c55'}
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
        <div className={cn('h-full overflow-y-auto custom-scrollbar space-y-4 pr-1', activePanel !== 'report' && 'hidden')}>
            {hasAnyReport ? (
              <div className="space-y-4">
                {insightCards.length > 0 ? (
                  <section className="rounded-[26px] border border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.96),rgba(255,255,255,1))] p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-700 ring-1 ring-slate-200">
                          <Sparkles size={12} />
                          {'\u6d1e\u5bdf\u5efa\u8bae\u5361'}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">{'\u57fa\u4e8e\u5df2\u63a5\u6536\u62a5\u544a\u4fe1\u606f\u7684\u53ef\u89c6\u5efa\u8bae'}</h3>
                        <p className="mt-1 text-sm text-slate-500">{'\u8fd9\u91cc\u7684\u5efa\u8bae\u57fa\u4e8e\u672c\u6b21\u4f53\u6001\u8bc4\u4f30\u5df2\u63a5\u6536\u7684\u62a5\u544a\u3001\u95ee\u9898\u5217\u8868\u548c\u91cf\u5316\u6307\u6807\u63d0\u70bc\u800c\u6210\uff0c\u4e0d\u7b49\u540c\u4e8e\u5168\u5c40\u62a5\u544a\u4e2d\u5fc3\u7684\u7efc\u5408 LLM \u62a5\u544a\u3002'}</p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary h-9 px-3"
                        onClick={() => onNavigate?.('dashboard', issueCount > 0 ? 'data-issues' : 'data-metrics')}
                      >
                        <Activity size={14} />
                        {'\u5bf9\u7167\u6570\u636e\u8bc1\u636e'}
                      </button>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-3">
                      {insightCards.map((card) => (
                        <article
                          key={card.id}
                          className={cn(
                            'rounded-[22px] border bg-white/92 p-4 shadow-sm',
                            card.tone === 'violet' && 'border-violet-100',
                            card.tone === 'amber' && 'border-amber-100',
                            card.tone === 'blue' && 'border-blue-100',
                          )}
                        >
                          <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', centerChipClass(card.tone))}>
                            {card.eyebrow}
                          </span>
                          <h4 className="mt-3 text-base font-semibold text-slate-900">{card.title}</h4>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{card.summary}</p>

                          <div className="mt-4 rounded-2xl bg-slate-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{'\u6839\u636e'}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {card.evidence.map((item) => (
                                <span key={item} className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{'\u5efa\u8bae\u52a8\u4f5c'}</p>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{card.action}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null}

                <div className={cn('grid gap-4', hasBasicReportContent && hasDeepReport ? 'xl:grid-cols-[1fr_1fr]' : 'grid-cols-1')}>
                  {hasBasicReportContent ? (
                  <section ref={basicReportRef} className="rounded-[26px] border border-cyan-100 bg-gradient-to-b from-cyan-50/70 to-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-700 ring-1 ring-cyan-100">
                          <Zap size={12} />
                          {hasAuxiliaryReport ? '\u5feb\u901f\u7ed3\u8bba' : '\u5373\u65f6\u7ed3\u8bba'}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">{PANEL_TEXTS.auxiliaryDiagnosis}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {hasAuxiliaryReport
                            ? '\u9762\u5411\u7b5b\u67e5\u548c\u521d\u6b65\u5224\u65ad\u7684\u57fa\u7840\u7ed3\u8bba\uff0c\u53ef\u5148\u7528\u4e8e\u5feb\u901f\u8bfb\u53d6\u5f53\u524d\u98ce\u9669\u3002'
                            : '\u8fd9\u662f\u5b8c\u6210\u8bc4\u4f30\u540e\u7acb\u5373\u751f\u6210\u7684\u672c\u5730\u7ed3\u8bba\uff0c\u7528\u6765\u907f\u514d\u62a5\u544a\u672a\u843d\u4f4d\u65f6\u53f3\u4fa7\u51fa\u73b0\u7a7a\u767d\u3002'}
                        </p>
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
                        content={basicReportContent}
                        loading={false}
                        animate={false}
                        showChrome={false}
                        tone="cyan"
                        className="min-h-[300px] bg-white/90 sm:min-h-[340px]"
                      />
                    </div>
                  </section>
                ) : null}

                  {hasDeepReport ? (
                    <section ref={deepReportRef} className="rounded-[26px] border border-violet-100 bg-gradient-to-b from-violet-50/70 to-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700 ring-1 ring-violet-100">
                          <Sparkles size={12} />
                          {'Report Sync'}
                        </div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-900">{'\u62a5\u544a\u6269\u5c55\u5185\u5bb9'}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {'\u5982\u679c\u5168\u5c40\u62a5\u544a\u4e2d\u5fc3\u5df2\u540c\u6b65\u56de\u4f20\u62a5\u544a\u6269\u5c55\u5185\u5bb9\uff0c\u4f1a\u5728\u8fd9\u91cc\u4e0e\u672c\u5730\u4f53\u6001\u57fa\u7840\u62a5\u544a\u4e00\u8d77\u9605\u8bfb\u3002'}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn('status-badge h-7 px-3', hasDeepReport ? 'status-success' : 'status-processing')}>
                          {hasDeepReport ? '\u5df2\u540c\u6b65' : '\u5f85\u62a5\u544a\u4e2d\u5fc3'}
                        </span>
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

                    <div className="mt-4">
                      <MarkdownReport
                        content={deepReportContent}
                        loading={false}
                        animate={Boolean(isStreamingReport)}
                        showChrome={false}
                        tone="violet"
                        className="min-h-[300px] bg-white/90 sm:min-h-[340px]"
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
                <FileText className="h-10 w-10 text-slate-400" />
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
