import React from 'react';
import { FileDown, Layers } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { SectionHeading } from './SectionHeading';
import type { ReportArchiveItem } from './types';

interface ReportArchiveListProps {
  items: ReportArchiveItem[];
  isExportingPdf: boolean;
  onOpenReport: (markdown: string) => void;
  onExportPdf: (markdown: string, fileName: string, title: string) => void;
}

export const ReportArchiveList: React.FC<ReportArchiveListProps> = ({
  items,
  isExportingPdf,
  onOpenReport,
  onExportPdf,
}) => (
  <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <SectionHeading
      eyebrow="ARCHIVE"
      title="报告归档"
      description="保留当前筛选范围内的正式报告，便于回看和导出。"
      icon={<Layers size={18} />}
    />
    <div className="custom-scrollbar mt-4 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
          当前筛选范围内还没有正式报告归档。
        </div>
      ) : (
        items.map((report) => (
          <div key={report.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-bold text-slate-900">{report.sessionId}</div>
                <div className="rounded-full bg-slate-200/50 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {new Date(report.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div className="mt-0.5 text-xs text-slate-500">{report.patientName}</div>
              <p className="mt-1 line-clamp-1 text-xs text-slate-600 italic">{report.previewText}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => onOpenReport(report.markdown)}>
                查看
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onExportPdf(report.markdown, `screening-report-${report.sessionId}.pdf`, '筛查报告')}
                disabled={isExportingPdf}
              >
                <FileDown size={14} />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  </Card>
);
