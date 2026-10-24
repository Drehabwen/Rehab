/**
 * rom 插件：关节活动度评估。
 */
import React from 'react';
import { Layers } from 'lucide-react';
import type { Plugin, ReportModuleLike } from '@/kernel/types';
import { ModuleReportSection, ModuleResultCard } from '@/components/workflow/ModuleResultCard';
import { ROMPlugin } from './ROMPlugin';

const ToolTile: React.FC<{ slotId: string; onOpenTool?: (toolId: string) => void }> = ({
  onOpenTool,
}) => (
  <button
    type="button"
    onClick={() => onOpenTool?.('rom')}
    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center transition hover:border-emerald-300 hover:bg-emerald-50/40"
  >
    <Layers size={16} className="mx-auto text-emerald-600" />
    <div className="mt-2 text-xs font-medium text-slate-600">ROM 评估</div>
  </button>
);

const Workspace: React.FC<{ slotId: string }> = () => <ROMPlugin />;

const ResultRenderer: React.FC<{
  slotId: string;
  module?: ReportModuleLike;
  onViewDetails?: (assessment: unknown) => void;
}> = ({ module, onViewDetails }) =>
  module === undefined ? null : <ModuleResultCard module={module} onViewDetails={onViewDetails} />;

const ReportSection: React.FC<{ slotId: string; modules?: ReportModuleLike[] }> = ({ modules }) => (
  <ModuleReportSection modules={modules} types={['rom']} heading="关节活动度结论" />
);

export const plugin: Plugin = {
  manifest: {
    id: 'rom',
    version: '1.0.0',
    apiVersion: 1,
    displayName: 'ROM 评估',
    description: '关节活动度测量与记录',
    inject: ['audit'],
    provides: ['assessment:rom'],
    capabilities: ['camera'],
    permissions: ['assessment:run'],
    builtin: true,
  },
  apply(ctx) {
    const disposers: (() => void)[] = [];
    disposers.push(ctx.slots.register('assessment.tools', 'rom/tool', ToolTile, { order: 20 }));
    disposers.push(
      ctx.slots.register('assessment.workspace', 'rom/workspace', Workspace, {
        order: 20,
        key: 'rom',
      }),
    );
    disposers.push(
      ctx.slots.register('assessment.result.renderers', 'rom/result', ResultRenderer, {
        order: 20,
        key: 'rom',
      }),
    );
    disposers.push(
      ctx.slots.register('report.sections', 'rom/report-section', ReportSection, { order: 20 }),
    );
    return () => {
      for (const dispose of disposers) dispose();
    };
  },
};
