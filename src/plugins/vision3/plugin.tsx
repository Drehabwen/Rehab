/**
 * vision3 插件：体态评估。
 *
 * 贡献：
 * - assessment.tools：评估中心/工具箱里的模块入口
 * - assessment.workspace（keyed=vision3）：工作区渲染，内部仍是原来的 Vision3Plugin
 * - assessment.result.renderers（keyed=posture / adams）：报告中心的模块结果渲染
 * - report.sections：报告页的体态段落
 */
import React from 'react';
import { Activity } from 'lucide-react';
import type { Plugin, ReportModuleLike } from '@/kernel/types';
import { ModuleReportSection, ModuleResultCard } from '@/components/workflow/ModuleResultCard';
import { Vision3Plugin } from './Vision3Plugin';

const ToolTile: React.FC<{ slotId: string; onOpenTool?: (toolId: string) => void }> = ({
  onOpenTool,
}) => (
  <button
    type="button"
    onClick={() => onOpenTool?.('vision3')}
    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
  >
    <Activity size={16} className="mx-auto text-blue-600" />
    <div className="mt-2 text-xs font-medium text-slate-600">体态评估</div>
  </button>
);

const Workspace: React.FC<{ slotId: string }> = () => <Vision3Plugin />;

const ResultRenderer: React.FC<{
  slotId: string;
  module?: ReportModuleLike;
  onViewDetails?: (assessment: unknown) => void;
}> = ({ module, onViewDetails }) =>
  module === undefined ? null : <ModuleResultCard module={module} onViewDetails={onViewDetails} />;

const ReportSection: React.FC<{ slotId: string; modules?: ReportModuleLike[] }> = ({ modules }) => (
  <ModuleReportSection modules={modules} types={['posture', 'adams']} heading="体态评估结论" />
);

export const plugin: Plugin = {
  manifest: {
    id: 'vision3',
    version: '1.0.0',
    apiVersion: 1,
    displayName: '体态评估',
    description: 'MediaPipe 体态/关节分析，产出结构化体态评估记录',
    inject: ['audit'],
    provides: ['assessment:vision3'],
    capabilities: ['camera'],
    permissions: ['assessment:run'],
    builtin: true,
  },
  apply(ctx) {
    const disposers: (() => void)[] = [];
    disposers.push(ctx.slots.register('assessment.tools', 'vision3/tool', ToolTile, { order: 10 }));
    disposers.push(
      ctx.slots.register('assessment.workspace', 'vision3/workspace', Workspace, {
        order: 10,
        key: 'vision3',
      }),
    );
    disposers.push(
      ctx.slots.register('assessment.result.renderers', 'vision3/result-posture', ResultRenderer, {
        order: 10,
        key: 'posture',
      }),
    );
    disposers.push(
      ctx.slots.register('assessment.result.renderers', 'vision3/result-adams', ResultRenderer, {
        order: 10,
        key: 'adams',
      }),
    );
    disposers.push(
      ctx.slots.register('report.sections', 'vision3/report-section', ReportSection, { order: 10 }),
    );
    return () => {
      for (const dispose of disposers) dispose();
    };
  },
};
