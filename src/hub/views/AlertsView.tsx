import React, { useMemo } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Clock3 } from 'lucide-react';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary } from '../workflow';
import { PageHeader, VisitCard } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';

interface AlertsViewProps {
  visitTasks: VisitTaskSummary[];
  onSelectPatient: (patient: Patient) => void;
  onOpenHistory: (patient: Patient) => void;
  onStartEvaluation: (patient: Patient) => void;
  canOpenHistory: boolean;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  visitTasks,
  onSelectPatient,
  onOpenHistory,
  onStartEvaluation,
  canOpenHistory,
}) => {
  const buckets = useMemo(() => {
    const pendingRetest = visitTasks.filter((task) => task.hasAnyAssessment && !task.reportReady);
    const highAttention = visitTasks.filter((task) => task.completedModules >= 2 && !task.reportReady);
    const reportReady = visitTasks.filter((task) => task.reportReady);

    return { pendingRetest, highAttention, reportReady };
  }, [visitTasks]);

  const highlightedTasks = useMemo(
    () => [...buckets.highAttention, ...buckets.pendingRetest.filter((task) => !buckets.highAttention.some((item) => item.patient.id === task.patient.id))],
    [buckets.highAttention, buckets.pendingRetest],
  );

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="异常关注 -> 待复测 -> 已完成报告"
          title="预警复测"
          description="先把需要复核和复测的学生显式列出来，避免筛查结束后失去后续跟踪。当前页面先基于会话完成度做兼容性预警映射。"
          summary={(
            <>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                待复测 {buckets.pendingRetest.length}
              </span>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                重点关注 {buckets.highAttention.length}
              </span>
            </>
          )}
        />

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <BellRing className="text-amber-600" size={18} />
            <div className="mt-4 text-3xl font-semibold text-slate-900 tabular-nums">{buckets.pendingRetest.length}</div>
            <div className="mt-2 text-sm text-slate-500">待复测对象</div>
          </Card>
          <Card variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <AlertTriangle className="text-rose-600" size={18} />
            <div className="mt-4 text-3xl font-semibold text-slate-900 tabular-nums">{buckets.highAttention.length}</div>
            <div className="mt-2 text-sm text-slate-500">重点关注对象</div>
          </Card>
          <Card variant="default" padding="md" className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
            <CheckCircle2 className="text-emerald-600" size={18} />
            <div className="mt-4 text-3xl font-semibold text-slate-900 tabular-nums">{buckets.reportReady.length}</div>
            <div className="mt-2 text-sm text-slate-500">已完成报告</div>
          </Card>
        </section>

        <Card variant="default" padding="lg" className="border-slate-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.8),rgba(255,255,255,1))] shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">当前预警规则说明</div>
              <p className="mt-1 text-sm text-slate-600">在正式风险分层模型接入前，先用筛查完成度和报告状态做兼容预警。完成 2 项以上但仍未出报告的对象，优先进入复核与复测列表。</p>
            </div>
            <Button variant="secondary" size="sm">
              <Clock3 size={14} />
              后续接入正式规则
            </Button>
          </div>
        </Card>

        {highlightedTasks.length === 0 ? (
          <StatePanel
            title="当前没有需要处理的预警对象"
            description="当存在未闭环的筛查对象时，这里会显示待复测和重点关注名单。"
          />
        ) : (
          <section className="space-y-3">
            {highlightedTasks.map((task) => (
              <VisitCard
                key={`${task.patient.id}-${task.visitId}`}
                task={task}
                layout="row"
                onOpen={() => onSelectPatient(task.patient)}
                onViewHistory={() => onOpenHistory(task.patient)}
                onStartEvaluation={() => onStartEvaluation(task.patient)}
                canViewHistory={canOpenHistory}
              />
            ))}
          </section>
        )}
      </div>
    </div>
  );
};
