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

export interface ScaleAnswer {
  questionId: number;
  questionText: string;
  category: 'pain' | 'function' | 'self_image' | 'mental_health' | 'satisfaction';
  score: number;      // 1 - 5 分
  answerText: string; // 选项文字
}

export interface ScaleAssessmentData {
  scaleId: 'SRS-22' | 'ODI' | 'VAS' | 'MBI' | 'Berg' | 'MMT' | 'MAS';
  scaleName: string;
  filledBy: 'therapist' | 'patient' | 'parent';
  totalScore: number;
  maxScore: number;
  percentageScore: number; // 功能障碍率或百分比
  dimensions: {
    functionActive: number; // 功能活动维度分
    pain: number;           // 疼痛维度分
    selfImage: number;      // 自我形象维度分
    mentalHealth: number;   // 精神健康维度分
    satisfaction?: number;  // 治疗满意度分
  };
  answers: ScaleAnswer[];
  aiInterpretation?: string; // AI 对量表得分的多维医学解读
  createdAt: number;
}

export interface AdamsAssessmentData {
  atrDegrees: number;                       // ATR 躯干旋转度数 (0-30)
  atrDirection: 'left' | 'right' | 'none'; // 隆起方向 (左侧/右侧/无)
  shoulderAsymmetry: 'symmetrical' | 'left-higher' | 'right-higher'; // 双肩对称性 (对称/左侧偏高/右侧偏高)
  scapulaAsymmetry: 'symmetrical' | 'left-prominent' | 'right-prominent'; // 肩胛骨隆起 (对称/左侧隆起/右侧隆起)
  waistCreaseAsymmetry: 'symmetrical' | 'left-deeper' | 'right-deeper'; // 腰折痕对称性 (对称/左侧折痕深/右侧折痕深)
  spineCurveEstimate: 'straight' | 'c-shape-left' | 'c-shape-right' | 's-shape'; // 脊柱弯曲大致形态
  cobbAngleEstimate?: number;              // 估计 Cobb 角 (选填, 0-90)
  snapshotImage?: string;                  // 融合铅垂网格的 Base64 图像
  remarks?: string;                        // 康复师临床备注
  createdAt: number;                       // 评估时间戳
}

export interface Assessment {
  id: string;
  sessionId: string;
  patientId: string;
  type: 'posture' | 'rom' | 'medvoice' | 'combined' | 'scale' | 'adams';
  mode: AssessmentMode;
  createdAt: number;
  data: {
    posture?: PostureAssessmentData;
    rom?: RomAssessmentData;
    medvoice?: MedVoiceAssessmentData;
    scale?: ScaleAssessmentData;
    adams?: AdamsAssessmentData;
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
  landmarks: Array<{x: number; y: number}> | number[];
  angles: Record<string, number>;
  metrics: Record<string, any>;
  treatmentPlanId?: string;
  feedback?: string;
  improvement?: number;
}

export interface TimelineRecord {
  id: string;
  timestamp: string;
  type: 'assessment' | 'treatment' | 'followup';
  data: AssessmentRecord | TreatmentPlanVersion;
}

export interface TreatmentTimeline {
  patientId: string;
  records: TimelineRecord[];
}
