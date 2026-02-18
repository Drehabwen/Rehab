import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowRight, Layers, Sparkles, ChevronRight, User, Accessibility, ScanFace } from 'lucide-react';
import type { AssessmentScope } from '../store/usePostureAssessmentStore';

export type AssessmentMode = 'realtime' | 'stepped';

interface EntryHubProps {
  onSelectMode: (mode: AssessmentMode, view: 'front' | 'side' | 'back') => void;
  onSelectScope: (scope: AssessmentScope) => void;
  selectedScope: AssessmentScope;
}

const scopeConfigs = [
  {
    id: 'full' as AssessmentScope,
    title: '全身评估',
    desc: '完整的全身体态分析',
    icon: Accessibility,
    color: 'from-antey-primary to-cyan-400',
    views: ['正面', '侧面', '背面'],
    features: ['肩颈评估', '胸椎评估', '髋膝踝评估', '完整体态分析']
  },
  {
    id: 'upper' as AssessmentScope,
    title: '上半身',
    desc: '肩颈、胸椎、圆肩、头前倾',
    icon: ScanFace,
    color: 'from-purple-500 to-pink-400',
    views: ['正面', '侧面'],
    features: ['高低肩', '圆肩', '头前倾', '胸椎曲度']
  },
  {
    id: 'lower' as AssessmentScope,
    title: '下半身',
    desc: '髋、膝、踝、骨盆前倾',
    icon: User,
    color: 'from-emerald-500 to-teal-400',
    views: ['正面', '侧面'],
    features: ['骨盆前倾', '膝超伸', 'O/X型腿', '踝关节']
  }
];

const modeConfigs = [
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
    desc: '经典引导式拍摄，通过多步拼接，大幅降低算力要求。推荐所有设备及复杂环境使用。',
    icon: Layers,
    color: 'from-emerald-500 to-teal-400',
    tag: '标准模式',
    features: ['低算力要求', '引导式拍摄', '多视角拼接']
  }
];

export const Vision3EntryHub: React.FC<EntryHubProps> = ({ 
  onSelectMode, 
  onSelectScope,
  selectedScope 
}) => {
  const currentScope = scopeConfigs.find(s => s.id === selectedScope) || scopeConfigs[0];

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 animate-in fade-in zoom-in-95 duration-200 overflow-y-auto">
      {/* 评估范围选择 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            选择评估范围
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {scopeConfigs.map((scope) => (
            <button
              key={scope.id}
              onClick={() => onSelectScope(scope.id)}
              className={cn(
                "group relative p-4 rounded-2xl text-left transition-all duration-300 border-2",
                selectedScope === scope.id
                  ? "bg-white border-antey-primary shadow-lg shadow-antey-primary/20 scale-[1.02]"
                  : "bg-white/60 border-transparent hover:bg-white hover:border-slate-200 hover:scale-[1.01]"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg",
                  "bg-gradient-to-br",
                  scope.color
                )}>
                  <scope.icon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "font-black text-sm transition-colors",
                    selectedScope === scope.id ? "text-slate-900" : "text-slate-700"
                  )}>
                    {scope.title}
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                    {scope.desc}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {scope.views.map(view => (
                  <span key={view} className={cn(
                    "px-2 py-1 rounded-md text-[9px] font-bold",
                    selectedScope === scope.id
                      ? "bg-antey-primary/10 text-antey-primary"
                      : "bg-slate-100 text-slate-500"
                  )}>
                    {view}
                  </span>
                ))}
              </div>

              {selectedScope === scope.id && (
                <div className={cn(
                  "absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-br animate-pulse",
                  scope.color
                )} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 当前范围说明 */}
      <div className="bg-gradient-to-r from-slate-50 to-white rounded-2xl p-4 border border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <div className={cn("w-2 h-2 rounded-full bg-gradient-to-br animate-pulse", currentScope.color)} />
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
            {currentScope.title} 评估重点
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentScope.features.map(f => (
            <span key={f} className="px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* 模式选择区 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            选择评估模式
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modeConfigs.map((mode) => (
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
                className="group relative bento-card-glass p-5 flex flex-col items-start text-left transition-all duration-500 bg-white/40 border-white/60 cursor-pointer hover:bg-white/60 hover:shadow-2xl active:scale-[0.98]"
              >
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-xl group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br text-white", mode.color)}>
                  <mode.icon size={24} />
                </div>
                
                <h3 className="text-lg font-black text-slate-900 mb-1 tracking-tight group-hover:text-antey-primary transition-colors">{mode.title}</h3>
                <p className="text-[11px] font-medium text-slate-500/80 leading-relaxed mb-3">
                  {mode.desc}
                </p>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {mode.features.map(f => (
                    <span key={f} className="px-3 py-1.5 bg-slate-100/80 rounded-lg text-[10px] font-bold text-slate-500 border border-slate-200/50">
                      {f}
                    </span>
                  ))}
                </div>

                <div className="w-full mt-auto">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectMode(mode.id as AssessmentMode, 'front');
                    }}
                    className={cn(
                      "group/btn w-full h-12 rounded-xl bg-gradient-to-r flex items-center justify-between px-4 text-white transition-all hover:scale-[1.02] active:scale-95 shadow-lg",
                      mode.color
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-white/20 rounded-lg">
                        <ArrowRight size={14} />
                      </div>
                      <span className="text-sm font-black tracking-tight">开始评估</span>
                    </div>
                    <ChevronRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部提示 */}
      <div className="flex flex-col items-center gap-2 opacity-30 pt-4">
        <div className="w-px h-8 bg-gradient-to-b from-slate-300 to-transparent" />
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Powered by Nexus AI</p>
      </div>
    </div>
  );
};
