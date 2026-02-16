import React from 'react';
import { 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Info,
  Layers,
  Sparkles,
  User,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PoseLandmark } from '../vision3-utils';

interface SteppedAssessmentOverlayProps {
  view: 'front' | 'side' | 'back';
  captureStatus: 'idle' | 'scanning' | 'countdown' | 'recording' | 'analyzing' | 'completed' | 'error';
  countdown: number;
  recordingProgress: number;
  isInPosition: boolean;
  steppedResults: Record<string, { timeSeriesLandmarks: PoseLandmark[][]; width: number; height: number; timestamp: number }>;
  onStartCapture: () => void;
  onNextView: () => void;
  onRetake: () => void;
  onFinish: () => void;
  onReset: () => void;
}

const VIEW_CONFIG = {
  front: { label: '正面', desc: '评估高低肩、骨盆倾斜', short: '正' },
  side: { label: '侧面', desc: '评估圆肩驼背、骨盆前倾', short: '侧' },
  back: { label: '背面', desc: '评估脊柱侧弯风险', short: '背' }
};

export const SteppedAssessmentOverlay: React.FC<SteppedAssessmentOverlayProps> = ({
  view,
  captureStatus,
  countdown,
  recordingProgress,
  isInPosition,
  steppedResults,
  onStartCapture,
  onNextView,
  onRetake,
  onFinish,
  onReset
}) => {
  const views: ('front' | 'side' | 'back')[] = ['front', 'side', 'back'];
  const capturedCount = Object.keys(steppedResults).length;
  const currentCaptured = steppedResults[view];

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center pointer-events-none p-8">
      <div className="flex items-center gap-4 bg-slate-900/90 px-6 py-3 rounded-2xl border border-white/20 shadow-2xl animate-in slide-in-from-top-8 duration-700">
        <button 
          onClick={onReset}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors pointer-events-auto"
        >
          <Home size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">首页</span>
        </button>
        
        <ChevronRight size={14} className="text-white/20" />
        
        <div className="flex items-center gap-2 text-white/60">
          <Layers size={14} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest">分步评估</span>
        </div>
        
        <ChevronRight size={14} className="text-white/20" />
        
        <div className="flex items-center gap-2 text-white">
          <span className="text-[10px] font-black uppercase tracking-widest">{VIEW_CONFIG[view].label}</span>
          <span className="text-[9px] text-white/40">({capturedCount + 1}/3)</span>
        </div>

        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/10">
          {views.map((v) => {
            const isCaptured = !!steppedResults[v];
            const isActive = view === v;
            return (
              <div 
                key={v} 
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black transition-all duration-300",
                  isActive ? "bg-white text-slate-900" :
                  isCaptured ? "bg-emerald-500/30 text-emerald-300" :
                  "bg-white/5 text-white/30"
                )}
              >
                {isCaptured ? <CheckCircle2 size={14} /> : VIEW_CONFIG[v].short}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-4">
            <Info size={12} className="text-emerald-400" />
            <span className="text-[10px] text-white/60 font-medium">{VIEW_CONFIG[view].desc}</span>
          </div>
          
          <h2 className="text-4xl font-light text-white tracking-tight drop-shadow-2xl">
            {captureStatus === 'idle' && `准备拍摄`}
            {captureStatus === 'scanning' && (!isInPosition ? '请正对摄像头' : '已就绪')}
            {captureStatus === 'countdown' && (
              <span className="text-6xl font-black tabular-nums animate-pulse">{countdown}</span>
            )}
            {captureStatus === 'recording' && '采集中...'}
            {captureStatus === 'completed' && `拍摄完成`}
          </h2>
        </div>

        {captureStatus === 'recording' ? (
          <div className="w-72 space-y-3 animate-in fade-in zoom-in-95 duration-500">
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-100 ease-linear"
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">采集中</span>
              <span className="text-[9px] font-black text-white/40">{Math.round(recordingProgress)}%</span>
            </div>
          </div>
        ) : captureStatus === 'completed' && currentCaptured ? (
          <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-500">
            <div className="p-4 bg-emerald-500/20 rounded-full">
              <CheckCircle2 size={32} className="text-emerald-400" />
            </div>
            <p className="text-white/60 text-xs">数据已保存</p>
          </div>
        ) : captureStatus === 'scanning' && (
          <div className={cn(
            "px-6 py-3 rounded-2xl backdrop-blur-3xl border transition-all duration-500 flex items-center gap-3",
            isInPosition 
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
              : "bg-white/5 border-white/10 text-white/60"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              isInPosition ? "bg-emerald-400 animate-pulse" : "bg-white/20"
            )} />
            <span className="text-xs font-bold tracking-tight uppercase">
              {isInPosition ? '已就绪' : '检测中...'}
            </span>
          </div>
        )}
      </div>

      <div className="w-full max-w-3xl bg-slate-900/90 backdrop-blur-3xl p-6 rounded-2xl border border-white/20 flex items-center justify-between pointer-events-auto animate-in slide-in-from-bottom-12 duration-1000">
        <button 
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
        >
          <ChevronLeft size={16} />
          返回
        </button>

        <div className="flex items-center gap-3">
          {captureStatus === 'completed' ? (
            <>
              <button 
                onClick={onRetake}
                className="px-5 py-2.5 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all text-xs font-bold"
              >
                重拍
              </button>
              
              <button 
                onClick={onFinish}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
              >
                <Sparkles size={14} />
                分析
              </button>

              {view !== 'back' && (
                <button 
                  onClick={onNextView}
                  className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-xl text-xs font-bold transition-all hover:bg-slate-100"
                >
                  下一步
                  <ChevronRight size={14} />
                </button>
              )}
            </>
          ) : (
            <button 
              onClick={onStartCapture}
              disabled={captureStatus !== 'idle'}
              className={cn(
                "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all",
                captureStatus === 'idle' 
                  ? "bg-white text-slate-900 hover:bg-slate-100" 
                  : "bg-white/10 text-white/30 cursor-not-allowed"
              )}
            >
              <Camera size={18} />
              <span>{captureStatus === 'idle' ? '拍摄' : '处理中...'}</span>
            </button>
          )}
        </div>

        <div className="flex gap-1">
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={cn(
                "w-6 h-1 rounded-full transition-all duration-500",
                i <= capturedCount ? "bg-emerald-400" : "bg-white/10"
              )} 
            />
          ))}
        </div>
      </div>
    </div>
  );
}; 
