import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Results } from '@/lib/mediapipe-utils';
import { Video, VideoOff, Loader2 } from 'lucide-react';
import { useCameraStream } from '@/hooks/useCameraStream';
import { useMediaPipe } from '@/hooks/useMediaPipe';
import { useSkeletonRenderer } from '@/hooks/useSkeletonRenderer';
import { cn } from '@/lib/utils';
import {
  getContainedMediaRect,
  getSourceSizeForAspectRatio,
  WebcamAspectRatio
} from './webcamLayout';
import { 
  VisualAnnotation, 
  HeadAxes
} from '@/plugins/vision3/vision3-utils';

interface BaseWebcamViewProps {
  isCameraOn: boolean;
  onCameraToggle?: (enabled: boolean) => void;
  onResults?: (results: Results, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  isMirrored?: boolean;
  className?: string;
  children?: React.ReactNode;
  showSkeleton?: boolean;
  aspectRatio?: WebcamAspectRatio;
  annotations?: VisualAnnotation[];
  headAxes?: HeadAxes | null;
}

/**
 * BaseWebcamView - A stable foundation for all camera-based features.
 * Uses useSkeletonRenderer hook for skeleton drawing logic.
 */
export default function BaseWebcamView({
  isCameraOn,
  onCameraToggle,
  onResults,
  isMirrored = true,
  className,
  children,
  showSkeleton = true,
  aspectRatio = '4/3',
  annotations = [],
  headAxes = null
}: BaseWebcamViewProps) {
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [mediaRect, setMediaRect] = useState(() => {
    const fallbackSize = getSourceSizeForAspectRatio(aspectRatio);
    return {
      width: fallbackSize.width,
      height: fallbackSize.height
    };
  });
  const mediaViewportRef = useRef<HTMLDivElement | null>(null);

  const { stream, error: cameraError, isLoading: isCameraLoading } = useCameraStream(isCameraOn);

  const { videoRef, canvasRef, handleResults } = useSkeletonRenderer({
    isMirrored,
    showSkeleton,
    annotations,
    headAxes,
    onResults
  });

  const syncMediaRect = useCallback(() => {
    const viewport = mediaViewportRef.current;
    if (!viewport) return;

    const fallbackSize = getSourceSizeForAspectRatio(aspectRatio);
    const sourceWidth = videoRef.current?.videoWidth || fallbackSize.width;
    const sourceHeight = videoRef.current?.videoHeight || fallbackSize.height;

    const nextRect = getContainedMediaRect({
      containerWidth: viewport.clientWidth,
      containerHeight: viewport.clientHeight,
      sourceWidth,
      sourceHeight
    });

    if (!nextRect.width || !nextRect.height) return;

    setMediaRect(prev =>
      prev.width === nextRect.width && prev.height === nextRect.height ? prev : nextRect
    );
  }, [aspectRatio, videoRef]);

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
  }, [stream, isCameraOn, videoRef]);

  useEffect(() => {
    syncMediaRect();
  }, [syncMediaRect, isVideoReady, isCameraOn]);

  useEffect(() => {
    const viewport = mediaViewportRef.current;
    if (!viewport) return;

    syncMediaRect();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', syncMediaRect);
      return () => window.removeEventListener('resize', syncMediaRect);
    }

    const observer = new ResizeObserver(() => syncMediaRect());
    observer.observe(viewport);

    return () => observer.disconnect();
  }, [syncMediaRect]);

  const { isLoading: isModelLoading, error: modelError } = useMediaPipe(
    videoRef.current,
    handleResults,
    isCameraOn && !!stream
  );

  const error = cameraError || modelError;

  const aspectRatioClass = {
    '4/3': 'aspect-[4/3]',
    '16/9': 'aspect-video',
    'square': 'aspect-square'
  }[aspectRatio];

  return (
    <div className={cn(
      "relative bg-black rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/5",
      aspectRatioClass,
      className
    )}>
      {isCameraOn ? (
        <div className="absolute inset-0 w-full h-full">
          {/* Loading States */}
          {(isCameraLoading || isModelLoading) && !isVideoReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 z-30">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-3" />
              <p className="text-gray-400 text-xs animate-pulse">
                {isCameraLoading ? "正在启动摄像头..." : "正在初始化 AI 模型..."}
              </p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white z-40 p-4 text-center">
              <VideoOff className="h-10 w-10 text-red-500 mb-3" />
              <h3 className="text-lg font-bold mb-2">{cameraError ? '摄像头访问失败' : 'AI 模型加载失败'}</h3>
              <p className="text-gray-400 max-w-xs mb-4 text-xs">
                {cameraError 
                  ? (cameraError.message.includes("NotReadableError") || cameraError.message.includes("Device in use") 
                    ? "摄像头被其他程序占用，请关闭后重试。" 
                    : "请检查浏览器摄像头权限设置。")
                  : "无法加载 Mediapipe 模型，请检查网络连接或刷新页面。"}
              </p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-xs font-medium"
              >
                刷新页面
              </button>
            </div>
          )}

          <div
            ref={mediaViewportRef}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div
              data-testid="webcam-media-frame"
              className="relative"
              style={{
                width: `${mediaRect.width}px`,
                height: `${mediaRect.height}px`
              }}
            >
              {/* Video Layer */}
              <video
                ref={videoRef}
                data-testid="webcam-video"
                aria-label="Camera preview"
                className={cn(
                  "absolute inset-0 w-full h-full bg-gray-950 transition-opacity duration-500",
                  isVideoReady ? "opacity-100" : "opacity-0",
                  isMirrored && "scale-x-[-1]"
                )}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  setIsVideoReady(true);
                  syncMediaRect();
                }}
              />

              {/* AI/Skeleton Layer */}
              <canvas
                ref={canvasRef}
                data-testid="skeleton-overlay"
                role="img"
                aria-label="Pose skeleton overlay"
                className="absolute inset-0 w-full h-full pointer-events-none z-20"
              />
            </div>
          </div>

          {/* Overlay Content (passed from parent) */}
          <div className="absolute inset-0 z-30 pointer-events-none">
            {children}
          </div>
        </div>
      ) : (
        /* Camera Off State */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white z-10">
          <div className="bg-white/5 p-6 rounded-full mb-4 border border-white/10">
            <VideoOff className="h-10 w-10 text-gray-400" />
          </div>
          <p className="text-gray-400 text-sm font-medium">摄像头已关闭</p>
          {onCameraToggle && (
            <button 
              onClick={() => onCameraToggle(true)}
              className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition-all cursor-pointer active:scale-95 pointer-events-auto"
            >
              开启摄像头
            </button>
          )}
        </div>
      )}

      {/* Control Overlay */}
      {isCameraOn && onCameraToggle && (
        <button
          onClick={() => onCameraToggle(!isCameraOn)}
          className="absolute top-4 right-4 p-2.5 rounded-xl bg-black/40 text-white hover:bg-black/60 transition-all pointer-events-auto z-40 cursor-pointer opacity-0 group-hover:opacity-100"
        >
          {isCameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </button>
      )}
    </div>
  );
}
