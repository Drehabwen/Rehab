import React from 'react';
import { Plus, Users, ClipboardList, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatsCard } from '../components/StatsCard';
import type { Patient } from '@/types/patient';
import type { PatientStatus } from '../types';

interface DashboardStats {
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
  stats: DashboardStats;
  onSelectPatient: (patient: Patient) => void;
  onNewPatient: () => void;
  onSearchPatient: () => void;
  getPatientLabel: (patient: PatientWithStatus) => string;
}

const statusLabels: Record<PatientStatus, string> = {
  pending: '待接诊',
  assessing: '评估中',
  report: '待报告',
  completed: '已完成'
};

const statusColors: Record<PatientStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  assessing: 'bg-blue-50 text-blue-600',
  report: 'bg-amber-50 text-amber-600',
  completed: 'bg-emerald-50 text-emerald-600'
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  patients,
  patientsWithStatus,
  stats,
  onSelectPatient,
  onNewPatient,
  onSearchPatient,
  getPatientLabel
}) => {
  return (
    <div className="h-full p-4 md:p-6 lg:p-8 overflow-y-auto touch-scroll-y custom-scrollbar">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6">
          <div className="space-y-1 md:space-y-2">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-none">
              患者管理
            </h1>
            <p className="text-slate-400 font-medium text-sm md:text-lg flex items-center gap-2">
              <span className="w-6 md:w-8 h-[1px] bg-slate-200" />
              今日共有 {patients.length} 位患者记录
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3 bg-white/50 backdrop-blur-md p-1.5 md:p-2 rounded-2xl border border-white/50 shadow-sm">
            <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white/80 rounded-xl text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </div>
          </div>
        </section>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 touch-scroll-x mobile-scroll pb-2 -mx-2 px-2 md:mx-0 md:px-0 md:pb-0 md:overflow-visible">
          <StatsCard
            count={stats.pending}
            label="待接诊"
            icon={Plus}
            variant="primary"
            onClick={onNewPatient}
          />
          <StatsCard
            count={stats.assessing}
            label="评估中"
            icon={ClipboardList}
            variant="blue"
          />
          <StatsCard
            count={stats.report}
            label="待报告"
            icon={Clock}
            variant="amber"
          />
          <StatsCard
            count={stats.completed}
            label="已完成"
            icon={Users}
            variant="emerald"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 md:gap-4">
          <button
            onClick={onNewPatient}
            className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-antey-primary to-teal-600 text-white rounded-2xl shadow-lg shadow-antey-primary/20 hover:shadow-xl hover:shadow-antey-primary/30 transition-all hover:scale-[1.02]"
          >
            <Plus size={16} className="md:size-[18px]" />
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider">新建患者</span>
          </button>

          <button
            onClick={onSearchPatient}
            className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-2.5 md:py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-sm hover:shadow-lg hover:border-antey-primary/20 transition-all"
          >
            <Users size={16} className="text-slate-400 md:size-[18px]" />
            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider">查找患者</span>
          </button>
        </div>

        {/* Patient List */}
        {patientsWithStatus.length > 0 ? (
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
              患者列表
            </h3>
            <div className="space-y-3 max-h-[50vh] md:max-h-none overflow-y-auto touch-scroll-y custom-scrollbar pr-1">
              {patientsWithStatus.map(patient => (
                <div
                  key={patient.id}
                  onClick={() => onSelectPatient(patient)}
                  className="w-full bento-card p-3 md:p-4 lg:p-5 flex flex-row items-center justify-between gap-2 md:gap-3 hover:border-antey-primary/30 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3 md:gap-5 min-w-0 flex-1">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-2xl bg-slate-100 flex items-center justify-center group-hover:bg-antey-primary/10 transition-colors shrink-0">
                      <Users size={16} className="text-slate-400 group-hover:text-antey-primary transition-colors md:size-[18px]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 md:gap-3 mb-1 flex-wrap">
                        <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-slate-900 text-white rounded-lg text-[9px] md:text-[10px] font-black tracking-wider shrink-0">
                          {patient.id}
                        </span>
                        <span className="text-xs md:text-sm font-black text-slate-900 truncate">
                          {patient.name || '匿名患者'}
                        </span>
                      </div>
                      <div className="text-[9px] md:text-[10px] font-medium text-slate-400 truncate">
                        {getPatientLabel(patient)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-3 shrink-0">
                    <span className={cn(
                      "px-2 md:px-3 py-1 md:py-1.5 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-wider whitespace-nowrap",
                      statusColors[patient.status]
                    )}>
                      {statusLabels[patient.status]}
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
              onClick={onNewPatient}
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
