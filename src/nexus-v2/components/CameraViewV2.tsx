import React, { useRef, useEffect } from 'react';
import { useCameraV2 } from '../hooks/useCameraV2';
import { cn } from '@/lib/utils';
import { VideoOff, AlertCircle, RefreshCw } from 'lucide-react';

interface CameraViewV2Props {
  isCameraOn: boolean;
  isMirrored?: boolean;
  className?: string;
  children?: React.ReactNode;
  onStreamReady?: (stream: MediaStream) => void;
}

/**
 * CameraViewV2 - 第二代共享摄像头组件
 * 核心设计：渲染层级极简，强力诊断反馈，高度兼容业务叠加层
 */
export const CameraViewV2: React.FC<CameraViewV2Props> = ({
  isCameraOn,
  isMirrored = true,
  className,
  children,
  onStreamReady
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { stream, error, isLoading, trackInfo, refresh } = useCameraV2(isCameraOn);

  useEffect(() => {
    if (videoRef.current && stream) {
      console.log('[CameraViewV2] Binding stream to video element');
      videoRef.current.srcObject = stream;
      onStreamReady?.(stream);
    }
  }, [stream, onStreamReady]);

  return (
    <div className={cn(
      "relative bg-slate-950 rounded-[2rem] overflow-hidden shadow-2xl group border border-white/10",
      className
    )}>
      {/* 1. 视频渲染层 (最底层) */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={cn(
          "absolute inset-0 w-full h-full object-cover transition-opacity duration-300",
          stream ? "opacity-100" : "opacity-0",
          isMirrored && "scale-x-[-1]"
        )}
      />

      {/* 2. 状态覆盖层 */}
      {!stream && !isLoading && !error && isCameraOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-400">
          <p className="animate-pulse">正在唤醒硬件...</p>
        </div>
      )}

      {/* 加载中 */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-4" />
          <p className="text-white font-medium">准备中...</p>
        </div>
      )}

      {/* 错误诊断 */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/90 text-white z-20 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">摄像头启动失败</h3>
          <p className="text-sm text-red-200 mb-6 max-w-xs">
            {error.name === 'NotReadableError' ? "摄像头被占用，请关闭其他视频软件" : error.message}
          </p>
          <button 
            onClick={refresh}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm font-bold flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            重试连接
          </button>
        </div>
      )}

      {/* 硬件静音提示 (硬件锁) */}
      {trackInfo?.muted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-10">
          <VideoOff className="h-12 w-12 text-orange-500 mb-4" />
          <p className="text-white font-bold text-lg">硬件隐私保护已开启</p>
          <p className="text-gray-400 text-sm mt-2">请检查笔记本物理开关或按 F8 键</p>
        </div>
      )}

      {/* 3. 业务叠加层 (最顶层) */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {children}
      </div>
    </div>
  );
};
