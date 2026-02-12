import React, { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { 
  Video, VideoOff, Scan, RotateCcw, Square, Play, RefreshCw, Maximize2
} from 'lucide-react';

interface CameraControlsProps {
  isCameraOn: boolean;
  onToggleCamera: () => void;
  activeTab: 'posture' | 'rom';
  captureStatus: 'idle' | 'scanning' | 'countdown' | 'analyzing';
  onStartCapture: () => void;
  onSwitchView: () => void;
  isMeasuring: boolean;
  onStartMeasurement: () => void;
  onStopMeasurement: () => void;
  onResetMeasurement: () => void;
  onToggleFullscreen: () => void;
  isFullscreen: boolean;
}

export const CameraControls: React.FC<CameraControlsProps> = ({
  isCameraOn,
  onToggleCamera,
  activeTab,
  captureStatus,
  onStartCapture,
  onSwitchView,
  isMeasuring,
  onStartMeasurement,
  onStopMeasurement,
  onResetMeasurement,
  onToggleFullscreen,
  isFullscreen,
}) => {
  const handleKeyDown = (e: KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div 
      className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 p-6 bg-slate-900/60 backdrop-blur-3xl rounded-[3rem] border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-8 group-hover:translate-y-0 shadow-[0_40px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 z-30"
      role="toolbar"
      aria-label="相机控制面板"
    >
      <div className="flex items-center gap-4">
        <button 
          onClick={onToggleCamera}
          onKeyDown={(e) => handleKeyDown(e, onToggleCamera)}
          aria-label={isCameraOn ? '关闭摄像头' : '开启摄像头'}
          aria-pressed={isCameraOn}
          tabIndex={0}
          className={cn(
            "w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center gap-1.5 transition-all duration-500 relative group/btn",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
            isCameraOn 
              ? "bg-white/10 text-white hover:bg-white/20 hover:scale-110" 
              : "bg-rose-500/80 text-white shadow-2xl shadow-rose-500/40 hover:scale-110"
          )}
        >
          {isCameraOn ? <Video size={24} aria-hidden="true" /> : <VideoOff size={24} aria-hidden="true" />}
          <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">
            {isCameraOn ? '关闭' : '开启'}
          </span>
          {isCameraOn && (
            <span 
              className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" 
              aria-hidden="true" 
            />
          )}
        </button>
      </div>
      
      <div className="w-px h-14 bg-white/10" aria-hidden="true" />
      
      {activeTab === 'posture' ? (
        <div className="flex items-center gap-6">
          <button 
            onClick={onStartCapture}
            onKeyDown={(e) => handleKeyDown(e, onStartCapture)}
            disabled={captureStatus !== 'idle'}
            aria-label={captureStatus === 'idle' ? '开始全维度扫描' : '扫描进行中'}
            aria-busy={captureStatus !== 'idle'}
            tabIndex={captureStatus === 'idle' ? 0 : -1}
            className={cn(
              "px-10 h-16 rounded-[1.5rem] flex items-center gap-4 font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
              captureStatus === 'idle' 
                ? "bg-antey-primary text-white hover:bg-antey-primary/80 hover:scale-105 hover:shadow-antey-primary/40" 
                : "bg-white/10 text-white/40 cursor-not-allowed"
            )}
          >
            <Scan 
              size={24} 
              className={cn(captureStatus === 'scanning' && "animate-spin")} 
              aria-hidden="true" 
            />
            {captureStatus === 'idle' ? '开始全维度扫描' : captureStatus === 'countdown' ? '准备拍照...' : '分析中...'}
          </button>
          
          <button 
            onClick={onSwitchView}
            onKeyDown={(e) => handleKeyDown(e, onSwitchView)}
            aria-label="切换视角"
            tabIndex={0}
            className={cn(
              "w-16 h-16 rounded-[1.5rem] bg-white/10 text-white flex flex-col items-center justify-center gap-1.5 hover:bg-white/20 transition-all hover:scale-110",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            )}
          >
            <RotateCcw size={20} className="rotate-180" aria-hidden="true" />
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">切换视图</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <button 
            onClick={isMeasuring ? onStopMeasurement : onStartMeasurement}
            onKeyDown={(e) => handleKeyDown(e, isMeasuring ? onStopMeasurement : onStartMeasurement)}
            aria-label={isMeasuring ? '结束测量任务' : '启动关节采集'}
            aria-pressed={isMeasuring}
            tabIndex={0}
            className={cn(
              "px-10 h-16 rounded-[1.5rem] flex items-center gap-4 font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
              isMeasuring 
                ? "bg-rose-500 text-white hover:bg-rose-500/80 hover:scale-105" 
                : "bg-antey-accent text-white hover:bg-antey-accent/80 hover:scale-105 shadow-antey-accent/40"
            )}
          >
            {isMeasuring ? (
              <Square size={24} fill="currentColor" aria-hidden="true" />
            ) : (
              <Play size={24} fill="currentColor" aria-hidden="true" />
            )}
            {isMeasuring ? '结束测量任务' : '启动关节采集'}
          </button>

          <button 
            onClick={onResetMeasurement}
            onKeyDown={(e) => handleKeyDown(e, onResetMeasurement)}
            aria-label="重置测量"
            tabIndex={0}
            className={cn(
              "w-16 h-16 rounded-[1.5rem] bg-white/10 text-white flex flex-col items-center justify-center gap-1.5 hover:bg-white/20 transition-all hover:scale-110",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            )}
          >
            <RefreshCw size={20} aria-hidden="true" />
            <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">重置</span>
          </button>
        </div>
      )}

      <div className="w-px h-14 bg-white/10" aria-hidden="true" />

      <button 
        onClick={onToggleFullscreen}
        onKeyDown={(e) => handleKeyDown(e, onToggleFullscreen)}
        aria-label={isFullscreen ? '退出全屏' : '进入全屏'}
        tabIndex={0}
        className={cn(
          "w-12 h-12 rounded-xl bg-white/10 text-white/60 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        )}
      >
        <Maximize2 
          size={18} 
          className={cn(isFullscreen && "rotate-180")} 
          aria-hidden="true" 
        />
      </button>
    </div>
  );
};
