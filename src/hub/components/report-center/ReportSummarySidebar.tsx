import React from 'react';
import { Calendar, ExternalLink, FileDown, FileJson, FileText, Layers, User } from 'lucide-react';
import { Card } from '@/components/ui';
import { StatusTag } from '@/components/workflow';
import { Button } from '@/components/ui';
import type { SessionReportInput, SessionReportOutput } from '@/types/report-center';

interface ReportSummarySidebarProps {
  activeSessionInput: SessionReportInput;
  generatedSessionReport: SessionReportOutput | undefined;
  draftReport: string | null;
  reportArchive: SessionReportOutput[];
  patientMap: Map<string, string>;
  isExportingPdf: boolean;
  onViewReportFull: (markdown: string | null) => void;
  onExportPdf: (markdown: string | null, filename: string, title: string) => void;
  onExportMarkdown: (report: SessionReportOutput) => void;
  onExportJson: (report: SessionReportOutput) => void;
}

const trimText = (value: string | null | undefined, maxLength = 120) => {
  if (!value) return '当前模块尚未生成结构化摘要。';
  const compact = value.replace(/\s+/g, ' ').trim();
  if (!compact) return '当前模块尚未生成结构化摘要。';
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength)}...`;
};

export const ReportSummarySidebar: React.FC<ReportSummarySidebarProps> = ({
  activeSessionInput,
  generatedSessionReport,
  draftReport,
  reportArchive,
  patientMap,
  isExportingPdf,
  onViewReportFull,
  onExportPdf,
  onExportMarkdown,
  onExportJson,
}) => {
  const currentReportMarkdown = generatedSessionReport?.markdown || draftReport;

  return (
    <div className="space-y-4">
      <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">当前接诊</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">接诊摘要</h2>
              <p className="mt-1 text-sm text-slate-500">不展开全文的情况下，快速确认当前患者、接诊与报告状态。</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
              <FileText size={18} />
            </div>
          </div>
          <StatusTag status={generatedSessionReport ? 'completed' : 'pending'} />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400"><User size={12} />患者</div>
            <div className="font-medium text-slate-900">{activeSessionInput.patientName || activeSessionInput.patientId}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400"><Calendar size={12} />接诊</div>
            <div className="font-medium text-slate-900">{activeSessionInput.sessionId}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400"><FileText size={12} />状态</div>
            <div className="font-medium text-slate-900">{generatedSessionReport ? '综合报告已生成' : '综合报告待生成'}</div>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
          <div className="text-sm font-semibold text-slate-900">报告操作</div>
          <p className="mt-1 text-sm text-slate-500">当前接诊的查看与导出操作统一放在这里，减少来回寻找按钮。</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              variant="primary"
              className="sm:col-span-2 justify-center"
              icon={<ExternalLink size={16} />}
              onClick={() => onViewReportFull(currentReportMarkdown)}
              disabled={!currentReportMarkdown}
            >
              查看报告全文
            </Button>
            <Button
              variant="secondary"
              className="justify-center"
              icon={<FileDown size={16} />}
              onClick={() => onExportPdf(currentReportMarkdown, `session-report-${activeSessionInput.sessionId}.pdf`, '综合报告')}
              disabled={!currentReportMarkdown || isExportingPdf}
            >
              {isExportingPdf ? '导出中...' : '导出 PDF'}
            </Button>
            <Button
              variant="secondary"
              className="justify-center"
              icon={<FileText size={16} />}
              onClick={() => generatedSessionReport && onExportMarkdown(generatedSessionReport)}
              disabled={!generatedSessionReport}
            >
              导出 MD
            </Button>
            <Button
              variant="secondary"
              className="justify-center"
              icon={<FileJson size={16} />}
              onClick={() => generatedSessionReport && onExportJson(generatedSessionReport)}
              disabled={!generatedSessionReport}
            >
              导出 JSON
            </Button>
          </div>
        </div>
      </Card>

      <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">快速预览</div>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">报告预览</h2>
              <p className="mt-1 text-sm text-slate-500">这里只显示摘要，避免长文本挤占阅读焦点。</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
              <ExternalLink size={18} />
            </div>
          </div>
          <Button
            variant="secondary"
            icon={<FileDown size={16} />}
            onClick={() => onExportPdf(currentReportMarkdown, `session-report-preview-${activeSessionInput.sessionId}.pdf`, '综合报告')}
            disabled={!currentReportMarkdown || isExportingPdf}
          >
            {isExportingPdf ? '导出中...' : '导出 PDF'}
          </Button>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
          {trimText(currentReportMarkdown, 260)}
        </div>
      </Card>

      <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
        <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.14em] text-slate-400">历史记录</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">报告归档</h2>
            <p className="mt-1 text-sm text-slate-500">保留当前筛选范围内的综合报告，便于复查与导出。</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Layers size={18} />
          </div>
        </div>

        <div className="custom-scrollbar mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
          {reportArchive.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              当前筛选范围内还没有综合报告归档。
            </div>
          ) : (
            reportArchive.map((report) => (
              <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{report.sessionId}</div>
                    <div className="mt-1 text-xs text-slate-500">{patientMap.get(report.patientId) || report.patientId}</div>
                  </div>
                  <StatusTag status="completed" />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">{trimText(report.markdown, 120)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={() => onViewReportFull(report.markdown)}>
                    <ExternalLink size={12} />查看
                  </button>
                  <button
                    type="button"
                    className="btn-secondary h-8 px-3 text-xs"
                    onClick={() => onExportPdf(report.markdown, `session-report-${report.sessionId}.pdf`, '综合报告')}
                    disabled={isExportingPdf}
                  >
                    <FileDown size={12} />PDF
                  </button>
                  <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={() => onExportMarkdown(report)}>
                    <FileText size={12} />文本
                  </button>
                  <button type="button" className="btn-secondary h-8 px-3 text-xs" onClick={() => onExportJson(report)}>
                    <FileJson size={12} />JSON
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};
