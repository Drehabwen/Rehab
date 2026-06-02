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
  getPatientPublicCode,
} from '@/lib/patient-utils';
import { formatDate } from '@/lib/session-utils';
import { cn } from '@/lib/utils';

interface VisitCardProps {
  task: VisitTaskSummary;
  onOpen: () => void;
}

export const VisitCard: React.FC<VisitCardProps> = ({ task, onOpen }) => {
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
              <div className="mt-1 text-xs text-slate-500">患者编码 {getPatientPublicCode(task.patient)}</div>
            </div>
          </div>
          <StatusTag status={task.status} />
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/90 p-4 sm:grid-cols-2">
          <div>
            <div className="text-xs text-slate-500">接诊 ID</div>
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
            {task.reportReady ? '查看报告' : '进入评估'}
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
};
