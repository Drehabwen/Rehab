import React, { useMemo, useState } from 'react';
import { ClipboardList, FileText, Plus, Search, Stethoscope, Users } from 'lucide-react';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary } from '../workflow';
import { PageHeader, VisitCard } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';

interface DashboardStats {
  totalPatients: number;
  pending: number;
  inProgress: number;
  readyForReport: number;
}

interface DashboardViewProps {
  patients: Patient[];
  visitTasks: VisitTaskSummary[];
  stats: DashboardStats;
  onSelectPatient: (patient: Patient) => void;
  onNewPatient: () => void;
  onSearchPatient: () => void;
}

const summaryCards = [
  {
    key: 'totalPatients',
    label: '接诊患者',
    icon: Users,
    accent: 'bg-slate-900 text-white',
  },
  {
    key: 'pending',
    label: '待开始接诊',
    icon: Stethoscope,
    accent: 'bg-amber-50 text-amber-700',
  },
  {
    key: 'inProgress',
    label: '评估进行中',
    icon: ClipboardList,
    accent: 'bg-blue-50 text-blue-700',
  },
  {
    key: 'readyForReport',
    label: '可进入报告',
    icon: FileText,
    accent: 'bg-emerald-50 text-emerald-700',
  },
] as const;

export const DashboardView: React.FC<DashboardViewProps> = ({
  patients,
  visitTasks,
  stats,
  onSelectPatient,
  onNewPatient,
  onSearchPatient,
}) => {
  const [keyword, setKeyword] = useState('');

  const filteredTasks = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return visitTasks;

    return visitTasks.filter((task) => {
      return task.patient.id.toLowerCase().includes(q) || task.patientName.toLowerCase().includes(q) || task.visitId.toLowerCase().includes(q);
    });
  }, [keyword, visitTasks]);

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="患者 -> 接诊 -> 评估 -> 报告"
          title="接诊中心"
          description="围绕当前接诊任务组织患者列表。每张卡片只回答三个问题：现在处理谁、当前进度到哪、下一步该做什么。"
          summary={
            <>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                今日 {new Date().toLocaleDateString('zh-CN')}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                共 {patients.length} 位患者
              </span>
            </>
          }
          actions={
            <>
              <Button variant="secondary" icon={<Users size={16} />} onClick={onSearchPatient}>搜索患者</Button>
              <Button variant="primary" icon={<Plus size={16} />} onClick={onNewPatient}>新建患者</Button>
            </>
          }
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.key} variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[30px] font-semibold leading-none text-slate-900 tabular-nums">{stats[card.key]}</div>
                    <div className="mt-2 text-sm text-slate-500">{card.label}</div>
                  </div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.accent}`}>
                    <Icon size={18} />
                  </div>
                </div>
              </Card>
            );
          })}
        </section>

        <Card variant="default" padding="md" className="border-slate-200 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative w-full lg:max-w-[460px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索患者姓名、患者 ID 或接诊 ID"
                className="field-input pl-10"
              />
            </label>
            <div className="text-sm text-slate-500">
              当前显示 <span className="font-semibold text-slate-900">{filteredTasks.length}</span> 个接诊任务
            </div>
          </div>
        </Card>

        {filteredTasks.length === 0 ? (
          <StatePanel
            title="暂无可显示的接诊任务"
            description="可以先新建患者，或调整筛选条件后再继续。"
            actions={
              <>
                <button onClick={onNewPatient} className="btn-primary">新建患者</button>
                <button onClick={() => setKeyword('')} className="btn-secondary">清空筛选</button>
              </>
            }
          />
        ) : (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {filteredTasks.map((task) => (
              <VisitCard key={`${task.patient.id}-${task.visitId}`} task={task} onOpen={() => onSelectPatient(task.patient)} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};
