import React from 'react';
import { Activity, Brain, Layers, Mic } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';
import type { ModuleCardItem } from './types';

const iconMap = {
  activity: Activity,
  layers: Layers,
  mic: Mic,
  brain: Brain,
};

const statusLabel = {
  ready: '已就绪',
  partial: '部分就绪',
  missing: '缺失',
};

interface ReportModuleGridProps {
  items: ModuleCardItem[];
  onOpenAssessment: (assessmentId: string) => void;
}

export const ReportModuleGrid: React.FC<ReportModuleGridProps> = ({ items, onOpenAssessment }) => (
  <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
    <SectionHeading
      eyebrow="MODULE OUTPUTS"
      title="模块结果汇总"
      description="各模块结果只保留适合归档的摘要，便于快速复核。"
      icon={<Layers size={18} />}
    />
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      {items.map((item) => {
        const Icon = iconMap[item.iconKey];
        return (
          <div key={item.type} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex items-start gap-3">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', item.accentClassName)}>
                <Icon size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-slate-500">
                    {statusLabel[item.status]}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{item.description}</p>
                <p className="mt-3 text-sm text-slate-700">{item.summaryText}</p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">{item.evidenceText}</span>
                  {item.assessment ? (
                    <Button variant="secondary" size="sm" onClick={() => onOpenAssessment(item.assessment!.id)}>
                      查看详情
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </Card>
);
