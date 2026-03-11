import React, { useMemo, useState } from 'react';
import { Activity, ClipboardList, FileText, Layers, Mic } from 'lucide-react';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary } from '../workflow';
import { PageHeader, VisitCard } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';

type AssessmentFilter = 'all' | 'pending' | 'inProgress' | 'ready';

interface AssessmentCenterViewProps {
  visitTasks: VisitTaskSummary[];
  onSelectPatient: (patient: Patient) => void;
}

const filterLabels: Record<AssessmentFilter, string> = {
  all: '全部任务',
  pending: '待开始',
  inProgress: '评估中',
  ready: '可看报告',
};

const summaryDefinitions = [
  { key: 'pending', label: '待开始评估', icon: ClipboardList, accent: 'bg-amber-50 text-amber-700' },
  { key: 'inProgress', label: '进行中评估', icon: Activity, accent: 'bg-blue-50 text-blue-700' },
  { key: 'ready', label: '已完成评估', icon: FileText, accent: 'bg-emerald-50 text-emerald-700' },
] as const;

export const AssessmentCenterView: React.FC<AssessmentCenterViewProps> = ({
  visitTasks,
  onSelectPatient,
}) => {
  const [filter, setFilter] = useState<AssessmentFilter>('inProgress');

  const taskBuckets = useMemo(() => ({
    pending: visitTasks.filter((task) => task.completedModules === 0),
    inProgress: visitTasks.filter((task) => task.completedModules > 0 && task.completedModules < task.totalModules),
    ready: visitTasks.filter((task) => task.reportReady),
  }), [visitTasks]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return visitTasks;
    return taskBuckets[filter];
  }, [filter, taskBuckets, visitTasks]);

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="患者 -> 接诊 -> 评估 -> 报告"
          title="评估中心"
          description="这里专门用于安排和完成评估任务。先确定当前要处理的患者，再进入体态评估、ROM 评估和语音问诊。"
          summary={(
            <>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                当前接诊任务 {visitTasks.length}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                首屏只保留下一步操作
              </span>
            </>
          )}
        />

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.6fr]">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {summaryDefinitions.map((item) => {
              const Icon = item.icon;
              const value = taskBuckets[item.key].length;
              return (
                <Card key={item.key} variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[28px] font-semibold leading-none text-slate-900 tabular-nums">{value}</div>
                      <div className="mt-2 text-sm text-slate-500">{item.label}</div>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${item.accent}`}>
                      <Icon size={18} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card variant="default" padding="md" className="border-slate-200 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,1))] shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <div className="text-sm font-semibold text-slate-900">评估模块</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                { label: '体态评估', icon: Activity, accent: 'text-blue-600' },
                { label: 'ROM 评估', icon: Layers, accent: 'text-emerald-600' },
                { label: '语音问诊', icon: Mic, accent: 'text-violet-600' },
              ].map((module) => (
                <div key={module.label} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center">
                  <module.icon size={16} className={`mx-auto ${module.accent}`} />
                  <div className="mt-2 text-xs font-medium text-slate-600">{module.label}</div>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">当前评估任务</div>
              <p className="mt-1 text-sm text-slate-500">每张卡片只保留患者、接诊 ID、评估进度和下一步操作。</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'pending', 'inProgress', 'ready'] as AssessmentFilter[]).map((item) => (
                <Button
                  key={item}
                  variant={filter === item ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFilter(item)}
                >
                  {filterLabels[item]}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {filteredTasks.length === 0 ? (
          <StatePanel
            title="当前筛选范围内没有评估任务"
            description="可以切换到其他筛选条件，或先前往接诊中心选择新的患者。"
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
