import { useRef, useCallback, useEffect } from 'react';
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
  const lastResultsRef = useRef<Results | null>(null);
  const requestRef = useRef<number | null>(null);

  const draw = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const results = lastResultsRef.current;

    if (!video || !canvas) return;

    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (showSkeleton && results?.poseLandmarks) {
      const landmarksToDraw = isMirrored 
        ? results.poseLandmarks.map(lm => ({ ...lm, x: 1 - lm.x }))
        : results.poseLandmarks;

      drawConnectors(ctx, landmarksToDraw, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
      drawLandmarks(ctx, landmarksToDraw, { color: '#FF0000', lineWidth: 2, radius: 4 });
    }

    if (annotations && annotations.length > 0) {
      drawAnnotations(ctx, annotations, canvas.width, canvas.height, isMirrored);
    }

    if (headAxes) {
      drawHeadAxes(ctx, headAxes, isMirrored ? canvas.width : undefined);
    }

    requestRef.current = requestAnimationFrame(draw);
  }, [isMirrored, showSkeleton, annotations, headAxes]);

  // Start animation loop
  useEffect(() => {
    requestRef.current = requestAnimationFrame(draw);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [draw]);

  const handleResults = useCallback((results: Results) => {
    lastResultsRef.current = results;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (onResults && video && canvas) {
      onResults(results, video, canvas);
    }
  }, [onResults]);

  return {
    videoRef,
    canvasRef,
    handleResults
  };
}
