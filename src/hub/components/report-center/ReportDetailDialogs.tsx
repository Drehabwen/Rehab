import React from 'react';
import { Calendar, FileDown, FileJson, FileSpreadsheet, User, X } from 'lucide-react';
import { Card } from '@/components/ui';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import { getAssessmentPreview } from '../../report-center-utils';
import { sanitizeReadableText } from '@/components/shared/MarkdownReport';
import type { Assessment } from '@/types/assessment';

interface ReportDetailDialogsProps {
  selectedAssessment: Assessment | null;
  onCloseAssessment: () => void;
  selectedReportMarkdown: string | null;
  onCloseReport: () => void;
  patientMap: Map<string, string>;
  isExportingPdf: boolean;
  onExportAssessmentJson: (assessment: Assessment) => void;
  onExportAssessmentCsv: (assessment: Assessment) => void;
  onExportReportPdf: (markdown: string | null, filename: string, title: string) => void;
}

export const ReportDetailDialogs: React.FC<ReportDetailDialogsProps> = ({
  selectedAssessment,
  onCloseAssessment,
  selectedReportMarkdown,
  onCloseReport,
  patientMap,
  isExportingPdf,
  onExportAssessmentJson,
  onExportAssessmentCsv,
  onExportReportPdf,
}) => {
  const selectedAssessmentPreview = selectedAssessment ? getAssessmentPreview(selectedAssessment) : null;
  const selectedReportContent = sanitizeReadableText(selectedReportMarkdown);

  return (
    <>
      {selectedAssessment ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] md:p-8">
          <div className="dialog-shell max-h-[85vh] w-full max-w-4xl">
            <div className="dialog-header">
              <div>
                <div className="text-base font-semibold text-slate-900">评估详情</div>
                <div className="mt-1 inline-flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(selectedAssessment.createdAt).toLocaleString('zh-CN')}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <User size={12} />
                    {patientMap.get(selectedAssessment.patientId) || selectedAssessment.patientId}
                  </span>
                </div>
              </div>
              <button className="btn-icon" onClick={onCloseAssessment}>
                <X size={14} />
              </button>
            </div>

            <div className="custom-scrollbar max-h-[calc(85vh-146px)] space-y-4 overflow-y-auto p-5">
              <Card variant="default" padding="md">
                <div className="text-sm font-semibold text-slate-900">结构化摘要</div>
                <div className="mt-3">
                  <MarkdownReport
                    content={selectedAssessmentPreview}
                    loading={false}
                    animate={false}
                    showChrome={false}
                    tone="cyan"
                    className="min-h-[320px]"
                    emptyTitle="暂无可读摘要"
                    emptyDescription="当前记录暂无可读摘要，可使用导出功能查看原始数据。"
                  />
                </div>
              </Card>
            </div>

            <div className="dialog-footer">
              <button className="btn-secondary" onClick={() => onExportAssessmentJson(selectedAssessment)}>
                <FileJson size={14} /> JSON
              </button>
              <button className="btn-secondary" onClick={() => onExportAssessmentCsv(selectedAssessment)}>
                <FileSpreadsheet size={14} /> CSV
              </button>
              <button className="btn-primary" onClick={onCloseAssessment}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedReportMarkdown ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-[2px] md:p-8">
          <div className="dialog-shell max-h-[85vh] w-full max-w-4xl">
            <div className="dialog-header">
              <div className="text-base font-semibold text-slate-900">报告全文</div>
              <button className="btn-icon" onClick={onCloseReport}>
                <X size={14} />
              </button>
            </div>
            <div className="custom-scrollbar max-h-[calc(85vh-130px)] overflow-auto p-5">
              <MarkdownReport
                content={selectedReportContent}
                loading={false}
                animate={false}
                tone="violet"
                className="min-h-[420px]"
                emptyTitle="暂无报告内容"
                emptyDescription="当前报告内容为空或已被自动过滤异常字符。"
              />
            </div>
            <div className="dialog-footer">
              <button
                className="btn-secondary"
                onClick={() =>
                  onExportReportPdf(
                    selectedReportContent,
                    `session-report-full.pdf`,
                    '综合报告'
                  )
                }
                disabled={isExportingPdf}
              >
                <FileDown size={14} />
                {isExportingPdf ? '导出中...' : '导出 PDF'}
              </button>
              <button className="btn-primary" onClick={onCloseReport}>
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
