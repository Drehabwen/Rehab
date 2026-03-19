import React from 'react';
import { Calendar, ChevronRight, ClipboardList } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { ProgressBar } from './ProgressBar';
import { StatusTag } from './StatusTag';
import type { VisitTaskSummary } from '@/hub/workflow';
import {
  getPatientAvatar,
  getPatientColor,
  getPatientDisplayName,
} from '@/lib/patient-utils';
import { formatDate } from '@/lib/session-utils';
import { cn } from '@/lib/utils';

interface VisitCardProps {
  task: VisitTaskSummary;
  onOpen: () => void;
  layout?: 'card' | 'row';
  onViewHistory?: () => void;
  onStartEvaluation?: () => void;
  canViewHistory?: boolean;
}

const moduleStatusClass = (status: VisitTaskSummary['modules'][number]['status']) => (
  status === 'completed'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-slate-200 bg-white text-slate-500'
);

export const VisitCard: React.FC<VisitCardProps> = ({
  task,
  onOpen,
  layout = 'card',
  onViewHistory,
  onStartEvaluation,
  canViewHistory = true,
}) => {
  const handleViewHistory = onViewHistory ?? onOpen;
  const handleStartEvaluation = onStartEvaluation ?? onOpen;

  if (layout === 'row') {
    return (
      <Card variant="default" padding="md" hover className="border-slate-200 bg-white/95 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:gap-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-sm', getPatientColor(task.patient))}>
              {getPatientAvatar(task.patient)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold text-slate-900">{getPatientDisplayName(task.patient)}</div>
                <StatusTag status={task.status} className="h-6 px-2.5 text-[11px]" />
              </div>
              <div className="mt-1 truncate text-xs text-slate-500">
                运动员ID {task.patient.id} · 场次 {task.visitId}
              </div>
            </div>
          </div>

          <div className="grid flex-[1.3] grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="text-slate-500">进度</div>
              <div className="mt-1 font-semibold text-slate-900">{task.completedModules}/{task.totalModules}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="text-slate-500">下一步</div>
              <div className="mt-1 truncate font-semibold text-slate-900">{task.nextStep}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="text-slate-500">场次序号</div>
              <div className="mt-1 font-semibold text-slate-900">第 {task.sessionSequence} 场</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
              <div className="text-slate-500">最近更新</div>
              <div className="mt-1 font-semibold text-slate-900">{formatDate(task.updatedAt)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-3 xl:w-[340px]">
            <div className="flex flex-wrap gap-2">
              {task.modules.map((module) => (
                <span
                  key={module.toolId}
                  className={cn('inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium', moduleStatusClass(module.status))}
                >
                  {module.shortTitle}
                </span>
              ))}
            </div>
            <ProgressBar value={task.completedModules} total={task.totalModules} />
          </div>

          <div className="flex flex-row gap-2 xl:w-[220px] xl:flex-col">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleViewHistory}
              className="flex-1"
              disabled={!canViewHistory}
            >
              历史记录
            </Button>
            <Button
              variant={task.reportReady ? 'secondary' : 'primary'}
              size="sm"
              icon={<ClipboardList size={15} />}
              iconPosition="left"
              onClick={handleStartEvaluation}
              className="flex-1"
            >
              发起评估
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" padding="lg" hover className="h-full border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className={cn('flex h-12 w-12 items-center justify-center rounded-2xl text-base font-semibold text-white shadow-sm', getPatientColor(task.patient))}>
              {getPatientAvatar(task.patient)}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-slate-900">{getPatientDisplayName(task.patient)}</div>
              <div className="mt-1 text-xs text-slate-500">运动员 ID {task.patient.id}</div>
            </div>
          </div>
          <StatusTag status={task.status} />
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">监控场次 ID</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{task.visitId}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">下一步</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{task.nextStep}</div>
          </div>
        </div>

        <ProgressBar value={task.completedModules} total={task.totalModules} />

        <div className="grid gap-2 sm:grid-cols-3">
          {task.modules.map((module) => (
            <div key={module.toolId} className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{module.shortTitle}</span>
                <StatusTag status={module.status} className="h-6 px-2.5 text-[11px]" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={12} />
            最近更新 {formatDate(task.updatedAt)}
          </span>
          <Button variant={task.reportReady ? 'secondary' : 'primary'} size="md" icon={<ClipboardList size={15} />} iconPosition="left" onClick={onOpen}>
            {task.reportReady ? '查看分析' : '开始监控'}
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
};
