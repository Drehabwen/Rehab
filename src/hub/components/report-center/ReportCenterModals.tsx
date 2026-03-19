import React from 'react';
import { Calendar, FileDown, FileJson, FileSpreadsheet, User, X } from 'lucide-react';
import { Card } from '@/components/ui';
import { MarkdownReport } from '@/components/shared/MarkdownReport';
import type { Assessment } from '@/types/assessment';
import type { QuickViewState } from './types';

interface ReportCenterModalsProps {
  selectedAssessment: Assessment | null;
  selectedAssessmentPreview: string | null;
  selectedQuickView: QuickViewState | null;
  selectedQuickViewContent: string | null;
  selectedReportMarkdown: string | null;
  selectedReportContent: string | null;
  selectedPatientLabel?: string;
  activeSessionLabel?: string;
  isExportingPdf: boolean;
  onCloseAssessment: () => void;
  onCloseQuickView: () => void;
  onCloseReport: () => void;
  onExportAssessmentJson: () => void;
  onExportAssessmentCsv: () => void;
  onExportReportPdf: () => void;
}

export const ReportCenterModals: React.FC<ReportCenterModalsProps> = ({
  selectedAssessment,
  selectedAssessmentPreview,
  selectedQuickView,
  selectedQuickViewContent,
  selectedReportMarkdown,
  selectedReportContent,
  selectedPatientLabel,
  activeSessionLabel,
  isExportingPdf,
  onCloseAssessment,
  onCloseQuickView,
  onCloseReport,
  onExportAssessmentJson,
  onExportAssessmentCsv,
  onExportReportPdf,
}) => (
  <>
    {selectedAssessment ? (
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 md:p-8">
        <div className="dialog-shell max-h-[85vh] w-full max-w-4xl">
          <div className="dialog-header">
            <div>
              <div className="text-base font-semibold text-slate-900">模块详情</div>
              <div className="mt-1 inline-flex items-center gap-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(selectedAssessment.createdAt).toLocaleString('zh-CN')}</span>
                <span className="inline-flex items-center gap-1"><User size={12} />{selectedPatientLabel || selectedAssessment.patientId}</span>
              </div>
            </div>
            <button className="btn-icon" onClick={onCloseAssessment}><X size={14} /></button>
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
            <button className="btn-secondary" onClick={onExportAssessmentJson}><FileJson size={14} /> JSON</button>
            <button className="btn-secondary" onClick={onExportAssessmentCsv}><FileSpreadsheet size={14} /> CSV</button>
            <button className="btn-primary" onClick={onCloseAssessment}>关闭</button>
          </div>
        </div>
      </div>
    ) : null}

    {selectedQuickView ? (
      <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-900/45 p-4 md:p-8">
        <div className="dialog-shell max-h-[85vh] w-full max-w-3xl">
          <div className="dialog-header">
            <div>
              <div className="text-base font-semibold text-slate-900">{selectedQuickView.title}</div>
              {selectedQuickView.subtitle ? <div className="mt-1 text-xs text-slate-500">{selectedQuickView.subtitle}</div> : null}
            </div>
            <button className="btn-icon" onClick={onCloseQuickView}><X size={14} /></button>
          </div>
          <div className="custom-scrollbar max-h-[calc(85vh-132px)] overflow-auto p-5">
            <MarkdownReport
              content={selectedQuickViewContent}
              loading={false}
              animate={false}
              showChrome={false}
              className="min-h-[240px]"
              emptyTitle="暂无内容"
              emptyDescription="当前内容为空。"
            />
          </div>
          <div className="dialog-footer">
            <button className="btn-primary" onClick={onCloseQuickView}>关闭</button>
          </div>
        </div>
      </div>
    ) : null}

    {selectedReportMarkdown ? (
      <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-4 md:p-8">
        <div className="dialog-shell max-h-[85vh] w-full max-w-4xl">
          <div className="dialog-header">
            <div className="text-base font-semibold text-slate-900">报告全文</div>
            <button className="btn-icon" onClick={onCloseReport}><X size={14} /></button>
          </div>
          <div className="custom-scrollbar max-h-[calc(85vh-76px)] overflow-auto p-5">
            <MarkdownReport
              content={selectedReportContent}
              loading={false}
              animate={false}
              tone="violet"
              title="筛查报告全文"
              subtitle={selectedPatientLabel && activeSessionLabel ? `${selectedPatientLabel} · ${activeSessionLabel}` : '报告中心'}
              footerNote="当前展示的是报告中心中的完整筛查报告，可继续导出 PDF，或返回报告中心查看归档摘要。"
              className="min-h-[420px]"
              emptyTitle="暂无报告内容"
              emptyDescription="当前报告内容为空或已被异常字符过滤。"
            />
          </div>
          <div className="dialog-footer">
            <button className="btn-secondary" onClick={onExportReportPdf} disabled={isExportingPdf}>
              <FileDown size={14} />
              {isExportingPdf ? '导出中...' : '导出 PDF'}
            </button>
            <button className="btn-primary" onClick={onCloseReport}>关闭</button>
          </div>
        </div>
      </div>
    ) : null}
  </>
);
