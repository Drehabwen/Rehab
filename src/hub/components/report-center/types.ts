import type { Assessment } from '@/types/assessment';
import type { SessionReportInput, SessionReportOutput, SessionReportInputType } from '@/types/report-center';

export interface QuickViewState {
  title: string;
  subtitle?: string;
  content: string | null;
}

export interface ModuleCardItem {
  type: SessionReportInputType;
  title: string;
  description: string;
  status: 'ready' | 'partial' | 'missing';
  summaryText: string;
  evidenceText: string;
  accentClassName: string;
  iconKey: 'activity' | 'layers' | 'mic' | 'brain';
  assessment?: Assessment;
}

export interface ReportArchiveItem extends SessionReportOutput {
  patientName: string;
  previewText: string;
}

export interface ReportCenterSummaryProps {
  activeSessionInput: SessionReportInput;
  generatedSessionReport?: SessionReportOutput;
  draftReport: string | null;
  isExportingPdf: boolean;
  onOpenReport: (content: string | null) => void;
  onExportPdf: (markdown: string | null | undefined, fileName: string, title: string) => void;
  onExportMarkdown: () => void;
  onExportJson: () => void;
}
