import React from 'react';
import { Plus, Users, ClipboardList, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import type { PatientStatus } from '../types';

interface Stats {
  pending: number;
  assessing: number;
  report: number;
  completed: number;
}

interface PatientWithStatus extends Patient {
  status: PatientStatus;
}

interface DashboardViewProps {
  patients: Patient[];
  patientsWithStatus: PatientWithStatus[];
  stats: Stats;
  getPatientLabel: (patient: Patient) => string;
  getStatusLabel: (status: PatientStatus) => string;
  getStatusColor: (status: PatientStatus) => string;
  onSelectPatient: (patient: Patient) => void;
  onShowNewSession: () => void;
  onShowSearch: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  patients,
  patientsWithStatus,
  stats,
  getPatientLabel,
  getStatusLabel,
  getStatusColor,
  onSelectPatient,
  onShowNewSession,
  onShowSearch
}) => {
  return (
    <div className="h-full p-8 overflow-y-auto custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
              患者管理
            </h1>
            <p className="text-slate-400 font-medium text-lg flex items-center gap-2">
              <span className="w-8 h-[1px] bg-slate-200" />
              今日共有 {patients.length} 位患者记录
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm">
              <div className="px-4 py-2 bg-white/80 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
              </div>
          </div>
        </section>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={onShowNewSession}
            className="group bento-card p-6 flex items-center justify-between hover:border-antey-primary/30 transition-all bg-gradient-to-br from-antey-primary/5 to-transparent"
          >
            <div>
              <div className="text-3xl font-black text-slate-900">{stats.pending}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">待接诊</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-antey-primary/10 flex items-center justify-center group-hover:bg-antey-primary group-hover:scale-110 transition-all">
              <Plus size={20} className="text-antey-primary group-hover:text-white" />
            </div>
          </button>
          
          <div className="bento-card p-6 flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-slate-900">{stats.assessing}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">评估中</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <ClipboardList size={20} className="text-blue-500" />
            </div>
          </div>
          
          <div className="bento-card p-6 flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-slate-900">{stats.report}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">待报告</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Clock size={20} className="text-amber-500" />
            </div>
          </div>
          
          <div className="bento-card p-6 flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-slate-900">{stats.completed}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">已完成</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <Users size={20} className="text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={onShowNewSession}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-antey-primary to-teal-600 text-white rounded-2xl shadow-lg shadow-antey-primary/20 hover:shadow-xl hover:shadow-antey-primary/30 transition-all hover:scale-[1.02]"
          >
            <Plus size={18} />
            <span className="text-[11px] font-black uppercase tracking-wider">新建患者</span>
          </button>
          
          <button 
            onClick={onShowSearch}
            className="flex items-center gap-3 px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-sm hover:shadow-lg hover:border-antey-primary/20 transition-all"
          >
            <Users size={18} className="text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-wider">查找患者</span>
          </button>
        </div>

        {patientsWithStatus.length > 0 ? (
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
              患者列表
            </h3>
            <div className="space-y-3">
              {patientsWithStatus.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className="w-full bento-card p-5 flex items-center justify-between hover:border-antey-primary/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-antey-primary/10 transition-colors">
                      <Users size={18} className="text-slate-400 group-hover:text-antey-primary transition-colors" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="px-2.5 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black tracking-wider">
                          {patient.id}
                        </span>
                        <span className="text-sm font-black text-slate-900">
                          {patient.name || '匿名患者'}
                        </span>
                      </div>
                      <div className="text-[10px] font-medium text-slate-400">
                        {getPatientLabel(patient)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider",
                      getStatusColor(patient.status)
                    )}>
                      {getStatusLabel(patient.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bento-card p-16 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
              <Users size={32} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2">暂无患者记录</h3>
            <p className="text-slate-400 mb-8">点击"新建患者"开始您的第一个接诊</p>
            <button 
              onClick={onShowNewSession}
              className="inline-flex items-center gap-2 px-8 py-4 bg-antey-primary text-white rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-teal-600 transition-all"
            >
              <Plus size={18} />
              新建患者
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
