import { JointType, MovementDirection } from '../types';
import { ROM_TEXTS } from '../constants/uiText';

export const jointNameMap: Record<string, string> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  elbow: '肘关节',
  wrist: '腕关节',
  hip: '髋关节',
  knee: '膝关节',
  ankle: '踝关节',
};

export const directionNameMap: Record<string, string> = {
  flexion: '屈曲',
  extension: '伸展',
  abduction: '外展',
  adduction: '内收',
  internal_rotation: '内旋',
  external_rotation: '外旋',
};

export const normalROMRanges: Record<JointType, Record<MovementDirection, { min: number; max: number }>> = {
  cervical: {
    flexion: { min: 0, max: 45 },
    extension: { min: 0, max: 45 },
    abduction: { min: 0, max: 45 },
    adduction: { min: 0, max: 45 },
    internal_rotation: { min: 0, max: 45 },
    external_rotation: { min: 0, max: 45 },
  },
  shoulder: {
    flexion: { min: 0, max: 180 },
    extension: { min: 0, max: 60 },
    abduction: { min: 0, max: 180 },
    adduction: { min: 0, max: 40 },
    internal_rotation: { min: 0, max: 90 },
    external_rotation: { min: 0, max: 90 },
  },
  elbow: {
    flexion: { min: 0, max: 145 },
    extension: { min: 0, max: 0 },
    abduction: { min: 0, max: 0 },
    adduction: { min: 0, max: 0 },
    internal_rotation: { min: 0, max: 90 },
    external_rotation: { min: 0, max: 90 },
  },
  wrist: {
    flexion: { min: 0, max: 80 },
    extension: { min: 0, max: 70 },
    abduction: { min: 0, max: 20 },
    adduction: { min: 0, max: 30 },
    internal_rotation: { min: 0, max: 0 },
    external_rotation: { min: 0, max: 0 },
  },
  hip: {
    flexion: { min: 0, max: 120 },
    extension: { min: 0, max: 30 },
    abduction: { min: 0, max: 45 },
    adduction: { min: 0, max: 30 },
    internal_rotation: { min: 0, max: 45 },
    external_rotation: { min: 0, max: 45 },
  },
  knee: {
    flexion: { min: 0, max: 135 },
    extension: { min: 0, max: 0 },
    abduction: { min: 0, max: 10 },
    adduction: { min: 0, max: 10 },
    internal_rotation: { min: 0, max: 30 },
    external_rotation: { min: 0, max: 30 },
  },
  ankle: {
    flexion: { min: 0, max: 20 },
    extension: { min: 0, max: 45 },
    abduction: { min: 0, max: 20 },
    adduction: { min: 0, max: 20 },
    internal_rotation: { min: 0, max: 30 },
    external_rotation: { min: 0, max: 30 },
  },
};

export const calculateROMStatus = (joint: JointType, direction: MovementDirection, angle: number): 'normal' | 'limited' | 'excessive' => {
  const range = normalROMRanges[joint]?.[direction];
  if (!range) return 'normal';
  
  if (angle < range.min) return 'limited';
  if (angle > range.max) return 'excessive';
  return 'normal';
};

export const calculateROMScore = (romData: any[]): number => {
  const total = romData.length;
  if (total === 0) return 0;
  
  const normalCount = romData.filter(data => 
    calculateROMStatus(data.joint, data.direction, data.angle) === 'normal'
  ).length;
  
  return Math.round((normalCount / total) * 100);
};
