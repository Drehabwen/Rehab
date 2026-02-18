import { useRef, useCallback } from 'react';
import { POSE_CONNECTIONS } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import type { VisualAnnotation, PostureIssue, Landmark } from '@/hooks/usePostureWS';

export interface UseResultCanvasProps {
  view: 'front' | 'back' | 'side';
  setResult: (result: any) => void;
}

export interface UseResultCanvasReturn {
  reportCanvasRef: React.RefObject<HTMLCanvasElement>;
  drawResultCanvas: (
    imageSrc: string, 
    landmarks: Landmark[], 
    issues: PostureIssue[], 
    annotations?: VisualAnnotation[]
  ) => void;
}

export const useResultCanvas = ({
  view,
  setResult
}: UseResultCanvasProps): UseResultCanvasReturn => {
  const reportCanvasRef = useRef<HTMLCanvasElement>(null);

  const drawResultCanvas = useCallback((
    imageSrc: string, 
    landmarks: Landmark[], 
    issues: PostureIssue[], 
    annotations: VisualAnnotation[] = []
  ) => {
    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      const canvas = reportCanvasRef.current;
      if (!canvas) return;

      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.save();
      if (view === 'front') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(img, 0, 0);
      ctx.restore();

      drawConnectors(ctx, landmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
      drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });

      annotations.forEach(anno => {
        if (anno.type === 'line' && anno.points.length >= 2) {
          ctx.beginPath();
          ctx.strokeStyle = anno.color || '#3b82f6';
          ctx.lineWidth = anno.lineWidth || 2;

          if (anno.dash) ctx.setLineDash(anno.dash);
          else if (anno.dashed) ctx.setLineDash([5, 5]);
          else ctx.setLineDash([]);

          ctx.moveTo(anno.points[0].x, anno.points[0].y);
          ctx.lineTo(anno.points[1].x, anno.points[1].y);
          ctx.stroke();
          ctx.setLineDash([]);

          if (anno.label) {
            ctx.fillStyle = anno.color || '#3b82f6';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(anno.label, anno.points[1].x + 5, anno.points[1].y);
          }
        } else if (anno.type === 'point' && anno.points.length >= 1) {
          ctx.fillStyle = anno.color || 'red';
          ctx.beginPath();
          ctx.arc(anno.points[0].x, anno.points[0].y, 6, 0, 2 * Math.PI);
          ctx.fill();

          if (anno.label) {
            ctx.fillStyle = anno.color || 'red';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(anno.label, anno.points[0].x + 8, anno.points[0].y);
          }
        }
      });

      setResult(prev => prev ? { ...prev, image: canvas.toDataURL() } : null);
    };
  }, [view, setResult]);

  return {
    reportCanvasRef,
    drawResultCanvas
  };
};
