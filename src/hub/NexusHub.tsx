import React, { useState } from 'react';
import { HubSidebar } from './components/HubSidebar';
import { Bell, Camera, Mic, Search, Activity, ChevronRight, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Vision3Plugin } from '@/plugins/vision3/Vision3Plugin';
import { MedVoicePlugin } from '@/plugins/medvoice/MedVoicePlugin';
import { GlobalExport } from '@/components/GlobalExport';
import { NexusReportCenter } from './components/NexusReportCenter';
import { LayoutGrid, SplitSquareVertical } from 'lucide-react';

export const NexusHub: React.FC = () => {
  const [activePlugin, setActivePlugin] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'single' | 'integrated'>('single');
  
  const plugins = [
    { id: 'dashboard', name: '总览', icon: Activity, color: 'text-antey-primary' },
    { id: 'integrated', name: '全能工作站', icon: LayoutGrid, color: 'text-orange-500' },
    { id: 'vision3', name: '体态分析', icon: Camera, color: 'text-antey-accent' },
    { id: 'medvoice', name: '语音助手', icon: Mic, color: 'text-purple-500' },
  ];

  return (
    <div className="flex h-screen mesh-gradient font-sans text-slate-900 overflow-hidden">
      <HubSidebar 
        activeId={activePlugin} 
        onSelect={setActivePlugin} 
        isCollapsed={isCollapsed} 
        onToggle={() => setIsCollapsed(!isCollapsed)} 
      />
      
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Navigation */}
        <header className="h-20 border-b border-slate-200/60 bg-white/40 backdrop-blur-xl flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-antey-primary animate-pulse shadow-[0_0_8px_rgba(13,148,136,0.5)]" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">
                {activePlugin === 'dashboard' ? 'Nexus / Dashboard' : `Nexus / ${activePlugin.toUpperCase()}`}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="relative group hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-antey-primary transition-all duration-300" size={16} />
              <input 
                type="text" 
                placeholder="搜索患者、记录或指令..." 
                className="bg-slate-100/50 border border-slate-200/50 rounded-2xl py-2.5 pl-12 pr-6 text-sm w-80 focus:ring-4 focus:ring-antey-primary/10 focus:bg-white focus:border-antey-primary/20 transition-all outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2 p-1.5 bg-slate-100/50 rounded-2xl border border-slate-200/40">
              <GlobalExport />
              <button className="relative p-2.5 text-slate-500 hover:bg-white hover:text-antey-primary hover:shadow-sm rounded-xl transition-all group">
                <Bell size={18} className="group-hover:scale-110 transition-transform" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white animate-pulse"></span>
              </button>
              <button className="p-2.5 text-slate-500 hover:bg-white hover:shadow-sm rounded-xl transition-all group">
                <Calendar size={20} className="group-hover:scale-110 transition-transform" />
              </button>
            </div>

            <div className="flex items-center gap-4 pl-6 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-black text-slate-900 leading-none mb-1">李德胜 医生</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em]">高级康复专家</div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-antey-primary to-blue-600 p-0.5 shadow-lg shadow-antey-primary/20 hover:scale-105 transition-transform cursor-pointer">
                <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-[10px] font-black text-antey-primary">
                  DR
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className={cn(
            "flex-1 p-8 overflow-y-auto custom-scrollbar transition-all duration-500",
            activePlugin === 'integrated' ? "bg-slate-50/50" : ""
          )}>
            {activePlugin === 'dashboard' && (
              <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-2">
                    <h1 className="text-6xl font-black text-slate-900 tracking-tight leading-none">
                      下午好, <span className="text-gradient">李医生</span>
                    </h1>
                    <p className="text-slate-400 font-medium text-lg flex items-center gap-2">
                      <span className="w-8 h-[1px] bg-slate-200" />
                      “科技赋能康复，让每一步都更坚定。”
                    </p>
                  </div>
                  <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm">
                     <div className="px-4 py-2 bg-white/80 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                       2024.02.08
                     </div>
                     <div className="px-4 py-2 bg-antey-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-antey-primary/20 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                       工作站就绪
                     </div>
                  </div>
                </section>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Tools Selector */}
                  <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {plugins.slice(1).map(plugin => (
                      <button 
                        key={plugin.id}
                        onClick={() => setActivePlugin(plugin.id)}
                        className="group bento-card p-12 text-left h-full flex flex-col justify-between hover:border-antey-primary/20 transition-all"
                      >
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-antey-primary/5 to-transparent rounded-full group-hover:scale-150 transition-transform duration-1000 pointer-events-none" />
                        
                        <div>
                          <div className={cn("w-20 h-20 rounded-[2rem] bg-slate-50 flex items-center justify-center mb-10 group-hover:bg-white group-hover:shadow-2xl group-hover:shadow-antey-primary/20 transition-all duration-700", plugin.color)}>
                            <plugin.icon size={36} />
                          </div>
                          <h3 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">{plugin.name}</h3>
                          <p className="text-slate-400 font-medium leading-relaxed text-lg">
                            {plugin.id === 'vision3' ? '实时姿态评估与关键关节活动度分析。' : 
                             plugin.id === 'medvoice' ? 'AI 驱动的病历录入与语音交互。' :
                             '开启分屏模式，同时运行语音录入与体态分析。'}
                          </p>
                        </div>

                        <div className="mt-12 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-antey-primary opacity-40 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 duration-500">
                          立即启动模块 <div className="w-8 h-[1px] bg-antey-primary group-hover:w-12 transition-all" /> <ChevronRight size={16} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activePlugin === 'integrated' && (
              <div className="h-full flex flex-col gap-6 animate-in fade-in zoom-in-95 duration-700">
                <div className="grid grid-cols-2 gap-8 h-full min-h-0">
                  <div className="group/workspace bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col transition-all duration-500 hover:shadow-2xl hover:border-antey-primary/20">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-antey-accent/10 flex items-center justify-center text-antey-accent shadow-inner">
                          <Camera size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Module 01</span>
                          <span className="text-xs font-black uppercase tracking-widest text-slate-700">体态分析工作区</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Live Analysis</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                      <Vision3Plugin />
                    </div>
                  </div>

                  <div className="group/workspace bg-white/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col transition-all duration-500 hover:shadow-2xl hover:border-purple-500/20">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/30 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shadow-inner">
                          <Mic size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1">Module 02</span>
                          <span className="text-xs font-black uppercase tracking-widest text-slate-700">语音助手工作区</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">AI Processing</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                      <MedVoicePlugin />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePlugin === 'vision3' && (
              <div className="h-full">
                <Vision3Plugin />
              </div>
            )}

            {activePlugin === 'medvoice' && (
              <div className="h-full">
                <MedVoicePlugin />
              </div>
            )}
          </div>

          {/* Integrated Report Sidebar */}
          <div className={cn(
            "w-96 h-full transition-all duration-700 ease-in-out border-l border-slate-200",
            activePlugin === 'integrated' ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 w-0"
          )}>
            <NexusReportCenter />
          </div>
        </div>
      </main>
    </div>
  );
};
