import React from 'react';
import { Activity } from 'lucide-react';
import { AssessmentCard, StatusTag } from '@/components/workflow';
import { Card } from '@/components/ui';
import type { Assessment } from '@/types/assessment';

interface ModuleResultsGridProps {
  assessmentOutputs: Array<{
    type: 'posture' | 'rom' | 'medvoice' | 'scale' | 'adams';
    output: any;
    presentation: {
      title: string;
      description: string;
      icon: any;
      accentClassName: string;
    };
    summaryText: string;
    evidenceText: string;
  }>;
  onViewDetails: (assessment: Assessment) => void;
  readyCount: number;
}

const outputStatusToWorkflowStatus = (status: 'ready' | 'partial' | 'missing') =>
  status === 'ready' ? ('completed' as const) : ('pending' as const);

export const ModuleResultsGrid: React.FC<ModuleResultsGridProps> = ({
  assessmentOutputs,
  onViewDetails,
  readyCount,
}) => {
  return (
    <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold tracking-[0.14em] text-slate-400">模块结果</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">评估结果</h2>
            <p className="mt-1 text-sm text-slate-500">整合同一接诊下的体态、ROM、语音问诊及量表评估结构化结论。</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700">
            <Activity size={18} />
          </div>
        </div>
        <StatusTag status={readyCount === 4 ? 'completed' : 'pending'} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {assessmentOutputs.map((item) => {
          const Icon = item.presentation.icon;
          return (
            <AssessmentCard
              key={item.type}
              icon={Icon}
              title={item.presentation.title}
              description={item.presentation.description}
              status={item.output ? outputStatusToWorkflowStatus(item.output.status) : 'pending'}
              summary={item.summaryText}
              meta={item.evidenceText}
              actionLabel={item.output ? '查看结果' : undefined}
              onAction={item.output ? () => onViewDetails(item.output.sourceAssessment) : undefined}
              accentClassName={item.presentation.accentClassName}
            />
          );
        })}
      </div>
    </Card>
  );
};
