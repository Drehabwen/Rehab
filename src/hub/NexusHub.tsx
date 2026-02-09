import React, { useState } from 'react';
import { HubSidebar } from './components/HubSidebar';
import { Bell, Camera, Mic, Search, Activity, ChevronRight, TrendingUp, Users, Calendar, ArrowUpRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

import { Vision3Plugin } from '@/plugins/vision3/Vision3Plugin';
import { MedVoicePlugin } from '@/plugins/medvoice/MedVoicePlugin';

export const NexusHub: React.FC = () => {
  const [activePlugin, setActivePlugin] = useState('dashboard');
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const plugins = [
    { id: 'dashboard', name: '总览', icon: Activity, color: 'text-antey-primary' },
    { id: 'vision3', name: '体态分析', icon: Camera, color: 'text-antey-accent' },
    { id: 'medvoice', name: '语音助手', icon: Mic, color: 'text-purple-500' },
  ];

  const stats = [
    { label: '今日接待', value: '12', trend: '+15%', icon: Users, color: 'bg-blue-500' },
    { label: '平均时长', value: '24m', trend: '-2m', icon: Clock, color: 'bg-teal-500' },
    { label: '康复评分', value: '92', trend: '+4.2', icon: TrendingUp, color: 'bg-indigo-500' },
  ];

  const recentActivities = [
    { name: '王晓明', type: '体态分析', time: '10:30 AM', status: '已完成' },
    { name: '张大爷', type: '关节测量', time: '11:15 AM', status: '待审核' },
    { name: '李女士', type: '步态评估', time: '02:00 PM', status: '准备中' },
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
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-antey-primary transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="搜索患者、记录或指令..." 
                className="bg-white/50 border border-slate-200/50 rounded-2xl py-2.5 pl-12 pr-6 text-sm w-80 focus:ring-4 focus:ring-antey-primary/5 focus:bg-white focus:border-antey-primary/20 transition-all outline-none"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <button className="relative p-2.5 text-slate-500 hover:bg-white hover:shadow-sm rounded-xl transition-all group">
                <Bell size={20} className="group-hover:scale-110 transition-transform" />
                <span className="absolute top-3 right-3 w-1.5 h-1.5 bg-red-500 rounded-full border-2 border-white"></span>
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
        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
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

              {/* Stats Bento Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bento-card glow-border p-8 group">
                    <div className="flex justify-between items-start mb-6">
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform duration-500", stat.color)}>
                        <stat.icon size={28} />
                      </div>
                      <div className={cn(
                        "flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider",
                        stat.trend.startsWith('+') ? "text-emerald-600 bg-emerald-50" : "text-blue-600 bg-blue-50"
                      )}>
                        {stat.trend.startsWith('+') ? <TrendingUp size={12} /> : <Clock size={12} />}
                        {stat.trend}
                      </div>
                    </div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{stat.label}</div>
                    <div className="text-5xl font-black text-slate-900 tracking-tighter group-hover:translate-x-1 transition-transform duration-500">{stat.value}</div>
                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                      <ArrowUpRight size={20} className="text-slate-200" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Tools Selector */}
                <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
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
                          {plugin.id === 'vision3' ? '基于计算机视觉的实时姿态评估与关键关节活动度分析系统。' : 'AI 驱动的病历录入与语音指令交互助手。'}
                        </p>
                      </div>

                      <div className="mt-12 flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-antey-primary opacity-40 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 duration-500">
                        立即启动模块 <div className="w-8 h-[1px] bg-antey-primary group-hover:w-12 transition-all" /> <ChevronRight size={16} />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Recent Activity Card */}
                <div className="lg:col-span-4 bento-card p-10 flex flex-col">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                      <span className="w-1 h-4 bg-antey-primary rounded-full" />
                      最近动态
                    </h3>
                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                      <Activity size={14} />
                    </div>
                  </div>
                  <div className="space-y-8 flex-1">
                    {recentActivities.map((activity, i) => (
                      <div key={i} className="flex items-center gap-5 group cursor-pointer">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-antey-primary group-hover:text-white group-hover:shadow-lg group-hover:shadow-antey-primary/20 transition-all duration-500">
                          <Users size={20} />
                        </div>
                        <div className="flex-1">
                          <div className="text-[13px] font-black text-slate-900 group-hover:text-antey-primary transition-colors">{activity.name}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{activity.type}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] font-bold text-slate-400 mb-1.5">{activity.time}</div>
                          <span className={cn(
                            "text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest",
                            activity.status === '已完成' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : 
                            activity.status === '待审核' ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"
                          )}>
                            {activity.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-10 py-5 rounded-[1.5rem] bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-antey-primary hover:text-white hover:shadow-xl hover:shadow-antey-primary/20 transition-all duration-500">
                    查看全部记录
                  </button>
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
      </main>
    </div>
  );
};
