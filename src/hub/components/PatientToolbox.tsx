import React from 'react';
import { Activity, ArrowLeft, BarChart3, FileText, Layers, Mic, Dumbbell } from 'lucide-react';
import { AssessmentCard, PageHeader, ProgressBar, StatusTag } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import type { Patient } from '@/types/patient';
import type { VisitTaskSummary, WorkflowToolId } from '../workflow';
import {
  getPatientAvatar,
  getPatientColor,
  getPatientDisplayName,
} from '@/lib/patient-utils';
import { formatDate } from '@/lib/session-utils';
import { cn } from '@/lib/utils';

interface PatientToolboxProps {
  patient: Patient;
  visitTask: VisitTaskSummary | null;
  onSelectTool: (toolId: WorkflowToolId) => void;
  onOpenReports: () => void;
  onOpenComparison: () => void;
  onBack: () => void;
  sessionCount: number;
  allowedToolIds?: WorkflowToolId[];
  showComparison?: boolean;
  showReports?: boolean;
}

const iconMap = {
  vision3: Activity,
  rom: Layers,
  medvoice: Mic,
  training_plan: Dumbbell,
} as const;

const accentMap = {
  vision3: 'bg-blue-600 text-white',
  rom: 'bg-emerald-600 text-white',
  medvoice: 'bg-violet-600 text-white',
  training_plan: 'bg-orange-600 text-white',
} as const;

export const PatientToolbox: React.FC<PatientToolboxProps> = ({
  patient,
  visitTask,
  onSelectTool,
  onOpenReports,
  onOpenComparison,
  onBack,
  sessionCount,
  allowedToolIds,
  showComparison = true,
  showReports = true,
}) => {
  const comparisonEnabled = sessionCount > 1;
  const visibleModules = allowedToolIds?.length
    ? visitTask?.modules.filter((module) => allowedToolIds.includes(module.toolId)) ?? []
    : visitTask?.modules ?? [];

  if (!visitTask) {
    return (
      <div className="rehab-page custom-scrollbar">
        <div className="rehab-page-inner">
          <Card variant="default" padding="lg">
            <div className="text-sm text-slate-500">未能加载当前监控信息，请返回监控中心后重试。</div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="监控 -> 分析 -> 计划"
          title="监控中心"
          description="本页用于完成本次训练监控评估与计划生成，完成后再进入报告中心。"
          summary={
            <>
              <StatusTag status={visitTask.status} />
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                监控 ID {visitTask.visitId}
              </span>
            </>
          }
          actions={
            <>
              <Button variant="secondary" icon={<ArrowLeft size={16} />} onClick={onBack}>返回监控中心</Button>
              {showComparison ? (
                <Button variant="secondary" icon={<BarChart3 size={16} />} onClick={onOpenComparison} disabled={!comparisonEnabled}>进度对比</Button>
              ) : null}
              {showReports ? (
                <Button variant="primary" icon={<FileText size={16} />} onClick={onOpenReports}>进入报告中心</Button>
              ) : null}
            </>
          }
        />

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
                  当前围绕本次监控完成体态监控、ROM 评估、疲劳问询及训练计划生成。页面只负责完成分析与计划任务，报告查看与导出统一在报告中心完成。
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span>监控编号 {visitTask.visitId}</span>
                  <span>监控场次 {Math.max(sessionCount, 1)}</span>
                  <span>最近更新 {formatDate(visitTask.updatedAt)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">本次监控进度</div>
              <p className="mt-1 text-sm leading-6 text-slate-500">{visitTask.nextStep}</p>
              <ProgressBar value={visitTask.completedModules} total={visitTask.totalModules} className="mt-4" />
            </div>
          </div>
        </Card>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {visibleModules.map((module) => {
            const Icon = iconMap[module.toolId];
            return (
              <AssessmentCard
                key={module.toolId}
                icon={Icon}
                title={module.title}
                description={module.description}
                status={module.status}
                summary={module.latestAssessment ? '当前运动员已存在该模块最新记录，可直接查看结果，也可以继续补录。' : '当前运动员尚未完成该模块，建议按流程顺序尽快补齐。'}
                meta={module.latestCreatedAt ? `最近记录 ${formatDate(module.latestCreatedAt)}` : '暂无记录'}
                actionLabel={module.actionLabel}
                onAction={() => onSelectTool(module.toolId)}
                accentClassName={accentMap[module.toolId]}
                footer={
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>记录数 {module.assessmentCount}</span>
                    <span>{module.status === 'completed' ? '已可进入报告中心' : '完成后将进入报告中心'}</span>
                  </div>
                }
              />
            );
          })}
        </section>
      </div>
    </div>
  );
};
