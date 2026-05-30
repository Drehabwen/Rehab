import { PostureMetrics, PostureIssue } from './posture';
import { TemporalAnalysis } from '@/lib/posture-processor';

// WebSocket 消息类型
export type MessageType = 
  | 'POSTURE_SYNC'
  | 'POSTURE_BATCH_ANALYSIS'
  | 'POSTURE_STEPPED_ANALYSIS'
  | 'POSTURE_REPORT'
  | 'POSTURE_ACK'
  | 'JOINT_ANALYSIS'
  | 'JOINT_RESULT'
  | 'ERROR';

// 评估类型
export type AssessmentType = 'standard' | 'quick' | 'adams';

// 视角类型
export type ViewType = 'front' | 'side' | 'back';

// 骨骼点
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

// 帧数据
export interface SteppedFrame {
  view: ViewType;
  width: number;
  height: number;
  timeSeriesLandmarks: Landmark[][];
  image?: string;
  timestamp?: number;
}

// 分步分析请求
export interface SteppedAnalysisRequest {
  type: 'POSTURE_STEPPED_ANALYSIS';
  frames: SteppedFrame[];
  assessmentType: AssessmentType;
  mock: boolean;
  requestId?: string;
}

// 体态报告响应
export interface PostureReportResponse {
  type: 'POSTURE_REPORT';
  markdown: string;
  reportId: string;
  timeSeries?: TemporalAnalysis['timeSeries'];
  metrics: Record<string, number>;
  auxiliaryDiagnosis: string;
  issues: Array<{
    id: string;
    type: string;
    severity: 'mild' | 'moderate' | 'severe';
    title: string;
    description: string;
    recommendation: string;
    points?: Array<{ x: number; y: number }>;
  }>;
  timestamp: number;
  assessmentType: AssessmentType;
}

// 错误响应
export interface ErrorResponse {
  type: 'ERROR';
  message: string;
  code: string;
}

// 通用响应类型
export type WebSocketResponse = PostureReportResponse | ErrorResponse;

// 存储的报告类型
export interface StoredPostureReport {
  id: string;
  date: number;
  view: ViewType;
  html: string;
  markdown?: string;
  timeSeries?: TemporalAnalysis['timeSeries'];
  metrics?: PostureMetrics;
  issues?: PostureIssue[];
  auxiliaryDiagnosis?: string;
}
