import React from 'react';
import { cn } from '@/lib/utils';
import { Scan, Activity, History, Layers, Sparkles, ChevronRight, ArrowRight } from 'lucide-react';

export type AssessmentMode = 'realtime' | 'stepped';

interface EntryHubProps {
  onSelectMode: (mode: AssessmentMode, view: 'front' | 'side' | 'back') => void;
}

export const Vision3EntryHub: React.FC<EntryHubProps> = ({ onSelectMode }) => {
  const modes = [
    {
      id: 'realtime',
      title: '实时扫描',
      desc: '单视角快速评估，适合初步筛查',
      icon: Sparkles,
      color: 'from-antey-primary to-cyan-400',
      tag: '快速模式',
      features: ['单视角分析', '即时反馈', '适合初筛']
    },
    {
      id: 'stepped',
      title: '分步评估',
      desc: '三视角拼接，适合深度诊断',
      icon: Layers,
      color: 'from-emerald-500 to-teal-400',
      tag: '标准模式',
      features: ['三视角拼接', '数据更全面', '深度分析']
    }
  ];

  const views: Array<{ id: 'front' | 'side' | 'back'; title: string; desc: string; icon: typeof Scan }> = [
    { id: 'front', title: '正面', desc: '高低肩、骨盆', icon: Scan },
    { id: 'side', title: '侧面', desc: '头前倾、驼背', icon: Activity },
    { id: 'back', title: '背面', desc: '脊柱侧弯', icon: History },
  ];

  return (
    <div className="flex-1 flex flex-col gap-8 p-8 animate-in fade-in zoom-in-95 duration-1000">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto w-full">
        {modes.map((mode) => (
          <div key={mode.id} className="flex flex-col gap-4">
            <div className="flex items-center gap-3 px-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg bg-gradient-to-r",
                mode.color
              )}>
                {mode.tag}
              </span>
            </div>
            
            <div className="group relative bento-card-glass p-8 flex flex-col items-start text-left transition-all duration-500 bg-white/40 border-white/60 hover:bg-white/60 hover:shadow-2xl">
              <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br text-white", mode.color)}>
                <mode.icon size={32} />
              </div>
              
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">{mode.title}</h3>
              <p className="text-[13px] font-medium text-slate-500 leading-relaxed mb-6">
                {mode.desc}
              </p>

              <div className="flex flex-wrap gap-2 mb-6">
                {mode.features.map(f => (
                  <span key={f} className="px-3 py-1.5 bg-slate-100/80 rounded-lg text-[10px] font-bold text-slate-500">
                    {f}
                  </span>
                ))}
              </div>

              {mode.id === 'realtime' ? (
                <div className="grid grid-cols-3 gap-3 w-full">
                  {views.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => onSelectMode('realtime', view.id)}
                      className="flex flex-col items-center gap-2 p-4 bg-white/80 hover:bg-white rounded-xl border border-slate-200/50 transition-all hover:shadow-lg hover:scale-105 active:scale-95"
                    >
                      <view.icon size={20} className="text-slate-400" />
                      <span className="text-[11px] font-black text-slate-700">{view.title}</span>
                      <span className="text-[9px] text-slate-400">{view.desc}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => onSelectMode('stepped', 'front')}
                  className={cn(
                    "group/btn w-full h-16 rounded-xl bg-gradient-to-r flex items-center justify-between px-6 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg",
                    mode.color
                  )}
                >
                  <div className="flex items-center gap-3">
                    <ArrowRight size={20} />
                    <span className="text-sm font-black">开始评估</span>
                  </div>
                  <ChevronRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
              )}

              <div className={cn("absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br opacity-[0.03] rounded-full blur-3xl transition-all group-hover:opacity-[0.08]", mode.color)} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 opacity-40">
        <div className="w-px h-8 bg-gradient-to-b from-slate-300 to-transparent" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">选择评估模式开始</p>
      </div>
    </div>
  );
};
