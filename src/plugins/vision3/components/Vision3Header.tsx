import React from 'react';
import { Activity, TrendingUp, RotateCcw, History, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VIEW_LABEL_TEXTS, SYSTEM_TEXTS } from '../constants/uiText';
import { COLORS, SIZES, TRANSITIONS, SHADOWS, BACKDROP } from '@/constants/uiStyles';

export type ActiveTab = 'posture' | 'rom';
export type ViewType = 'front' | 'side' | 'back';

interface Vision3HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isEntryMode: boolean;
  setIsEntryMode: (mode: boolean) => void;
  view: ViewType;
  setView: (view: ViewType) => void;
}

export const Vision3Header: React.FC<Vision3HeaderProps> = ({
  activeTab,
  setActiveTab,
  isEntryMode,
  setIsEntryMode,
  view,
  setView
}) => {
  return (
    <div className={`flex items-center justify-between bg-white/40 ${BACKDROP.md} p-3 ${SIZES.radius.pill} border border-white/60 ${SHADOWS.sm}`}>
      <div className={`flex items-center ${SIZES.gap.lg}`}>
        {isEntryMode ? (
          <div className="flex p-1.5 bg-slate-100/50 rounded-2xl">
            <button 
              onClick={() => { setActiveTab('posture'); setIsEntryMode(true); }}
              className={cn(
                `${SIZES.padding.xl} ${SIZES.radius.md} ${SIZES.font.lg} font-black uppercase tracking-[0.2em] ${TRANSITIONS.medium} flex items-center ${SIZES.gap.md}`,
                activeTab === 'posture' 
                  ? `${COLORS.neutral.white} ${COLORS.antey.primaryText} ${SHADOWS.lg} shadow-antey-primary/5 ring-1 ring-slate-200` 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              )}
            >
              <Activity size={16} className={cn("transition-transform duration-500", activeTab === 'posture' && "scale-110")} />
              体态评估
            </button>
            <button 
              onClick={() => setActiveTab('rom')}
              className={cn(
                `${SIZES.padding.xl} ${SIZES.radius.md} ${SIZES.font.lg} font-black uppercase tracking-[0.2em] ${TRANSITIONS.medium} flex items-center ${SIZES.gap.md}`,
                activeTab === 'rom' 
                  ? `${COLORS.neutral.white} ${COLORS.antey.accentText} ${SHADOWS.lg} shadow-antey-accent/5 ring-1 ring-slate-200` 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              )}
            >
              <TrendingUp size={16} className={cn("transition-transform duration-500", activeTab === 'rom' && "scale-110")} />
              关节测量
            </button>
          </div>
        ) : (
          <div className={`flex items-center ${SIZES.gap.md}`}>
            <button 
              onClick={() => setIsEntryMode(true)}
              className="group flex items-center gap-3 px-6 py-3 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all duration-300"
            >
              <RotateCcw size={16} className="text-antey-primary group-hover:rotate-[-45deg] transition-transform" />
              <span className={`${SIZES.font.lg} font-black uppercase tracking-widest`}>返回中心概览</span>
            </button>
            
            <div className="w-px h-8 bg-slate-200 mx-2" />
            
            <div className="flex p-1.5 bg-slate-100/50 rounded-2xl">
              {(['front', 'side', 'back'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    `${SIZES.padding.lg} ${SIZES.radius.md} ${SIZES.font.md} font-black uppercase tracking-[0.2em] ${TRANSITIONS.slow} flex items-center ${SIZES.gap.sm}`,
                    view === v 
                      ? `${COLORS.neutral.white} ${COLORS.antey.primaryText} ${SHADOWS.md} ring-1 ring-slate-200` 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <div className={cn(`${SIZES.size.xs} ${SIZES.radius.full}`, view === v ? COLORS.antey.primary : "bg-slate-300")} />
                  {VIEW_LABEL_TEXTS[v]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className={`flex items-center ${SIZES.gap.xxl} px-6`}>
        <div className={`flex items-center ${SIZES.gap.md} ${SIZES.font.md} font-black ${COLORS.neutral.slateText} uppercase tracking-widest`}>
          <div className={`${SIZES.size.xs} ${SIZES.radius.full} ${COLORS.success.emerald} animate-pulse`} />
          {SYSTEM_TEXTS.ready}
          <span className="w-px h-4 bg-slate-200 mx-2" />
          <History size={14} className="text-slate-300" />
          {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')}
        </div>
        <button className="p-2.5 text-slate-400 hover:bg-white hover:text-antey-primary hover:shadow-sm rounded-xl transition-all duration-300">
          <Settings2 size={18} />
        </button>
      </div>
    </div>
  );
};
