/**
 * 模块结果卡片 + 报告段落（插件共用展示层）。
 *
 * 放在 components/workflow 而不是某个插件里：插件之间不互相 import，
 * 共用展示组件是允许的（等价于 DSH 的 ui-primitives）。
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { AssessmentCard } from '@/components/workflow';
import type { ReportModuleLike } from '@/kernel/types';

/** 输出状态 → 工作流状态标签。 */
export const outputStatusToWorkflowStatus = (status: 'ready' | 'partial' | 'missing') =>
  status === 'ready' ? ('completed' as const) : ('pending' as const);

/** 报告中心的「模块结果」卡片：与改造前的渲染保持一致。 */
export const ModuleResultCard: React.FC<{
  module: ReportModuleLike;
  onViewDetails?: (assessment: unknown) => void;
}> = ({ module, onViewDetails }) => {
  const Icon = module.presentation.icon as LucideIcon;
  const output = module.output as { status?: 'ready' | 'partial' | 'missing'; sourceAssessment?: unknown } | undefined;
  return (
    <AssessmentCard
      icon={Icon}
      title={module.presentation.title}
      description={module.presentation.description}
      status={output ? outputStatusToWorkflowStatus(output.status ?? 'missing') : 'pending'}
      summary={module.summaryText}
      meta={module.evidenceText}
      actionLabel={output ? '查看结果' : undefined}
      onAction={
        output?.sourceAssessment !== undefined && onViewDetails !== undefined
          ? () => onViewDetails(output.sourceAssessment)
          : undefined
      }
      accentClassName={module.presentation.accentClassName}
    />
  );
};

/**
 * 报告页的插件段落：按模块类型过滤，渲染该模块的摘要素描。
 * 插件通过 `report.sections` 注册，传入自己的 types。
 */
export const ModuleReportSection: React.FC<{
  modules: ReportModuleLike[] | undefined;
  types: string[];
  heading: string;
}> = ({ modules, types, heading }) => {
  const matched = (modules ?? []).filter((module) => types.includes(module.type) && module.output);
  if (matched.length === 0) return null;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.05)]">
      <div className="text-xs font-semibold tracking-[0.14em] text-slate-400">插件段落</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{heading}</div>
      <ul className="mt-3 space-y-2">
        {matched.map((module) => (
          <li key={module.type} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">
            <span className="font-medium text-slate-800">{module.presentation.title}</span>
            {module.summaryText !== '' ? `：${module.summaryText}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
};
