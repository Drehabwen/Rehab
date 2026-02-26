import { Results } from '@mediapipe/holistic';
import { PostureMetrics } from '@/types/posture';

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

export const generateAuxiliaryReport = (metrics: PostureMetrics): string => {
  const sections: string[] = [];
  
  sections.push('# 辅助诊断初步结论');
  sections.push('> **提示**：本结论由系统规则引擎自动计算生成，仅供参考。');
  
  sections.push('## 关键指标分析');
  
  if (metrics.headForward !== undefined) {
    const status = getHeadStatus(metrics.headForward);
    sections.push(`- **头部前倾**：${metrics.headForward.toFixed(1)}° (${status.text})`);
  }
  
  if (metrics.shoulderAngle !== undefined) {
    const status = getShoulderStatus(metrics.shoulderAngle);
    sections.push(`- **高低肩**：${Math.abs(metrics.shoulderAngle).toFixed(1)}° (${status.text})`);
  }
  
  if (metrics.hipAngle !== undefined) {
    const status = getHipStatus(metrics.hipAngle);
    sections.push(`- **骨盆倾斜**：${Math.abs(metrics.hipAngle).toFixed(1)}° (${status.text})`);
  }

  sections.push('\n## 建议');
  sections.push('根据初步计算结果，您可以：');
  sections.push('1. 点击下方 **“深度分析”** 按钮，获取 AI 专家的详细生物力学推导。');
  sections.push('2. 针对上述异常项，咨询康复科医生进行进一步核实。');

  return sections.join('\n');
};

export interface VisualAnnotation {
  type: 'line' | 'point' | 'angle' | 'text';
  points: { x: number; y: number }[];
  color?: string;
  label?: string;
  dashed?: boolean;
  dash?: number[];
  lineWidth?: number;
}

/**
 * 绘制后端同步的视觉标注
 * @param ctx Canvas Context
 * @param annotations 标注指令数组
 * @param width Canvas 宽度
 * @param height Canvas 高度
 * @param isMirrored 是否镜像
 */
export const drawAnnotations = (
  ctx: CanvasRenderingContext2D,
  annotations: VisualAnnotation[],
  width: number,
  height: number,
  isMirrored: boolean
) => {
  const transform = (p: { x: number; y: number }) => {
    const x = isMirrored ? (1 - p.x) * width : p.x * width;
    const y = p.y * height;
    return { x, y };
  };

  ctx.save();
  
  annotations.forEach((ann) => {
    const color = ann.color || '#00FF00';
    const lineWidth = ann.lineWidth || 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    
    if (ann.dashed) {
      ctx.setLineDash(ann.dash || [5, 5]);
    } else {
      ctx.setLineDash([]);
    }

    switch (ann.type) {
      case 'line':
        if (ann.points.length >= 2) {
          const p1 = transform(ann.points[0]);
          const p2 = transform(ann.points[1]);
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          
          if (ann.label) {
            ctx.font = 'bold 14px sans-serif';
            ctx.fillText(ann.label, (p1.x + p2.x) / 2 + 5, (p1.y + p2.y) / 2 - 5);
          }
        }
        break;

      case 'point':
        ann.points.forEach((p) => {
          const tp = transform(p);
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, 4, 0, Math.PI * 2);
          ctx.fill();
          if (ann.label) {
            ctx.font = '12px sans-serif';
            ctx.fillText(ann.label, tp.x + 8, tp.y + 4);
          }
        });
        break;

      case 'angle':
        if (ann.points.length >= 3) {
          const p1 = transform(ann.points[0]);
          const p2 = transform(ann.points[1]); // Vertex
          const p3 = transform(ann.points[2]);
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.stroke();

          if (ann.label) {
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(ann.label, p2.x + 10, p2.y - 10);
          }
        }
        break;

      case 'text':
        if (ann.points.length >= 1) {
          const tp = transform(ann.points[0]);
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText(ann.label || '', tp.x, tp.y);
        }
        break;
    }
  });

  ctx.restore();
};
