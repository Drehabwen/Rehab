import type { Landmark, PostureIssue, PostureMetrics } from './posture';
import type { TemporalAnalysis } from '@/lib/posture-processor';
import type { StructuredCase, PatientInfo } from '@/store/useCaseStore';
import type { ROMData } from '@/plugins/rom/types';

export type AssessmentMode = 'realtime' | 'stepped' | 'voice';

export type AssessmentView = 'front' | 'side' | 'back';

export interface PostureAssessmentData {
  mode: AssessmentMode;
  view: AssessmentView;
  metrics?: PostureMetrics;
  issues?: PostureIssue[];
  landmarks?: Landmark[];
  confidence: number;
  /** 深度报告，由 LLM 基于结构化结果生成 */
  markdownReport?: string;
  /** 基础报告，由规则与指标直接生成 */
  auxiliaryDiagnosis?: string;
  timeSeries?: TemporalAnalysis['timeSeries'];
}

export interface RomAssessmentData {
  items: ROMData[];
  summary?: string;
  recommendations?: string[];
}

export interface MedVoiceAssessmentData {
  mode: AssessmentMode;
  transcript: string;
  structuredCase: StructuredCase;
  patientInfo: PatientInfo;
  viewMode: 'standard' | 'soap';
}

export interface Assessment {
  id: string;
  sessionId: string;
  patientId: string;
  type: 'posture' | 'rom' | 'medvoice' | 'combined';
  mode: AssessmentMode;
  createdAt: number;
  data: {
    posture?: PostureAssessmentData;
    rom?: RomAssessmentData;
    medvoice?: MedVoiceAssessmentData;
  };
  notes?: string;
  status: 'pending' | 'completed' | 'reviewed';
  isBaseline?: boolean;
}

export interface TreatmentPlanVersion {
  id: string;
  version: number;
  content: string;
  assessmentId?: string;
  sessionId?: string;
  sessionReportId?: string;
  sourceType?: 'assessment' | 'session-report';
  patientId: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  tags?: string[];
  notes?: string;
  isCurrent: boolean;
  assessmentData?: AssessmentRecord;
}

export interface AssessmentRecord {
  id: string;
  timestamp: string;
  patientId: string;
  assessmentType: 'front' | 'side' | 'back';
  imageData: string;
  landmarks: Array<{ x: number; y: number }> | number[];
  angles: Record<string, number>;
  metrics: Record<string, number | string | boolean | null>;
  treatmentPlanId?: string;
  feedback?: string;
  improvement?: number;
  fatigueMetrics?: {
    rpe?: number;
    stabilityScore?: number;
    jitterIndex?: number;
    fatigueScore?: number;
    recoveryScore?: number;
  };
  intervention?: {
    interventionId: string;
    phase: 'before' | 'during' | 'after';
    protocolName?: string;
    note?: string;
  };
}
