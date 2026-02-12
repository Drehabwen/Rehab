import React from 'react';
import { useCaseStore, NexusModuleData } from '@/store/useCaseStore';
import { FileText, CheckCircle2, Clock, AlertCircle, ChevronRight, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const NexusReportCenter: React.FC = () => {
  const { aggregatedReport, patientInfo } = useCaseStore();
  
  const modules = Object.values(aggregatedReport);
  const isReportEmpty = modules.length === 0;

  return (
    <div className="flex flex-col h-full bg-white/40 backdrop-blur-3xl border-l border-slate-200 shadow-2xl relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-antey-primary/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
      
      <div className="p-8 border-b border-slate-200/60 bg-white/40 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex flex-col">
            <h3 className="text-2xl font-black text-slate-900 flex items-center gap-2 tracking-tight">
              <div className="w-10 h-10 rounded-2xl bg-antey-primary flex items-center justify-center text-white shadow-lg shadow-antey-primary/20">
                <FileText size={20} />
              </div>
              综合报告
            </h3>
          </div>
          <div className="flex flex-col items-end">
            <span className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-[0.15em] shadow-lg shadow-slate-900/10">
              {modules.length} MODULES
            </span>
          </div>
        </div>
        
        <div className="group relative bg-white/60 backdrop-blur-md rounded-3xl p-5 border border-slate-200/50 shadow-sm transition-all hover:shadow-md hover:border-antey-primary/20">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
            <div className="w-1 h-3 bg-antey-primary rounded-full" />
            当前患者档案
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-lg">
                {patientInfo.name[0]}
              </div>
              <div className="flex flex-col">
                <span className="font-black text-slate-800 text-lg leading-none mb-1">{patientInfo.name}</span>
                <span className="text-xs font-bold text-slate-400">{patientInfo.gender} · {patientInfo.age}岁</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">ID: {patientInfo.case_id.slice(-4)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative z-10">
        {isReportEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-40 px-6">
            <div className="w-24 h-24 rounded-[2.5rem] bg-slate-100 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-[2.5rem] border-2 border-dashed border-slate-300 animate-[spin_10s_linear_infinite]" />
              <Clock size={40} className="text-slate-400" />
            </div>
            <div className="space-y-2">
              <p className="text-base font-black text-slate-600 uppercase tracking-widest">等待数据流转</p>
              <p className="text-xs font-medium text-slate-400 leading-relaxed">
                请在左侧工作区完成评估后<br/>
                点击“同步至综合报告”
              </p>
            </div>
          </div>
        ) : (
          modules.map((data: NexusModuleData) => (
            <ReportItem key={data.moduleId} data={data} />
          ))
        )}
      </div>

      {!isReportEmpty && (
        <div className="p-8 bg-white/60 backdrop-blur-xl border-t border-slate-200/60 space-y-4 relative z-10">
          <button className="group w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-[0.25em] shadow-2xl shadow-slate-900/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            生成最终病历 <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button className="py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
              <Share2 size={14} /> 分享
            </button>
            <button className="py-3.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
              <AlertCircle size={14} /> 驳回
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ReportItem: React.FC<{ data: NexusModuleData }> = ({ data }) => {
  const configs = {
    vision: { label: '体态评估', color: 'bg-antey-accent', icon: AlertCircle, bg: 'bg-antey-accent/5' },
    voice: { label: '语音问诊', color: 'bg-purple-500', icon: CheckCircle2, bg: 'bg-purple-500/5' },
    fms: { label: 'FMS 测试', color: 'bg-blue-500', icon: CheckCircle2, bg: 'bg-blue-500/5' },
    scale: { label: '量表分析', color: 'bg-emerald-500', icon: CheckCircle2, bg: 'bg-emerald-500/5' },
  };

  const config = configs[data.moduleId];

  return (
    <div className="group bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:border-antey-primary/20 transition-all duration-500 animate-in fade-in slide-in-from-right-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-2.5 h-2.5 rounded-full shadow-sm", config.color)} />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{config.label}</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg">
          <Clock size={10} className="text-slate-300" />
          <span className="text-[9px] font-bold text-slate-400">
            {new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      
      <div className={cn("p-4 rounded-2xl mb-4 border border-slate-50 transition-colors group-hover:bg-white", config.bg)}>
        <p className="text-sm font-bold text-slate-700 leading-relaxed">
          {data.summary}
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            data.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
          )}>
            <config.icon size={12} />
          </div>
          <span className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            data.status === 'confirmed' ? 'text-emerald-500' : 'text-amber-500'
          )}>
            {data.status === 'confirmed' ? '已确认' : '待复核'}
          </span>
        </div>
        <button className="flex items-center gap-1 text-[10px] font-black text-antey-primary uppercase tracking-widest group-hover:translate-x-1 transition-all">
          详情 <ChevronRight size={12} />
        </button>
      </div>
    </div>
  );
};
