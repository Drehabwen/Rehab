import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Clock3, FileText, Search, UserSquare2 } from 'lucide-react';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary } from '../workflow';
import { PageHeader } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { formatDate } from '@/lib/session-utils';

interface StudentsViewProps {
  patients: Patient[];
  visitTasks: VisitTaskSummary[];
  selectedPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  onOpenScreening: (patient: Patient) => void;
  onOpenReports: (patient: Patient) => void;
}

const getRiskLabel = (task?: VisitTaskSummary) => {
  if (!task) return { label: '未筛查', className: 'bg-slate-100 text-slate-600' };
  if (task.reportReady) return { label: '已建档', className: 'bg-emerald-100 text-emerald-700' };
  if (task.completedModules >= 2) return { label: '待复核', className: 'bg-amber-100 text-amber-700' };
  if (task.completedModules >= 1) return { label: '待完成', className: 'bg-blue-100 text-blue-700' };
  return { label: '待筛查', className: 'bg-slate-100 text-slate-600' };
};

export const StudentsView: React.FC<StudentsViewProps> = ({
  patients,
  visitTasks,
  selectedPatient,
  onSelectPatient,
  onOpenScreening,
  onOpenReports,
}) => {
  const [keyword, setKeyword] = useState('');

  const taskMap = useMemo(
    () => new Map(visitTasks.map((task) => [task.patient.id, task])),
    [visitTasks],
  );

  const filteredPatients = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((patient) => (
      patient.id.toLowerCase().includes(query) ||
      (patient.name ?? '').toLowerCase().includes(query)
    ));
  }, [keyword, patients]);

  const activeTask = selectedPatient ? taskMap.get(selectedPatient.id) : null;
  const activeRisk = getRiskLabel(activeTask ?? undefined);

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="学生建档 -> 历次筛查 -> 风险标签 -> 复测跟踪"
          title="学生档案"
          description="集中查看学生筛查历史、当前风险状态和后续处理动作。该页面承载后续的纵向趋势与复测闭环。"
          summary={(
            <>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                学生总数 {patients.length}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                已筛查 {visitTasks.filter((task) => task.hasAnyAssessment).length}
              </span>
            </>
          )}
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <Card variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-3">
              <label className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="搜索学生姓名或编号"
                  className="field-input pl-10"
                />
              </label>
            </div>

            <div className="mt-4 space-y-3">
              {filteredPatients.map((patient) => {
                const task = taskMap.get(patient.id);
                const risk = getRiskLabel(task);
                const active = selectedPatient?.id === patient.id;

                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => onSelectPatient(patient)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                      active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className={`text-sm font-semibold ${active ? 'text-white' : 'text-slate-900'}`}>{patient.name || patient.id}</div>
                        <div className={`mt-1 text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>编号 {patient.id}</div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${active ? 'bg-white/15 text-white' : risk.className}`}>
                        {risk.label}
                      </span>
                    </div>
                    <div className={`mt-3 grid grid-cols-2 gap-2 text-xs ${active ? 'text-slate-200' : 'text-slate-500'}`}>
                      <div>会话 {task?.sessionSequence ?? 0}</div>
                      <div>记录 {task?.completedModules ?? 0}/{task?.totalModules ?? 4}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            {!selectedPatient ? (
              <div className="flex min-h-[420px] items-center justify-center">
                <div className="text-center">
                  <UserSquare2 className="mx-auto text-slate-300" size={36} />
                  <div className="mt-4 text-lg font-semibold text-slate-900">选择一个学生档案</div>
                  <p className="mt-2 text-sm text-slate-500">左侧选择学生后，这里会显示当前筛查状态、最近记录和后续动作。</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Student Profile</div>
                    <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{selectedPatient.name || selectedPatient.id}</h2>
                    <p className="mt-2 text-sm text-slate-500">编号 {selectedPatient.id} · 最近更新 {formatDate(selectedPatient.updatedAt)}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${activeRisk.className}`}>{activeRisk.label}</span>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <Clock3 size={16} className="text-slate-500" />
                    <div className="mt-3 text-xs text-slate-500">最近会话</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">第 {activeTask?.sessionSequence ?? 0} 次</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <AlertTriangle size={16} className="text-slate-500" />
                    <div className="mt-3 text-xs text-slate-500">当前进度</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{activeTask?.completedModules ?? 0}/{activeTask?.totalModules ?? 4}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <FileText size={16} className="text-slate-500" />
                    <div className="mt-3 text-xs text-slate-500">报告状态</div>
                    <div className="mt-1 text-lg font-semibold text-slate-900">{activeTask?.reportReady ? '已生成' : '待生成'}</div>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] p-5">
                  <div className="text-sm font-semibold text-slate-900">档案摘要</div>
                  <div className="mt-3 space-y-3 text-sm text-slate-600">
                    <p>当前页面已切换为学生档案主视角。后续将继续补充趋势曲线、风险标签、跟进动作和监护人授权信息。</p>
                    <p>现阶段数据兼容使用既有患者与会话数据，因此名称仍沿用历史存储结构，后续再统一迁移为学生档案模型。</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button variant="primary" onClick={() => onOpenScreening(selectedPatient)}>
                    进入筛查工作台
                    <ArrowRight size={14} />
                  </Button>
                  <Button variant="secondary" onClick={() => onOpenReports(selectedPatient)}>
                    查看报告中心
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>
    </div>
  );
};
