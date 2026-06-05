import type { ROMData } from '../types';
import { JointType, MovementDirection } from '../types';

export const jointNameMap: Record<string, string> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  elbow: '肘关节',
  // @deprecated 腕关节：摄像头无法精确捕捉手腕动作
  // wrist: '腕关节',
  // @deprecated 髋关节：需要全身视角，单摄像头实际使用率低
  // hip: '髋关节',
  // @deprecated 膝关节：需要全身视角，单摄像头实际使用率低
  // knee: '膝关节',
  // @deprecated 踝关节：摄像头无法精确捕捉脚踝动作
  // ankle: '踝关节',
};

export const directionNameMap: Record<string, string> = {
  flexion: '屈曲',
  extension: '伸展',
  abduction: '外展',
  adduction: '内收',
  internal_rotation: '内旋',
  external_rotation: '外旋',
};

export const normalROMRanges: Partial<Record<JointType, Partial<Record<MovementDirection, { min: number; max: number }>>>> = {
  // ── 颈椎：左右旋转 + 左右侧屈（正面摄像头可测）──
  cervical: {
    // 颈椎侧屈 (lateral flexion) — 使用 abduction/adduction 作为通用方向
    abduction: { min: 0, max: 45 },
    adduction: { min: 0, max: 45 },
    // 颈椎旋转
    internal_rotation: { min: 0, max: 80 },
    external_rotation: { min: 0, max: 80 },
  },
  // ── 肩关节：前屈 + 外展（正面/侧面摄像头可测）──
  shoulder: {
    flexion: { min: 0, max: 180 },
    abduction: { min: 0, max: 180 },
  },
  // ── 肘关节：屈曲（侧面摄像头可测）──
  elbow: {
    flexion: { min: 0, max: 145 },
  },
};

export const calculateROMStatus = (
  joint: JointType,
  direction: MovementDirection,
  angle: number,
): 'normal' | 'limited' | 'excessive' => {
  const range = normalROMRanges[joint]?.[direction];
  if (!range) return 'normal';

  if (angle < range.min) return 'limited';
  if (angle > range.max) return 'excessive';
  return 'normal';
};

export const getROMReferenceAngle = (item: Pick<ROMData, 'angle' | 'maxAngle' | 'minAngle'>): number => {
  const candidates = [item.angle, item.maxAngle, item.minAngle]
    .filter((value) => Number.isFinite(value))
    .map((value) => Math.abs(value));

  return candidates.length > 0 ? Math.max(...candidates) : 0;
};

export const calculateROMScore = (romData: ROMData[]): number => {
  const total = romData.length;
  if (total === 0) return 0;

  const normalCount = romData.filter((item) =>
    calculateROMStatus(item.joint, item.direction, getROMReferenceAngle(item)) === 'normal'
  ).length;

  return Math.round((normalCount / total) * 100);
};
