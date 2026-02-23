import React, { useMemo } from 'react';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';
import { 
  BrainCircuit, 
  User,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThinkingFlow, THINKING_STEPS } from '../hooks/useThinkingFlow';

export const AssessmentOverlay: React.FC = () => {
  const { 
    step, 
    stabilityProgress, 
    captureProgress
  } = usePostureAssessmentStore();

  const { thinkingIdx, fakeProgress } = useThinkingFlow(step);

  const stabilityCircleProps = useMemo(() => {
    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - stabilityProgress / 100);
    return { circumference, offset };
  }, [stabilityProgress]);

  if (step === 'idle') return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center pointer-events-none p-12">
      {/* 1. Top Progress Indicator (Only for Split Mode) */}
      {(['prep_upper', 'capturing_upper', 'prep_lower', 'capturing_lower', 'stitching'].includes(step)) && (
        <div className="flex items-center gap-4 bg-white/40 backdrop-blur-3xl px-8 py-4 rounded-[2.5rem] border border-white/60 shadow-xl animate-in slide-in-from-top-8 duration-1000">
          <div className="flex items-center gap-3 pr-6 border-r border-slate-200/60">
            <LayoutGrid className="text-antey-primary" size={18} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">分段拼图评估</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                step === 'prep_upper' || step === 'capturing_upper' 
                  ? "bg-antey-primary text-white border-antey-primary shadow-lg scale-110" 
                  : (['prep_lower', 'capturing_lower', 'stitching', 'analyzing', 'completed'].includes(step)
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                      : "bg-slate-100 text-slate-400 border-slate-200")
              )}>
                <User size={18} />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phase 01</span>
                <span className="text-[11px] font-bold text-slate-900">上半身采样</span>
              </div>
            </div>

            <div className="w-8 h-px bg-slate-200" />

            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500",
                step === 'prep_lower' || step === 'capturing_lower'
                  ? "bg-antey-primary text-white border-antey-primary shadow-lg scale-110" 
                  : (['stitching', 'analyzing', 'completed'].includes(step)
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                      : "bg-slate-100 text-slate-400 border-slate-200")
              )}>
                <div className="relative">
                  <User size={18} />
                  <div className="absolute inset-x-0 top-0 h-1/2 bg-white/80 dark:bg-slate-900/80" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Phase 02</span>
                <span className="text-[11px] font-bold text-slate-900">下半身采样</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* 2. 动态取景框 - Apple Minimalist */}
        <div className={cn(
          "relative w-[340px] h-[520px] transition-all duration-1000 rounded-[4rem] border border-white/20",
          step.includes('prep') ? 'opacity-100 scale-100 bg-white/5 backdrop-blur-[2px]' : 'opacity-0 scale-110 pointer-events-none'
        )}>
          {/* Subtle Corner Accents */}
          <div className="absolute top-8 left-8 w-16 h-16 border-t-[1px] border-l-[1px] border-white/40 rounded-tl-[2rem]" />
          <div className="absolute top-8 right-8 w-16 h-16 border-t-[1px] border-r-[1px] border-white/40 rounded-tr-[2rem]" />
          <div className="absolute bottom-8 left-8 w-16 h-16 border-b-[1px] border-l-[1px] border-white/40 rounded-bl-[2rem]" />
          <div className="absolute bottom-8 right-8 w-16 h-16 border-b-[1px] border-r-[1px] border-white/40 rounded-br-[2rem]" />
          
          {/* Center Guide Line */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[1px] bg-white/20" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-[1px] bg-white/20" />
        </div>

        {/* 3. 状态提示文字 */}
        <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h2 className="text-4xl font-light text-white tracking-tight drop-shadow-2xl">
            {step === 'prep_upper' && '请正对摄像头 (上半身)'}
            {step === 'prep_lower' && '请向后退 (下半身)'}
            {step.includes('capturing') && '保持静止 采样中'}
            {step === 'stitching' && '骨骼拼合中...'}
            {step === 'analyzing' && 'AI 深度诊断中'}
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-antey-primary animate-pulse" />
            <p className="text-white/60 font-medium tracking-[0.2em] uppercase text-[10px]">
              {step.includes('prep') && 'Stability detection active'}
              {step.includes('capturing') && 'Capturing biomechanical data'}
              {step === 'analyzing' && 'LLM Semantic Processing'}
            </p>
          </div>
        </div>

        {/* 4. 核心进度/倒计时显示 */}
        <div className="mt-12 relative flex items-center justify-center">
          {/* 环形稳定性进度 (准备阶段) */}
          {step.includes('prep') && (
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="64" cy="64" r="58" stroke="rgba(255,255,255,0.05)" strokeWidth="4" fill="none" />
                <circle 
                  cx="64" cy="64" r="58" stroke="white" strokeWidth="4" fill="none"
                  strokeDasharray={stabilityCircleProps.circumference}
                  strokeDashoffset={stabilityCircleProps.offset}
                  className="transition-all duration-500 ease-out"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-white font-light text-3xl tracking-tighter">{Math.round(stabilityProgress)}%</span>
                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mt-1">Steady</span>
              </div>
            </div>
          )}

          {/* 采样进度条 (采样阶段) */}
          {step.includes('capturing') && (
            <div className="w-72 h-1.5 bg-white/10 rounded-full overflow-hidden backdrop-blur-3xl">
              <div 
                className="h-full bg-white transition-all duration-200 ease-linear shadow-[0_0_20px_rgba(255,255,255,0.5)]"
                style={{ width: `${captureProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* 5. AI 思维流 (分析阶段) - Premium Glassmorphism */}
        {step === 'analyzing' && (
          <div className="mt-12 bg-white/10 backdrop-blur-3xl px-12 py-10 rounded-[3.5rem] border border-white/20 w-[440px] pointer-events-auto animate-in zoom-in-95 duration-700 shadow-2xl">
            <div className="flex items-center gap-6 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 animate-pulse">
                <BrainCircuit className="text-white" size={28} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Diagnostic Engine</span>
                  <span className="text-2xl font-light text-white tracking-tighter">{Math.round(fakeProgress || 0)}%</span>
                </div>
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-white transition-all duration-500 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]"
                    style={{ width: `${fakeProgress || 0}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-5">
              {THINKING_STEPS.map((text, i) => (
                <div key={i} className={cn(
                  "flex items-center gap-4 transition-all duration-700",
                  i === thinkingIdx ? 'opacity-100 translate-x-3' : 'opacity-20 scale-95'
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    i < thinkingIdx ? "bg-emerald-400" : (i === thinkingIdx ? "bg-white animate-pulse" : "bg-white/20")
                  )} />
                  <span className={cn(
                    "text-[13px] font-medium tracking-tight",
                    i === thinkingIdx ? 'text-white' : 'text-white/40'
                  )}>
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}


      </div>
    </div>
  );
};
