/**
 * medvoice 插件：语音接诊与结构化病历。
 */
import React from 'react';
import { Mic } from 'lucide-react';
import type { Plugin, ReportModuleLike } from '@/kernel/types';
import { ModuleReportSection, ModuleResultCard } from '@/components/workflow/ModuleResultCard';
import { MedVoicePlugin } from './MedVoicePlugin';

const ToolTile: React.FC<{ slotId: string; onOpenTool?: (toolId: string) => void }> = ({
  onOpenTool,
}) => (
  <button
    type="button"
    onClick={() => onOpenTool?.('medvoice')}
    className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center transition hover:border-violet-300 hover:bg-violet-50/40"
  >
    <Mic size={16} className="mx-auto text-violet-600" />
    <div className="mt-2 text-xs font-medium text-slate-600">语音问诊</div>
  </button>
);

const Workspace: React.FC<{ slotId: string }> = () => <MedVoicePlugin />;

const ResultRenderer: React.FC<{
  slotId: string;
  module?: ReportModuleLike;
  onViewDetails?: (assessment: unknown) => void;
}> = ({ module, onViewDetails }) =>
  module === undefined ? null : <ModuleResultCard module={module} onViewDetails={onViewDetails} />;

const ReportSection: React.FC<{ slotId: string; modules?: ReportModuleLike[] }> = ({ modules }) => (
  <ModuleReportSection modules={modules} types={['medvoice']} heading="语音问诊结论" />
);

export const plugin: Plugin = {
  manifest: {
    id: 'medvoice',
    version: '1.0.0',
    apiVersion: 1,
    displayName: '语音问诊',
    description: '语音接诊与结构化病历生成',
    inject: ['audit'],
    provides: ['assessment:medvoice'],
    capabilities: ['microphone', 'llm'],
    permissions: ['assessment:run'],
    builtin: true,
  },
  apply(ctx) {
    const disposers: (() => void)[] = [];
    disposers.push(ctx.slots.register('assessment.tools', 'medvoice/tool', ToolTile, { order: 30 }));
    disposers.push(
      ctx.slots.register('assessment.workspace', 'medvoice/workspace', Workspace, {
        order: 30,
        key: 'medvoice',
      }),
    );
    disposers.push(
      ctx.slots.register('assessment.result.renderers', 'medvoice/result', ResultRenderer, {
        order: 30,
        key: 'medvoice',
      }),
    );
    disposers.push(
      ctx.slots.register('report.sections', 'medvoice/report-section', ReportSection, { order: 30 }),
    );
    return () => {
      for (const dispose of disposers) dispose();
    };
  },
};
