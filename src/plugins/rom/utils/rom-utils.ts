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
  flexion: '前屈',
  extension: '后伸',
  abduction: '外展',
  adduction: '内收',
  lateral_flexion: '侧屈',
  internal_rotation: '内旋',
  external_rotation: '外旋',
  rotation: '旋转',
};

export const normalROMRanges: Partial<Record<JointType, Partial<Record<MovementDirection, { min: number; max: number }>>>> = {
  // ── 颈椎：前屈 + 后伸 + 侧屈 + 旋转（正面摄像头可测）──
  cervical: {
    flexion: { min: 0, max: 45 },           // 前屈
    extension: { min: 0, max: 45 },          // 后伸
    lateral_flexion: { min: 0, max: 45 },    // 侧屈（左右对称）
    rotation: { min: 0, max: 80 },  // 左旋/右旋对称，共用一个范围
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
