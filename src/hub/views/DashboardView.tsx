import React, { useMemo, useState } from 'react';
import { ClipboardList, FileText, Plus, Search, Stethoscope, Users, Cloud, Bell, AlertCircle, AlertTriangle } from 'lucide-react';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary } from '../workflow';
import type { PatientReminders } from '@/services/integrationService';
import { PageHeader, VisitCard } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';
import { getPatientPublicCode } from '@/lib/patient-utils';

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
  onOpenSyncPanel: () => void;
  remindersMap?: Map<string, PatientReminders>;
  totalOverdue?: number;
  totalDueSoon?: number;
  onRefreshReminders?: () => void;
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
  onOpenSyncPanel,
  remindersMap,
  totalOverdue = 0,
  totalDueSoon = 0,
  onRefreshReminders,
}) => {
  const [keyword, setKeyword] = useState('');

  const filteredTasks = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return visitTasks;

    return visitTasks.filter((task) => {
      return (
        getPatientPublicCode(task.patient).toLowerCase().includes(q) ||
        task.patient.id.toLowerCase().includes(q) ||
        task.patientName.toLowerCase().includes(q) ||
        task.visitId.toLowerCase().includes(q)
      );
    });
  }, [keyword, visitTasks]);

  // 有提醒的患者列表（按逾期数排序）
  const patientsWithReminders = useMemo(() => {
    if (!remindersMap || remindersMap.size === 0) return [];
    return Array.from(remindersMap.values())
      .filter(r => r.overdue_count > 0 || r.due_soon_count > 0)
      .sort((a, b) => b.overdue_count - a.overdue_count || b.due_soon_count - a.due_soon_count)
      .slice(0, 5);
  }, [remindersMap]);

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
              <Button variant="secondary" icon={<Cloud size={16} />} onClick={onOpenSyncPanel}>早筛同步</Button>
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

        {/* ── 待办提醒卡片 ── */}
        {(totalOverdue > 0 || totalDueSoon > 0) && (
          <Card variant="default" padding="lg" className="border-red-100 bg-red-50/60 shadow-[0_8px_24px_rgba(239,68,68,0.08)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-100 text-red-600">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">待办提醒</h3>
                  <p className="text-xs text-slate-500">以下患者的量表、处方或评估摘要需要关注</p>
                </div>
              </div>
              <button
                onClick={onRefreshReminders}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                title="刷新提醒"
              >
                刷新
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {patientsWithReminders.map(pr => {
                const patient = patients.find(p => p.id === pr.patient_id);
                const patientName = pr.patient_name || patient?.name || pr.patient_id;
                // 汇总逾期项目
                const overdueItems = pr.items.filter(it => it.status === 'overdue');
                const dueSoonItems = pr.items.filter(it => it.status === 'due_soon');

                return (
                  <button
                    key={pr.patient_id}
                    onClick={() => onSelectPatient(patient || { id: pr.patient_id, name: patientName } as Patient)}
                    className="flex items-start gap-3 rounded-xl border border-red-100 bg-white p-3 text-left transition-all hover:border-red-200 hover:shadow-sm"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-700 font-bold text-xs flex-shrink-0">
                      {patientName.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800 truncate">{patientName}</div>
                      <div className="mt-1 space-y-0.5">
                        {overdueItems.slice(0, 2).map(it => (
                          <div key={it.item_id} className="flex items-center gap-1 text-[11px] text-red-600">
                            <AlertCircle size={10} className="flex-shrink-0" />
                            <span className="truncate">{it.item_label}逾期{it.days_since_last}天</span>
                          </div>
                        ))}
                        {dueSoonItems.slice(0, overdueItems.length === 0 ? 2 : 1).map(it => {
                          const remaining = it.recommended_interval - (it.days_since_last ?? 0);
                          return (
                            <div key={it.item_id} className="flex items-center gap-1 text-[11px] text-amber-600">
                              <AlertTriangle size={10} className="flex-shrink-0" />
                              <span className="truncate">{it.item_label}还剩{remaining}天</span>
                            </div>
                          );
                        })}
                        {pr.items.filter(it => it.status === 'overdue' || it.status === 'due_soon').length > 2 && (
                          <div className="text-[10px] text-slate-400">
                            +{pr.items.filter(it => it.status === 'overdue' || it.status === 'due_soon').length - 2} 项更多
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        <Card variant="default" padding="md" className="border-slate-200 bg-white/90 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <label className="relative w-full lg:max-w-[460px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索患者姓名、患者编码或接诊号"
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
