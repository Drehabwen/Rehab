import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Layers, Sparkles, ChevronRight } from 'lucide-react';

export type AssessmentMode = 'realtime' | 'stepped';

interface EntryHubProps {
  onSelectMode: (mode: AssessmentMode, view: 'front' | 'side' | 'back') => void;
}

export const Vision3EntryHub: React.FC<EntryHubProps> = ({ onSelectMode }) => {
  const modes = [
    {
      id: 'realtime',
      title: '全维度 AI 实时扫描',
      desc: '基于 MediaPipe 全身关键点追踪，实时捕捉身体细微偏差。推荐高端设备及光线充足环境使用。',
      icon: Sparkles,
      color: 'from-antey-primary to-cyan-400',
      tag: 'Pro 模式',
      features: ['实时 3D 骨架', '自动触发拍摄', '极速反馈']
    },
    {
      id: 'stepped',
      title: '分步拼接精准评估',
      desc: '经典引导式拍摄，通过“前-侧-后”三步拼接，大幅降低算力要求。推荐所有设备及复杂环境使用。',
      icon: Layers,
      color: 'from-emerald-500 to-teal-400',
      tag: '标准模式',
      features: ['低算力要求', '引导式拍摄', '多视角拼接']
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-3 p-3 animate-in fade-in zoom-in-95 duration-200">
      {/* 模式选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto w-full">
        {modes.map((mode) => (
          <div key={mode.id} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 px-1">
              <span className={cn(
                "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] text-white shadow-lg bg-gradient-to-r",
                mode.color
              )}>
                {mode.tag}
              </span>
            </div>
            
            <div 
              onClick={() => onSelectMode(mode.id as AssessmentMode, 'front')}
              className="group relative bento-card-glass p-6 flex flex-col items-start text-left transition-all duration-500 bg-white/40 border-white/60 cursor-pointer hover:bg-white/60 hover:shadow-2xl active:scale-[0.98]"
            >
              <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-4 shadow-2xl group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br text-white", mode.color)}>
                <mode.icon size={32} />
              </div>
              
              <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight group-hover:text-antey-primary transition-colors">{mode.title}</h3>
              <p className="text-[13px] font-medium text-slate-600/80 leading-relaxed mb-4">
                {mode.desc}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                {mode.features.map(f => (
                  <span key={f} className="px-4 py-2 bg-slate-100/80 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200/50">
                    {f}
                  </span>
                ))}
              </div>

              {/* 统一开始按钮 */}
              <div className="w-full">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectMode(mode.id as AssessmentMode, 'front');
                  }}
                  className={cn(
                    "group/btn w-full h-14 rounded-xl bg-gradient-to-r flex items-center justify-between px-6 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg",
                    mode.color
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-white/20 rounded-lg">
                      <ArrowRight size={18} />
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[9px] font-black uppercase tracking-widest opacity-60">Start Assessment</span>
                      <span className="text-sm font-black tracking-tight">开始评估</span>
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
      <div className="flex flex-col items-center gap-4 opacity-40">
        <div className="w-px h-12 bg-gradient-to-b from-slate-300 to-transparent" />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Choose your engine to proceed</p>
      </div>
    </div>
  );
};
