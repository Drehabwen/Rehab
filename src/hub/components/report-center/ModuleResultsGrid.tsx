import React from 'react';
import { Activity } from 'lucide-react';
import { StatusTag } from '@/components/workflow';
import { Card } from '@/components/ui';
import { ModuleResultCard } from '@/components/workflow/ModuleResultCard';
import { Slot, useSlotHasEntries } from '@/kernel/react';
import type { ReportModuleLike } from '@/kernel/types';
import type { Assessment } from '@/types/assessment';

interface ModuleResultItem extends ReportModuleLike {
  type: 'posture' | 'rom' | 'medvoice' | 'scale' | 'adams';
  presentation: {
    title: string;
    description: string;
    icon: any;
    accentClassName: string;
  };
}

interface ModuleResultsGridProps {
  assessmentOutputs: ModuleResultItem[];
  onViewDetails: (assessment: Assessment) => void;
  readyCount: number;
}

/**
 * 单条模块结果：插件提供了该类型的渲染器就用渲染器，否则回落到默认卡片。
 * 回退保证"停用插件 / 未知类型"时报告页不出现空洞。
 */
const ModuleResultSlot: React.FC<{
  item: ModuleResultItem;
  onViewDetails: (assessment: Assessment) => void;
}> = ({ item, onViewDetails }) => {
  const hasRenderer = useSlotHasEntries('assessment.result.renderers', item.type);
  if (!hasRenderer) {
    return (
      <ModuleResultCard module={item} onViewDetails={onViewDetails as (assessment: unknown) => void} />
    );
  }
  return (
    <Slot
      name="assessment.result.renderers"
      keyValue={item.type}
      assessmentType={item.type}
      module={item}
      assessment={(item.output as { sourceAssessment?: unknown } | undefined)?.sourceAssessment ?? null}
      onViewDetails={onViewDetails as (assessment: unknown) => void}
    />
  );
};

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
        {assessmentOutputs.map((item) => (
          <ModuleResultSlot key={item.type} item={item} onViewDetails={onViewDetails} />
        ))}
      </div>
    </Card>
  );
};
