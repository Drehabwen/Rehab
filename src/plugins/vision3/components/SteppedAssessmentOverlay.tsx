import React from 'react';
import { 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  Info,
  Layers,
  Sparkles,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PoseLandmark } from '../vision3-utils';

interface SteppedAssessmentOverlayProps {
  view: 'front' | 'side' | 'back';
  captureStatus: 'idle' | 'scanning' | 'countdown' | 'recording' | 'analyzing' | 'completed' | 'error';
  countdown: number;
  recordingProgress: number;
  isInPosition: boolean;
  steppedResults: Record<string, { timeSeriesLandmarks: PoseLandmark[]; width: number; height: number; timestamp: number }>;
  onStartCapture: () => void;
  onNextView: () => void;
  onRetake: () => void;
  onFinish: () => void;
  onReset: () => void;
}

const VIEW_CONFIG = {
  front: { label: '正视位', desc: '评估高低肩、骨盆倾斜' },
  side: { label: '侧视位', desc: '评估圆肩驼背、骨盆前倾' },
  back: { label: '背视位', desc: '评估脊柱侧弯风险' }
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
    <div className="absolute inset-0 z-50 flex flex-col items-center pointer-events-none p-12">
      {/* 1. 顶部多视角进度 */}
      <div className="flex items-center gap-4 bg-slate-900/80 px-8 py-4 rounded-[2.5rem] border border-white/20 shadow-2xl animate-in slide-in-from-top-8 duration-700">
        <div className="flex items-center gap-3 pr-6 border-r border-white/10">
          <Layers className="text-emerald-400" size={18} />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">分步拍摄进度</span>
        </div>
        
        <div className="flex items-center gap-8">
          {views.map((v) => {
            const isCaptured = !!steppedResults[v];
            const isActive = view === v;
            return (
              <div key={v} className="flex items-center gap-3 group">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                  isActive ? "bg-white text-slate-900 border-white shadow-lg scale-110" :
                  isCaptured ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                  "bg-white/5 text-white/30 border-white/10"
                )}>
                  {isCaptured ? <CheckCircle2 size={18} /> : <User size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className={cn(
                    "text-[9px] font-black uppercase tracking-widest",
                    isActive ? "text-white" : "text-white/40"
                  )}>{v}</span>
                  <span className={cn(
                    "text-[11px] font-bold",
                    isActive ? "text-white" : "text-white/60"
                  )}>{VIEW_CONFIG[v].label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* 2. 状态文字 */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
            <Info size={14} className="text-emerald-400" />
            <span className="text-[11px] text-white/80 font-medium">{VIEW_CONFIG[view].desc}</span>
          </div>
          
          <h2 className="text-5xl font-light text-white tracking-tight drop-shadow-2xl">
            {captureStatus === 'idle' && `准备拍摄${VIEW_CONFIG[view].label}`}
            {captureStatus === 'scanning' && (!isInPosition ? '请正对摄像头并保持全身可见' : '已就绪，准备拍摄')}
            {captureStatus === 'countdown' && (
              <span className="text-7xl font-black tabular-nums animate-pulse">{countdown}</span>
            )}
            {captureStatus === 'recording' && '正在采集时序数据...'}
            {captureStatus === 'completed' && `${VIEW_CONFIG[view].label}拍摄完成`}
          </h2>
        </div>

        {/* 3. 实时检测提示 或 拍摄预览 */}
        {captureStatus === 'recording' ? (
          <div className="w-80 space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-emerald-500 transition-all duration-100 ease-linear shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Recording Skeletal Data</span>
              <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{Math.round(recordingProgress)}%</span>
            </div>
          </div>
        ) : captureStatus === 'completed' && currentCaptured ? (
          <div className="relative w-64 h-96 rounded-[2rem] overflow-hidden border-4 border-emerald-500 bg-slate-900/50 flex flex-col items-center justify-center gap-6 shadow-2xl animate-in zoom-in-95 duration-500">
            <div className="p-6 bg-emerald-500/20 rounded-full">
              <CheckCircle2 size={48} className="text-emerald-400" />
            </div>
            <div className="text-center px-6">
              <p className="text-white font-black text-xs uppercase tracking-widest mb-2">Data Captured</p>
              <p className="text-white/40 text-[10px] leading-relaxed">
                2秒时序骨架关键点已成功保存，共采集约60帧数据。
              </p>
            </div>
          </div>
        ) : captureStatus === 'scanning' && (
          <div className={cn(
            "px-8 py-4 rounded-3xl backdrop-blur-3xl border transition-all duration-500 flex items-center gap-4",
            isInPosition 
              ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" 
              : "bg-white/5 border-white/10 text-white/60"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full",
              isInPosition ? "bg-emerald-400 animate-pulse" : "bg-white/20"
            )} />
            <span className="text-sm font-bold tracking-tight uppercase">
              {isInPosition ? 'Position Locked - Ready' : 'Scanning for Body Landmarks...'}
            </span>
          </div>
        )}
      </div>

      {/* 4. 底部控制栏 */}
      <div className="w-full max-w-4xl bg-white/10 backdrop-blur-3xl p-8 rounded-[3.5rem] border border-white/20 flex items-center justify-between pointer-events-auto animate-in slide-in-from-bottom-12 duration-1000">
        <div className="flex gap-4">
          <button 
            onClick={onReset}
            className="px-8 py-4 rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all font-bold text-sm"
          >
            返回入口
          </button>
        </div>

        <div className="flex items-center gap-8">
          {captureStatus === 'completed' ? (
            <div className="flex gap-4">
              <button 
                onClick={onRetake}
                className="px-8 py-4 rounded-2xl bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition-all font-bold text-sm"
              >
                重新拍摄
              </button>
              
              {/* 灵活选择：立即分析 或 下一步 */}
              <div className="flex gap-3 bg-white/5 p-1.5 rounded-[2.2rem] border border-white/10">
                <button 
                  onClick={onFinish}
                  className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white px-6 py-3.5 rounded-3xl font-bold text-sm transition-all"
                >
                  <Sparkles size={18} />
                  <span>立即生成报告</span>
                </button>

                {view !== 'back' && (
                  <button 
                    onClick={onNextView}
                    className="flex items-center gap-2 bg-white text-slate-900 px-8 py-3.5 rounded-3xl font-bold text-sm transition-all shadow-xl hover:scale-105 active:scale-95"
                  >
                    <span>下一步：{VIEW_CONFIG[views[views.indexOf(view) + 1]].label}</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button 
              onClick={onStartCapture}
              disabled={captureStatus !== 'idle'}
              className={cn(
                "flex items-center gap-3 px-10 py-5 rounded-[2rem] font-black text-lg transition-all shadow-2xl",
                captureStatus === 'idle' 
                  ? "bg-white text-slate-900 hover:scale-105 active:scale-95" 
                  : "bg-white/10 text-white/20 cursor-not-allowed"
              )}
            >
              <Camera size={24} />
              <span>{captureStatus === 'idle' ? '开始自动拍摄' : '自动拍摄中...'}</span>
            </button>
          )}
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">Current Progress</span>
          <div className="flex gap-1.5">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className={cn(
                  "w-8 h-1.5 rounded-full transition-all duration-500",
                  i <= capturedCount ? "bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]" : "bg-white/10"
                )} 
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 
