export type JointType = 'cervical' | 'shoulder' | 'thoracolumbar' | 'wrist' | 'ankle' | 'hip' | 'knee' | 'elbow';

export type MovementDirection =
  | 'flexion' | 'extension'
  | 'abduction' | 'adduction'
  | 'internal-rotation' | 'external-rotation'
  | 'left-rotation' | 'right-rotation'
  | 'left-lateral-flexion' | 'right-lateral-flexion'
  | 'ulnar-deviation' | 'radial-deviation'
  | 'dorsiflexion' | 'plantarflexion';

export interface Landmark {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface PostureIssue {
  id: string;
  type: string;
  severity: 'mild' | 'moderate' | 'severe';
  title: string;
  description: string;
  recommendation: string;
  points?: { x: number; y: number }[];
}

export interface PostureMetrics {
  shoulderAngle?: number;
  hipAngle?: number;
  headDeviation?: number;
  headForward?: number;
  shoulderRounded?: number;
  headPitch?: number;
  headYaw?: number;
  headRoll?: number;
  swayOffset?: number;
  head_axes?: { x: number; y: number }[];
}
