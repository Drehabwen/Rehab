import React, { useState } from 'react';
import { Activity, AlertTriangle, ChevronDown, FileText, RefreshCw } from 'lucide-react';

interface Vision3WorkspaceProps {
  currentViewLabel: string;
  assessmentType: string;
  assessmentMode: string;
  completedIssueCount: number;
  completedMetricCount: number;
  displayAuxiliaryDiagnosis: string | null;
  displayMarkdownReport: string | null;
  activePanel: 'dashboard' | 'report';
  handleNavigateWorkspace: (panel: 'dashboard' | 'report', target: any) => void;
  handleResetToEntry: () => void;
  cameraStage: React.ReactNode;
  analysisPanel: React.ReactNode;
}

export const Vision3Workspace: React.FC<Vision3WorkspaceProps> = ({
  currentViewLabel,
  assessmentType,
  assessmentMode,
  completedIssueCount,
  completedMetricCount,
  displayAuxiliaryDiagnosis,
  displayMarkdownReport,
  activePanel,
  handleNavigateWorkspace,
  handleResetToEntry,
  cameraStage,
  analysisPanel
}) => {
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);

  return (
    <section className="flex min-h-full flex-col rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.06),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-3 shadow-[0_24px_64px_rgba(15,23,42,0.07)] sm:p-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-[1.5rem] border border-white/70 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">体态评估工作区</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">体态评估工作台</h2>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              {displayAuxiliaryDiagnosis
                ? '当前已进入评估结果工作台，右侧优先阅读本次基础报告；如需深度报告，请前往报告中心统一生成。'
                : '拍摄与分析已结束，右侧会优先承接本次基础报告与指标信息。'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {currentViewLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {assessmentType === 'quick' ? '快速评估' : '标准评估'}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                completedIssueCount > 0
                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700'
              }`}
            >
              {completedIssueCount > 0 ? `风险 ${completedIssueCount}` : '未见显著异常'}
            </span>
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              {`指标 ${completedMetricCount}`}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 xl:hidden"
              onClick={() => setIsContextPanelOpen((current) => !current)}
            >
              <ChevronDown size={14} className={`mr-2 inline-flex transition-transform ${isContextPanelOpen ? 'rotate-180' : ''}`} />
              {isContextPanelOpen ? '收起拍摄摘要' : '查看拍摄摘要'}
            </button>
            <button
              type="button"
              className={`h-9 rounded-xl border px-3 text-sm font-medium transition-colors ${
                activePanel === 'report'
                  ? 'border-violet-200 bg-violet-50 text-violet-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
              onClick={() => handleNavigateWorkspace('report', displayMarkdownReport ? 'report-deep' : 'report-basic')}
            >
              <FileText size={14} className="mr-2 inline-flex" />
              基础报告
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-4">
        <div className={`order-2 w-full flex-shrink-0 flex-col gap-3 xl:order-1 xl:flex xl:w-[min(360px,29%)] xl:min-w-[300px] ${
          isContextPanelOpen ? 'flex' : 'hidden xl:flex'
        }`}>
          {cameraStage}

          <section className="bento-card space-y-3 border border-slate-200/80 bg-white/94 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">本次评估摘要</p>
                <h3 className="mt-1 text-base font-semibold text-slate-900">本次评估摘要</h3>
                <p className="mt-1 text-sm text-slate-500">压缩保留本次视图、风险和指标摘要，减少右侧阅读时的视觉打扰。</p>
              </div>
              <button
                type="button"
                className="btn-secondary h-9 self-start px-3"
                onClick={handleResetToEntry}
              >
                <RefreshCw size={14} />
                重新评估
              </button>
            </div>

            <div className="space-y-3">
              <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-500">视图与模式</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {`${currentViewLabel} · ${assessmentType === 'quick' ? '快速评估' : '标准评估'}`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{assessmentMode === 'stepped' ? '分步拍摄' : '实时分析'}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                    {currentViewLabel}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-20 border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">风险项</p>
                    <AlertTriangle size={14} className={completedIssueCount > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{completedIssueCount}</p>
                  <p className="mt-1 text-xs text-slate-500">{completedIssueCount > 0 ? '已可在右侧结论区查看' : '未见显著异常'}</p>
                </div>

                <div className="rounded-20 border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">可用指标</p>
                    <Activity size={14} className="text-blue-600" />
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">{completedMetricCount}</p>
                  <p className="mt-1 text-xs text-slate-500">可在量化指标中查看</p>
                </div>
              </div>

              <div className="rounded-20 border border-slate-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.82),rgba(255,255,255,1))] p-4">
                <p className="text-sm font-semibold text-slate-900">当前阅读指引</p>
                <p className="mt-1 text-xs leading-6 text-slate-600">
                  {displayAuxiliaryDiagnosis
                    ? '基础报告已到位，可在右侧直接阅读当前体态结论。'
                    : '报告区正在承接本次体态结果，需要时可切换到量化指标查看对照信息。'}
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="order-1 min-h-0 w-full xl:order-2 xl:flex-1">
          {analysisPanel}
        </div>
      </div>
    </section>
  );
};
