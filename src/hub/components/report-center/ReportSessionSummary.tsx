import React from 'react';
import { Calendar, ExternalLink, FileDown, FileJson, FileText, User } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { SectionHeading } from './SectionHeading';
import type { ReportCenterSummaryProps } from './types';

export const ReportSessionSummary: React.FC<ReportCenterSummaryProps> = ({
  activeSessionInput,
  generatedSessionReport,
  draftReport,
  isExportingPdf,
  onOpenReport,
  onExportPdf,
  onExportMarkdown,
  onExportJson,
}) => (
  <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)] xl:sticky xl:top-4">
    <SectionHeading
      eyebrow="ARCHIVE SUMMARY"
      title="当前归档摘要"
      description="确认学生、会话与报告状态后，再执行查看和导出。"
      icon={<ExternalLink size={18} />}
    />

    <div className="mt-4 grid gap-3">
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400"><User size={12} />学生</div>
        <div className="font-bold text-slate-900">{activeSessionInput.patientName || activeSessionInput.patientId}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400"><Calendar size={12} />筛查会话</div>
        <div className="font-bold text-slate-900">{activeSessionInput.sessionId}</div>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 text-sm text-slate-600">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-400"><FileText size={12} />报告状态</div>
        <div className="font-bold text-slate-900">{generatedSessionReport ? '已生成正式报告' : '仅有草稿预览'}</div>
      </div>
    </div>

    <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/90 p-4">
      <div className="text-sm font-semibold text-slate-900">归档操作</div>
      <p className="mt-1 text-sm text-slate-500">查看当前报告全文，或导出 PDF、Markdown、JSON 版本。</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          variant="primary"
          className="sm:col-span-2 justify-center"
          icon={<ExternalLink size={16} />}
          onClick={() => onOpenReport(generatedSessionReport?.markdown || draftReport || null)}
          disabled={!generatedSessionReport && !draftReport}
        >
          查看报告全文
        </Button>
        <Button
          variant="secondary"
          className="justify-center"
          icon={<FileDown size={16} />}
          onClick={() => onExportPdf(generatedSessionReport?.markdown || draftReport, `screening-report-${activeSessionInput.sessionId}.pdf`, '筛查报告')}
          disabled={(!generatedSessionReport && !draftReport) || isExportingPdf}
        >
          {isExportingPdf ? '导出中...' : '导出 PDF'}
        </Button>
        <Button
          variant="secondary"
          className="justify-center"
          icon={<FileText size={16} />}
          onClick={onExportMarkdown}
          disabled={!generatedSessionReport}
        >
          导出 Markdown
        </Button>
        <Button
          variant="secondary"
          className="justify-center"
          icon={<FileJson size={16} />}
          onClick={onExportJson}
          disabled={!generatedSessionReport}
        >
          导出 JSON
        </Button>
      </div>
    </div>
  </Card>
);
