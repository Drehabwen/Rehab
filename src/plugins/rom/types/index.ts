export type JointType = 
  | 'cervical'    // 颈椎
  | 'shoulder'    // 肩关节
  | 'elbow'       // 肘关节
  | 'wrist'       // 腕关节
  | 'hip'         // 髋关节
  | 'knee'        // 膝关节
  | 'ankle';      // 踝关节

export type MovementDirection = 
  | 'flexion'     // 屈曲
  | 'extension'   // 伸展
  | 'abduction'   // 外展
  | 'adduction'   // 内收
  | 'internal_rotation'  // 内旋
  | 'external_rotation'; // 外旋

export interface ROMData {
  joint: JointType;
  direction: MovementDirection;
  side: 'left' | 'right';
  angle: number;
  maxAngle: number;
  minAngle: number;
  timestamp: number;
  confidence: number;
}

export interface ROMAssessment {
  id: string;
  patientId: string;
  sessionId: string;
  createdAt: number;
  data: ROMData[];
  notes?: string;
  status: 'pending' | 'completed' | 'reviewed';
}

export interface ROMReport {
  id: string;
  patientId: string;
  assessmentId: string;
  createdAt: number;
  data: ROMData[];
  summary: string;
  recommendations: string[];
}
