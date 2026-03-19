import type { Assessment } from './assessment';

export type SessionReportInputType = 'posture' | 'rom' | 'medvoice' | 'fatigue';

export type SessionReportInputStatus = 'ready' | 'partial' | 'missing';

export interface AssessmentOutputSummary {
  assessmentId: string;
  sessionId: string;
  patientId: string;
  type: SessionReportInputType;
  title: string;
  status: SessionReportInputStatus;
  createdAt: number;
  preview: string | null;
  evidenceCount: number;
  sourceAssessment: Assessment;
}

export interface SessionReportReadiness {
  readyCount: number;
  partialCount: number;
  missingTypes: SessionReportInputType[];
  availableTypes: SessionReportInputType[];
}

export interface SessionReportInput {
  sessionId: string;
  patientId: string;
  patientName?: string;
  outputs: Partial<Record<SessionReportInputType, AssessmentOutputSummary>>;
  latestCreatedAt: number;
  readiness: SessionReportReadiness;
}

export interface SessionReportOutput {
  id: string;
  sessionId: string;
  patientId: string;
  markdown: string;
  insights: string[];
  recommendations: string[];
  createdAt: number;
  sourceAssessmentIds: string[];
}

export interface SessionReportSectionInput {
  title: string;
  status: SessionReportInputStatus;
  preview: string | null;
  evidenceCount: number;
}

export interface SessionReportGenerationRequest {
  sessionId: string;
  patientId: string;
  patientName?: string;
  patientType?: 'adult' | 'adolescent';
  sourceAssessmentIds: string[];
  readiness: SessionReportReadiness;
  posture?: SessionReportSectionInput;
  rom?: SessionReportSectionInput;
  medvoice?: SessionReportSectionInput;
  fatigue?: SessionReportSectionInput;
}
