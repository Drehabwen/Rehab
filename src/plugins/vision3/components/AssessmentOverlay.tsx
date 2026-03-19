import React, { useMemo } from 'react';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';
import { 
  BrainCircuit, 
  User,
  LayoutGrid
} from 'lucide-react';
import { COLORS } from '@/constants/uiStyles';
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
    const offset = circumference * (1 - (stabilityProgress || 0) / 100);
    return { circumference, offset };
  }, [stabilityProgress]);

  if (step === 'idle') return null;

  const topGlassClass = cn(
    'flex items-center gap-4 backdrop-blur-3xl px-8 py-4 rounded-[2.5rem] border shadow-xl animate-in slide-in-from-top-8 duration-1000',
    COLORS.neutral.whiteBg40,
    COLORS.neutral.whiteBorder60,
  );
  const phaseDividerClass = cn('w-8 h-px', COLORS.neutral.light.border.replace('border', 'bg'));
  const frameShellClass = cn(
    `relative w-[340px] h-[520px] transition-all duration-1000 rounded-[4rem] border ${COLORS.neutral.whiteBorder20}`,
    step.includes('prep') ? `${COLORS.neutral.whiteBg} opacity-100 scale-100 backdrop-blur-[2px]` : 'opacity-0 scale-110 pointer-events-none',
  );
  const phaseStateClass = (isCurrent: boolean, isDone: boolean) => cn(
    'w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500',
    isCurrent
      ? `bg-antey-primary ${COLORS.neutral.whiteText} border-antey-primary shadow-lg scale-110`
      : isDone
        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        : `${COLORS.neutral.slate100} ${COLORS.neutral.light.textLight} ${COLORS.neutral.light.border}`,
  );

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center pointer-events-none p-12">
      {/* 1. Top Progress Indicator (Only for Split Mode) */}
      {(['prep_upper', 'capturing_upper', 'prep_lower', 'capturing_lower', 'stitching'].includes(step)) && (
        <div className={topGlassClass}>
          <div className={cn('flex items-center gap-3 pr-6 border-r', `${COLORS.neutral.light.border}/60`)}>
            <LayoutGrid className="text-antey-primary" size={18} />
            <span className={cn('text-[10px] font-black uppercase tracking-[0.2em]', COLORS.neutral.light.text)}>分段拼图监控</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 group">
              <div className={phaseStateClass(
                step === 'prep_upper' || step === 'capturing_upper',
                ['prep_lower', 'capturing_lower', 'stitching', 'analyzing', 'completed'].includes(step),
              )}>
                <User size={18} />
              </div>
              <div className="flex flex-col">
                <span className={cn('text-[9px] font-black uppercase tracking-widest', COLORS.neutral.light.textLight)}>Phase 01</span>
                <span className={cn('text-[11px] font-bold', COLORS.neutral.light.text)}>上半身采样</span>
              </div>
            </div>

            <div className={phaseDividerClass} />

            <div className="flex items-center gap-3">
              <div className={phaseStateClass(
                step === 'prep_lower' || step === 'capturing_lower',
                ['stitching', 'analyzing', 'completed'].includes(step),
              )}>
                <div className="relative">
                  <User size={18} />
                  <div className={cn('absolute inset-x-0 top-0 h-1/2', COLORS.neutral.whiteBg80, COLORS.neutral.slateBg80)} />
                </div>
              </div>
              <div className="flex flex-col">
                <span className={cn('text-[9px] font-black uppercase tracking-widest', COLORS.neutral.light.textLight)}>Phase 02</span>
                <span className={cn('text-[11px] font-bold', COLORS.neutral.light.text)}>下半身采样</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* 2. 动态取景框 - Apple Minimalist */}
        <div className={frameShellClass}>
          {/* Subtle Corner Accents */}
          <div className={cn('absolute top-8 left-8 w-16 h-16 border-t-[1px] border-l-[1px] rounded-tl-[2rem]', COLORS.neutral.whiteBorder40)} />
          <div className={cn('absolute top-8 right-8 w-16 h-16 border-t-[1px] border-r-[1px] rounded-tr-[2rem]', COLORS.neutral.whiteBorder40)} />
          <div className={cn('absolute bottom-8 left-8 w-16 h-16 border-b-[1px] border-l-[1px] rounded-bl-[2rem]', COLORS.neutral.whiteBorder40)} />
          <div className={cn('absolute bottom-8 right-8 w-16 h-16 border-b-[1px] border-r-[1px] rounded-br-[2rem]', COLORS.neutral.whiteBorder40)} />
          
          {/* Center Guide Line */}
          <div className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-[1px]', COLORS.neutral.whiteBg20)} />
          <div className={cn('absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-[1px]', COLORS.neutral.whiteBg20)} />
        </div>

        {/* 3. 状态提示文字 */}
        <div className="mt-12 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h2 className={cn('text-4xl font-light tracking-tight drop-shadow-2xl', COLORS.neutral.whiteText)}>
            {step === 'prep_upper' && '请正对摄像头 (上半身)'}
            {step === 'prep_lower' && '请向后退 (下半身)'}
            {step.includes('capturing') && '保持静止 采样中'}
            {step === 'stitching' && '骨骼拼合中...'}
            {step === 'analyzing' && 'AI 深度分析中'}
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-1.5 h-1.5 rounded-full bg-antey-primary animate-pulse" />
            <p className={cn('font-medium tracking-[0.2em] uppercase text-[10px]', COLORS.neutral.whiteText60)}>
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
                <span className={cn('font-light text-3xl tracking-tighter', COLORS.neutral.whiteText)}>{Math.round(stabilityProgress)}%</span>
                <span className={cn('text-[9px] font-black uppercase tracking-widest mt-1', COLORS.neutral.whiteText40)}>Steady</span>
              </div>
            </div>
          )}

          {/* 采样进度条 (采样阶段) */}
          {step.includes('capturing') && (
            <div className={cn('w-72 h-1.5 rounded-full overflow-hidden backdrop-blur-3xl', COLORS.neutral.whiteBg10)}>
              <div 
                className={cn('h-full transition-all duration-200 ease-linear shadow-[0_0_20px_rgba(255,255,255,0.5)]', COLORS.neutral.white)}
                style={{ width: `${captureProgress}%` }}
              />
            </div>
          )}
        </div>

        {/* 5. AI 思维流 (分析阶段) - Premium Glassmorphism */}
        {step === 'analyzing' && (
          <div className={cn('mt-12 backdrop-blur-3xl px-12 py-10 rounded-[3.5rem] border w-[440px] pointer-events-auto animate-in zoom-in-95 duration-700 shadow-2xl', COLORS.neutral.whiteBg10, COLORS.neutral.whiteBorder20)}>
            <div className="flex items-center gap-6 mb-10">
              <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center border animate-pulse', COLORS.neutral.whiteBg10, COLORS.neutral.whiteBorder20)}>
                <BrainCircuit className={COLORS.neutral.whiteText} size={28} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-end mb-3">
                  <span className={cn('text-[10px] font-black uppercase tracking-[0.2em]', COLORS.neutral.whiteText40)}>Diagnostic Engine</span>
                  <span className={cn('text-2xl font-light tracking-tighter', COLORS.neutral.whiteText)}>{Math.round(fakeProgress)}%</span>
                </div>
                <div className={cn('w-full h-1 rounded-full overflow-hidden', COLORS.neutral.whiteBg)}>
                  <div 
                    className={cn('h-full transition-all duration-500 ease-out shadow-[0_0_15px_rgba(255,255,255,0.5)]', COLORS.neutral.white)}
                    style={{ width: `${fakeProgress}%` }}
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
                    i < thinkingIdx ? COLORS.success.emeraldLight : (i === thinkingIdx ? `${COLORS.neutral.white} animate-pulse` : COLORS.neutral.whiteBg20)
                  )} />
                  <span className={cn(
                    "text-[13px] font-medium tracking-tight",
                    i === thinkingIdx ? COLORS.neutral.whiteText : COLORS.neutral.whiteText40
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
