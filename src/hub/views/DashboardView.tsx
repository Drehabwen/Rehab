import React, { useMemo, useState } from 'react';
import { Plus, Users, ClipboardList, Clock, Search, Calendar, ArrowRight } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import type { Patient } from '@/types/patient';
import type { PatientStatus } from '../types';
import {
  getPatientDisplayName,
  getPatientAvatar,
  getPatientColor,
  getPatientSubtitle,
} from '@/lib/patient-utils';
import { PageTitleSection, StatePanel, UnifiedStatusBadge } from '@/components/layout';

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
  getPatientSessions: (patientId: string) => unknown[];
}

const statusMap: Record<PatientStatus, { text: string; tone: 'success' | 'processing' | 'warning' }> = {
  pending: { text: '待接诊', tone: 'warning' },
  assessing: { text: '评估中', tone: 'processing' },
  report: { text: '待报告', tone: 'processing' },
  completed: { text: '已完成', tone: 'success' },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  patients,
  patientsWithStatus,
  stats,
  onSelectPatient,
  onNewPatient,
  onSearchPatient,
  getPatientSessions,
}) => {
  const [keyword, setKeyword] = useState('');

  const filteredPatients = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return patientsWithStatus;
    return patientsWithStatus.filter((patient) => {
      const name = (patient.name || '').toLowerCase();
      return patient.id.toLowerCase().includes(q) || name.includes(q);
    });
  }, [keyword, patientsWithStatus]);

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner">
        <PageTitleSection
          title="患者管理"
          description={`今日 ${new Date().toLocaleDateString('zh-CN')} · 共 ${patients.length} 位患者记录`}
          right={<span className="status-badge status-disabled">门诊工作台</span>}
        />

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatsCard count={stats.pending} label="待接诊" icon={Plus} variant="primary" onClick={onNewPatient} />
          <StatsCard count={stats.assessing} label="评估中" icon={ClipboardList} variant="blue" />
          <StatsCard count={stats.report} label="待报告" icon={Clock} variant="amber" />
          <StatsCard count={stats.completed} label="已完成" icon={Users} variant="emerald" />
        </section>

        <section className="bento-card p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:justify-between">
          <label className="relative w-full lg:w-[420px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="按姓名或 ID 快速筛选"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-700 outline-none focus:border-antey-primary"
            />
          </label>

          <div className="flex items-center gap-2">
            <button onClick={onSearchPatient} className="btn-secondary">
              <Users size={16} />
              高级查找
            </button>
            <button onClick={onNewPatient} className="btn-primary">
              <Plus size={16} />
              新建患者
            </button>
          </div>
        </section>

        <section className="bento-card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 text-xs text-slate-500 grid grid-cols-[1.8fr_1fr_0.8fr_0.9fr_auto] gap-3">
            <span>患者信息</span>
            <span>最近更新</span>
            <span>接诊次数</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          {filteredPatients.length === 0 ? (
            <div className="p-6">
              <StatePanel
                title="暂无可显示的患者"
                description="可先新建患者，或调整搜索条件。"
                actions={
                  <>
                    <button onClick={onNewPatient} className="btn-primary">新建患者</button>
                    <button onClick={() => setKeyword('')} className="btn-secondary">清空筛选</button>
                  </>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredPatients.map((patient) => {
                const sessionCount = getPatientSessions(patient.id).length;
                const status = statusMap[patient.status];
                return (
                  <button
                    key={patient.id}
                    onClick={() => onSelectPatient(patient)}
                    className="w-full px-4 py-3 hover:bg-slate-50 transition-colors text-left grid grid-cols-[1.8fr_1fr_0.8fr_0.9fr_auto] gap-3 items-center"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-semibold ${getPatientColor(patient)}`}>
                        {getPatientAvatar(patient)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">{getPatientDisplayName(patient)}</div>
                        <div className="text-xs text-slate-500 truncate">{getPatientSubtitle(patient, sessionCount)}</div>
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 inline-flex items-center gap-1">
                      <Calendar size={12} className="text-slate-400" />
                      {new Date(patient.updatedAt).toLocaleDateString('zh-CN')}
                    </div>

                    <div className="text-sm text-slate-700 tabular-nums">{sessionCount}</div>

                    <UnifiedStatusBadge status={status.tone} text={status.text} />

                    <span className="inline-flex items-center justify-end text-xs text-antey-primary font-medium">
                      进入
                      <ArrowRight size={12} className="ml-1" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
