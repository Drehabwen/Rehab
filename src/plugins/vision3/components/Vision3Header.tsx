import React from 'react';
import { Activity, TrendingUp, RotateCcw, History, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="flex items-center justify-between bg-white/40 backdrop-blur-xl p-3 rounded-[2rem] border border-white/60 shadow-sm">
      <div className="flex items-center gap-4">
        {isEntryMode ? (
          <div className="flex p-1.5 bg-slate-100/50 rounded-2xl">
            <button 
              onClick={() => { setActiveTab('posture'); setIsEntryMode(true); }}
              className={cn(
                "px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3",
                activeTab === 'posture' 
                  ? "bg-white text-antey-primary shadow-lg shadow-antey-primary/5 ring-1 ring-slate-200" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              )}
            >
              <Activity size={16} className={cn("transition-transform duration-500", activeTab === 'posture' && "scale-110")} />
              体态评估
            </button>
            <button 
              onClick={() => setActiveTab('rom')}
              className={cn(
                "px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3",
                activeTab === 'rom' 
                  ? "bg-white text-antey-accent shadow-lg shadow-antey-accent/5 ring-1 ring-slate-200" 
                  : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
              )}
            >
              <TrendingUp size={16} className={cn("transition-transform duration-500", activeTab === 'rom' && "scale-110")} />
              关节测量
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsEntryMode(true)}
              className="group flex items-center gap-3 px-6 py-3 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all duration-300"
            >
              <RotateCcw size={16} className="text-antey-primary group-hover:rotate-[-45deg] transition-transform" />
              <span className="text-[11px] font-black uppercase tracking-widest">返回中心概览</span>
            </button>
            
            <div className="w-px h-8 bg-slate-200 mx-2" />
            
            <div className="flex p-1.5 bg-slate-100/50 rounded-2xl">
              {(['front', 'side', 'back'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2",
                    view === v 
                      ? "bg-white text-antey-primary shadow-md ring-1 ring-slate-200" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full", view === v ? "bg-antey-primary" : "bg-slate-300")} />
                  {v === 'front' ? '正面视角' : v === 'side' ? '侧面视角' : '背面视角'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-6 px-6">
        <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          系统就绪
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
