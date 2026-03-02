import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Layers, Zap, ChevronRight } from 'lucide-react';
import { AssessmentType, ASSESSMENT_MODES } from '../store/usePostureAssessmentStore';
import { ASSESSMENT_TEXTS } from '../constants/uiText';
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS, SHADOWS } from '@/constants/uiStyles';

export type AssessmentMode = 'realtime' | 'stepped';

interface EntryHubProps {
  onSelectMode: (mode: AssessmentMode, view: 'front' | 'side' | 'back', assessmentType: AssessmentType) => void;
}

const MODE_CONFIG = {
  standard: {
    icon: Layers,
    color: 'from-emerald-500 to-teal-400',
  },
  quick: {
    icon: Zap,
    color: 'from-antey-primary to-cyan-400',
  },
};

export const Vision3EntryHub: React.FC<EntryHubProps> = ({ onSelectMode }) => {
  const modes: Array<{ id: AssessmentType; icon: typeof Layers; color: string }> = [
    { id: 'standard', ...MODE_CONFIG.standard },
    { id: 'quick', ...MODE_CONFIG.quick },
  ];

  return (
    <div className={`flex-1 flex flex-col ${SIZES.gap.md} p-3 ${ANIMATIONS.fadeIn} ${ANIMATIONS.zoomIn}`}>
      {/* 模式选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto w-full">
        {modes.map((mode) => (
          <div key={mode.id} className={`flex flex-col ${SIZES.gap.md}`}>
            <div className={`flex items-center ${SIZES.gap.sm} px-1`}>
              <span className={cn(
                `${SIZES.padding.xs} ${SIZES.radius.full} ${SIZES.font.sm} font-black uppercase tracking-[0.15em] text-white ${SHADOWS.md} bg-gradient-to-r`,
                mode.color
              )}>
                {ASSESSMENT_TEXTS[mode.id].badge}
              </span>
              <span className={`${SIZES.font.md} font-bold ${COLORS.neutral.slateText}`}>
                预计 {ASSESSMENT_TEXTS[mode.id].estimatedTime}
              </span>
            </div>
            
            <div 
              onClick={() => onSelectMode('stepped', 'front', mode.id)}
              className={`group relative bento-card-glass p-6 flex flex-col items-start text-left transition-all duration-500 ${COLORS.neutral.light.bgSoft}/40 border-white/60 cursor-pointer ${COLORS.neutral.light.hover}/60 hover:shadow-2xl active:scale-[0.98]`}
            >
              <div className={cn(`${SIZES.size.lg} rounded-[1.5rem] flex items-center justify-center mb-4 ${SHADOWS.lg} group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br text-white`, mode.color)}>
                <mode.icon size={32} />
              </div>
              
              <h3 className={`text-xl font-black ${COLORS.neutral.light.text} mb-2 tracking-tight group-hover:text-antey-primary transition-colors`}>
                {ASSESSMENT_TEXTS[mode.id].label}
              </h3>
              <p className={`text-[13px] font-medium ${COLORS.neutral.light.textMuted}/80 leading-relaxed mb-4`}>
                {ASSESSMENT_TEXTS[mode.id].fullDescription}
              </p>

              <div className={`flex flex-wrap ${SIZES.gap.sm} mb-4`}>
                {ASSESSMENT_TEXTS[mode.id].features.map(f => (
                  <span key={f} className={`px-4 py-2 ${COLORS.neutral.light.bgSoft}/80 rounded-xl text-[11px] font-bold ${COLORS.neutral.light.textMuted} border ${COLORS.neutral.light.borderSoft}/50`}>
                    {f}
                  </span>
                ))}
              </div>

              {/* 统一开始按钮 */}
              <div className="w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMode('stepped', 'front', mode.id);
                  }}
                  className={cn(
                    "group/btn w-full h-14 rounded-xl bg-gradient-to-r flex items-center justify-between px-6 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg",
                    mode.color
                  )}
                >
                  <div className={`flex items-center ${SIZES.gap.md}`}>
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <ArrowRight size={18} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`${SIZES.font.sm} font-black uppercase tracking-widest opacity-60`}>Start Assessment</span>
                      <span className={`${SIZES.font.xl} font-black tracking-tight`}>开始评估</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className={cn("absolute -bottom-10 -right-10 w-48 h-48 bg-gradient-to-br opacity-[0.03] rounded-full blur-3xl transition-all group-hover:opacity-[0.1] group-hover:scale-150", mode.color)} />
            </div>
          </div>
        ))}
      </div>

      {/* 底部装饰/提示 */}
      <div className={`flex flex-col items-center ${SIZES.gap.lg} opacity-40`}>
        <div className="w-px h-12 bg-gradient-to-b from-slate-300 to-transparent" />
        <p className={`${SIZES.font.md} font-black ${COLORS.neutral.slateText} uppercase tracking-[0.4em]`}>Choose your assessment type to proceed</p>
      </div>
    </div>
  );
};
