import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Results, POSE_CONNECTIONS } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Video, VideoOff, Loader2 } from 'lucide-react';
import { useCameraStream } from '@/hooks/useCameraStream';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { cn } from '@/lib/utils';

interface BaseWebcamViewProps {
  isCameraOn: boolean;
  onCameraToggle?: (enabled: boolean) => void;
  onResults?: (results: Results, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  isMirrored?: boolean;
  className?: string;
  children?: React.ReactNode; // For overlays like measurement info
  showSkeleton?: boolean;
  aspectRatio?: '4/3' | '16/9' | 'square';
}

/**
 * BaseWebcamView - A stable foundation for all camera-based features.
 * Handles: Stream sync, MediaPipe initialization, Canvas alignment, and skeletal drawing.
 */
export default function BaseWebcamView({
  isCameraOn,
  onCameraToggle,
  onResults,
  isMirrored = true,
  className,
  children,
  showSkeleton = true,
  aspectRatio = '4/3'
}: BaseWebcamViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  const { stream, error: cameraError, isLoading: isCameraLoading } = useCameraStream(isCameraOn);

  // Sync video source
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isCameraOn && stream) {
      if (video.srcObject !== stream) {
        console.log("[BaseWebcamView] Syncing stream to video");
        video.srcObject = stream;
        video.play().catch(err => console.error("[BaseWebcamView] Play error:", err));
      }
    } else {
      video.srcObject = null;
      setIsVideoReady(false);
    }
  }, [stream, isCameraOn]);

  // Handle results and drawing
  const handleResults = useCallback((results: Results) => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !results.poseLandmarks) return;

    // Ensure canvas matches video resolution
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      setIsVideoReady(true);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Drawing skeleton if enabled
    if (showSkeleton) {
      const landmarksToDraw = isMirrored 
        ? results.poseLandmarks.map(lm => ({ ...lm, x: 1 - lm.x }))
        : results.poseLandmarks;

      drawConnectors(ctx, landmarksToDraw, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 4 });
      drawLandmarks(ctx, landmarksToDraw, { color: '#FF0000', lineWidth: 2, radius: 2 });
    }

    // Pass results to parent for business logic
    if (onResults) {
      onResults(results, video, canvas);
    }
  }, [onResults, isMirrored, showSkeleton]);

  const { isLoading: isModelLoading } = useMediaPipe(
    videoRef.current,
    handleResults,
    isCameraOn && !!stream
  );

  const aspectRatioClass = {
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    'square': 'aspect-square'
  }[aspectRatio];

  return (
    <div className={cn(
      "relative bg-black rounded-[2.5rem] overflow-hidden shadow-2xl group ring-1 ring-white/10",
      aspectRatioClass,
      className
    )}>
      {isCameraOn ? (
        <div className="absolute inset-0 w-full h-full">
          {/* Loading States */}
          {(isCameraLoading || isModelLoading) && !isVideoReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-30">
              <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
              <p className="text-gray-400 text-sm animate-pulse">
                {isCameraLoading ? "正在启动摄像头..." : "正在初始化 AI 模型..."}
              </p>
            </div>
          )}

          {/* Camera Error */}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white z-40 p-6 text-center">
              <VideoOff className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-xl font-bold mb-2">摄像头访问失败</h3>
              <p className="text-gray-400 max-w-xs mb-6 text-sm">
                {cameraError.message.includes("NotReadableError") || cameraError.message.includes("Device in use") 
                  ? "摄像头被其他程序占用，请关闭后重试。" 
                  : "请检查浏览器摄像头权限设置。"}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm font-medium"
              >
                刷新页面
              </button>
            </div>
          )}

          {/* Video Layer */}
          <video
            ref={videoRef}
            className={cn(
              "absolute inset-0 w-full h-full object-contain bg-gray-950 transition-opacity duration-500",
              isVideoReady ? "opacity-100" : "opacity-0",
              isMirrored && "scale-x-[-1]"
            )}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setIsVideoReady(true)}
          />

          {/* AI/Skeleton Layer */}
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none z-20"
          />

          {/* Overlay Content (passed from parent) */}
          <div className="absolute inset-0 z-30 pointer-events-none">
            {children}
          </div>
        </div>
      ) : (
        /* Camera Off State */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white z-10">
          <div className="bg-white/5 p-8 rounded-full mb-6 border border-white/10 backdrop-blur-sm">
            <VideoOff className="h-12 w-12 text-gray-400" />
          </div>
          <p className="text-gray-400 text-lg font-medium">摄像头已关闭</p>
          <button 
            onClick={() => onCameraToggle?.(true)}
            className="mt-8 px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-bold transition-all shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 pointer-events-auto"
          >
            开启摄像头
          </button>
        </div>
      )}

      {/* Control Overlay */}
      {isCameraOn && (
        <button
          onClick={() => onCameraToggle?.(!isCameraOn)}
          className="absolute top-6 right-6 p-3 rounded-2xl bg-black/40 text-white hover:bg-black/60 transition-all backdrop-blur-xl border border-white/10 pointer-events-auto z-40 cursor-pointer opacity-0 group-hover:opacity-100 shadow-xl"
        >
          {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </button>
      )}
    </div>
  );
}
