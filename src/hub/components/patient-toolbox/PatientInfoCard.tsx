import React from 'react';
import { Card } from '@/components/ui';
import { ProgressBar } from '@/components/workflow';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary } from '../../workflow';
import {
  getPatientAvatar,
  getPatientColor,
  getPatientDisplayName,
} from '@/lib/patient-utils';
import { formatDate } from '@/lib/session-utils';
import { cn } from '@/lib/utils';

interface PatientInfoCardProps {
  patient: Patient;
  visitTask: VisitTaskSummary;
  sessionCount: number;
}

export const PatientInfoCard: React.FC<PatientInfoCardProps> = ({
  patient,
  visitTask,
  sessionCount,
}) => {
  return (
    <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="flex min-w-0 items-start gap-4">
          <div className={cn('flex h-14 w-14 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-sm', getPatientColor(patient))}>
            {getPatientAvatar(patient)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-900">{getPatientDisplayName(patient)}</h2>
              <span className="text-sm text-slate-400">ID {patient.id}</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              当前围绕本次接诊完成体态评估、ROM 评估、语音问诊和量表评估。页面只负责完成评估任务，报告查看与导出统一在报告中心完成。
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span>接诊编号 {visitTask.visitId}</span>
              <span>接诊次数 {Math.max(sessionCount, 1)}</span>
              <span>最近更新 {formatDate(visitTask.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-900">本次接诊进度</div>
          <p className="mt-1 text-sm leading-6 text-slate-500">{visitTask.nextStep}</p>
          <ProgressBar value={visitTask.completedModules} total={visitTask.totalModules} className="mt-4" />
        </div>
      </div>
    </Card>
  );
};
