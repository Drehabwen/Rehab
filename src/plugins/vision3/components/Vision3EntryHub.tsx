import React from 'react';
import { cn } from '@/lib/utils';
import { Scan, Activity, History, ArrowRight, Layers, Sparkles, ChevronRight } from 'lucide-react';

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

  const views: Array<{ id: 'front' | 'side' | 'back'; title: string; desc: string; icon: typeof Scan }> = [
    { id: 'front', title: '正面体态', desc: '评估 O/X 型腿、高低肩', icon: Scan },
    { id: 'side', title: '侧面体态', desc: '诊断头颈前倾、骨盆前倾', icon: Activity },
    { id: 'back', title: '背面体态', desc: '监测脊柱侧弯、足跟轴线', icon: History },
  ];

  return (
    <div className="flex-1 flex flex-col gap-12 p-8 animate-in fade-in zoom-in-95 duration-1000">
      {/* 模式选择区 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
        {modes.map((mode) => (
          <div key={mode.id} className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-2">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-antey-primary/20 bg-gradient-to-r",
                mode.color
              )}>
                {mode.tag}
              </span>
            </div>
            
            <div 
              onClick={() => onSelectMode(mode.id as AssessmentMode, 'front')}
              className="group relative bento-card-glass p-10 flex flex-col items-start text-left transition-all duration-500 bg-white/40 border-white/60 cursor-pointer hover:bg-white/60 hover:shadow-2xl active:scale-[0.98]"
            >
              <div className={cn("w-20 h-20 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br text-white", mode.color)}>
                <mode.icon size={40} />
              </div>
              
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-antey-primary transition-colors">{mode.title}</h3>
              <p className="text-[14px] font-medium text-slate-600/80 leading-relaxed mb-8">
                {mode.desc}
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                {mode.features.map(f => (
                  <span key={f} className="px-4 py-2 bg-slate-100/80 rounded-xl text-[11px] font-bold text-slate-500 border border-slate-200/50">
                    {f}
                  </span>
                ))}
              </div>

              {/* 视角选择子网格 (仅实时模式显示) */}
              {mode.id === 'realtime' ? (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full" onClick={(e) => e.stopPropagation()}>
                  {views.map((view) => (
                    <button
                      key={view.id}
                      onClick={() => onSelectMode('realtime', view.id)}
                      className="flex flex-col items-center gap-3 p-4 bg-white/60 hover:bg-white rounded-2xl border border-white transition-all hover:shadow-xl hover:scale-105 group/view"
                    >
                      <view.icon size={20} className="text-slate-400 group-hover/view:text-antey-primary transition-colors" />
                      <span className="text-[11px] font-black text-slate-900 tracking-tight">{view.title}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="w-full">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMode('stepped', 'front');
                    }}
                    className={cn(
                      "group/btn w-full h-20 rounded-2xl bg-gradient-to-r flex items-center justify-between px-8 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-emerald-500/20",
                      mode.color
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <ArrowRight size={24} />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Sequence Start</span>
                        <span className="text-lg font-black tracking-tight">开启分步引导评估</span>
                      </div>
                    </div>
                    <ChevronRight size={24} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              )}

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
