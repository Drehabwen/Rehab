import { useRef, useCallback } from 'react';
import { Results, POSE_CONNECTIONS } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { 
  VisualAnnotation, 
  HeadAxes, 
  drawAnnotations, 
  drawHeadAxes 
} from '@/plugins/vision3/vision3-utils';

interface UseSkeletonRendererOptions {
  isMirrored?: boolean;
  showSkeleton?: boolean;
  annotations?: VisualAnnotation[];
  headAxes?: HeadAxes | null;
  onResults?: (results: Results, video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
}

interface UseSkeletonRendererReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  handleResults: (results: Results) => void;
}

export function useSkeletonRenderer({
  isMirrored = true,
  showSkeleton = true,
  annotations = [],
  headAxes = null,
  onResults
}: UseSkeletonRendererOptions): UseSkeletonRendererReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const handleResults = useCallback((results: Results) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    console.log('[SkeletonRenderer] handleResults called! results:', !!results, 'poseLandmarks:', !!results?.poseLandmarks);

    if (!video || !canvas) {
      console.warn('[useSkeletonRenderer] Video or canvas not ready, skipping frame');
      return;
    }

    if (!results?.poseLandmarks) {
      console.log('[SkeletonRenderer] No pose landmarks detected');
      return;
    }

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[useSkeletonRenderer] Failed to get 2D context');
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showSkeleton) {
      console.log('[SkeletonRenderer] Drawing skeleton, landmarks count:', results.poseLandmarks.length);
      const landmarksToDraw = isMirrored 
        ? results.poseLandmarks.map(lm => ({ ...lm, x: 1 - lm.x }))
        : results.poseLandmarks;

      drawConnectors(ctx, landmarksToDraw, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
      drawLandmarks(ctx, landmarksToDraw, { color: '#FF0000', lineWidth: 2, radius: 4 });
    } else {
      console.log('[SkeletonRenderer] showSkeleton is false, skipping skeleton drawing');
    }

    if (annotations && annotations.length > 0) {
      drawAnnotations(ctx, annotations, canvas.width, canvas.height, isMirrored);
    }

    if (headAxes) {
      drawHeadAxes(ctx, headAxes, isMirrored ? canvas.width : undefined);
    }

    if (onResults) {
      onResults(results, video, canvas);
    }
  }, [isMirrored, showSkeleton, annotations, headAxes, onResults]);

  return {
    videoRef,
    canvasRef,
    handleResults
  };
}
