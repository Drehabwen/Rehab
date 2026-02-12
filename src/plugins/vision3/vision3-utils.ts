import { Results } from '@mediapipe/holistic';

export const jointNameMap: Record<string, string> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  thoracolumbar: '胸腰椎',
  elbow: '肘关节',
  wrist: '腕关节',
  hip: '髋关节',
  knee: '膝关节',
  ankle: '踝关节',
};

export type HeadAxisPoint = { x: number; y: number };
export type HeadAxes = { origin: HeadAxisPoint; x: HeadAxisPoint; y: HeadAxisPoint; z: HeadAxisPoint };

export const normalizeHeadAxes = (axes?: HeadAxisPoint[] | null): HeadAxes | null => {
  if (!axes || axes.length < 3) return null;
  const origin = axes[0];
  const x = axes[1];
  const y = axes[2];
  const z = axes[3] || origin;
  return { origin, x, y, z };
};

export const scaleHeadAxes = (axes: HeadAxes, scale: number): HeadAxes => {
  const scalePoint = (point: HeadAxisPoint) => ({
    x: axes.origin.x + (point.x - axes.origin.x) * scale,
    y: axes.origin.y + (point.y - axes.origin.y) * scale
  });
  return {
    origin: axes.origin,
    x: scalePoint(axes.x),
    y: scalePoint(axes.y),
    z: scalePoint(axes.z)
  };
};

export const smoothHeadAxes = (prev: HeadAxes | null, next: HeadAxes, alpha: number): HeadAxes => {
  if (!prev) return next;
  const smoothPoint = (a: HeadAxisPoint, b: HeadAxisPoint) => ({
    x: a.x + (b.x - a.x) * alpha,
    y: a.y + (b.y - a.y) * alpha
  });
  return {
    origin: smoothPoint(prev.origin, next.origin),
    x: smoothPoint(prev.x, next.x),
    y: smoothPoint(prev.y, next.y),
    z: smoothPoint(prev.z, next.z)
  };
};

export const drawHeadAxes = (ctx: CanvasRenderingContext2D, axes: HeadAxes, mirrorWidth?: number) => {
  const mirror = (point: HeadAxisPoint) => (
    mirrorWidth !== undefined
      ? { x: mirrorWidth - point.x, y: point.y }
      : point
  );

  const origin = mirror(axes.origin);
  const axisList = [
    { label: 'X', point: axes.x, color: '#ef4444' },
    { label: 'Y', point: axes.y, color: '#22c55e' },
    { label: 'Z', point: axes.z, color: '#3b82f6' }
  ];

  ctx.save();
  ctx.lineWidth = 3;
  ctx.font = '12px sans-serif';
  axisList.forEach((axis) => {
    const end = mirror(axis.point);
    ctx.beginPath();
    ctx.strokeStyle = axis.color;
    ctx.moveTo(origin.x, origin.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.fillStyle = axis.color;
    ctx.fillText(axis.label, end.x + 4, end.y - 4);
  });
  ctx.restore();
};

export type PoseLandmark = NonNullable<Results['poseLandmarks']>[number];

export const getShoulderStatus = (angle: number) => {
  const absAngle = Math.abs(angle);
  if (absAngle < 1.5) return { text: '姿态端正', color: 'text-emerald-500', bgColor: 'bg-emerald-50' };
  if (absAngle < 3.5) return { text: '轻微高低肩', color: 'text-amber-500', bgColor: 'bg-amber-50' };
  return { text: '显著高低肩', color: 'text-rose-500', bgColor: 'bg-rose-50' };
};

export const getHeadStatus = (angle: number) => {
  if (angle < 12) return { text: '理想体态', color: 'text-emerald-500', bgColor: 'bg-emerald-50' };
  if (angle < 22) return { text: '轻度前倾', color: 'text-amber-500', bgColor: 'bg-amber-50' };
  return { text: '严重前倾', color: 'text-rose-500', bgColor: 'bg-rose-50' };
};

export const getHipStatus = (angle: number) => {
  const absAngle = Math.abs(angle);
  if (absAngle < 2.5) return { text: '结构稳定', color: 'text-emerald-500', bgColor: 'bg-emerald-50' };
  if (absAngle < 5) return { text: '轻微倾斜', color: 'text-amber-500', bgColor: 'bg-amber-50' };
  return { text: '骨盆失衡', color: 'text-rose-500', bgColor: 'bg-rose-50' };
};

export const getSeverityLabel = (severity: string) => {
  switch (severity) {
    case 'severe': return '严重';
    case 'moderate': return '中度';
    case 'mild': return '轻微';
    default: return '观察';
  }
};
