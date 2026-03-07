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
  /** 深度报告 - LLM解析的报告 */
  markdownReport?: string;
  /** 基础报告 - 根据规则得出的结论 */
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
