import type { Landmark, PostureIssue, PostureMetrics } from './posture';

export type AssessmentMode = 'realtime' | 'stepped';

export type AssessmentView = 'front' | 'side' | 'back';

export interface PostureAssessmentData {
  mode: AssessmentMode;
  view: AssessmentView;
  metrics?: PostureMetrics;
  issues?: PostureIssue[];
  landmarks?: Landmark[];
  confidence: number;
  htmlReport?: string;
  timeSeries?: any[];
}

export interface RomAssessmentData {
  joint: string;
  movement: string;
  rangeOfMotion: number;
  landmarks?: Landmark[];
}

export interface Assessment {
  id: string;
  sessionId: string;
  patientId: string;
  type: 'posture' | 'rom' | 'combined';
  mode: AssessmentMode;
  createdAt: number;
  data: {
    posture?: PostureAssessmentData;
    rom?: RomAssessmentData;
  };
  notes?: string;
  status: 'pending' | 'completed' | 'reviewed';
}
