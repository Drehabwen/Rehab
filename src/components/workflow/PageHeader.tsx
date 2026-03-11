import React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description: string;
  summary?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  summary,
  actions,
  className,
}) => {
  return (
    <Card variant="outlined" padding="lg" className={cn('border-slate-200 bg-white/85', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{eyebrow}</div>
          ) : null}
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p>
          {summary ? <div className="mt-4 flex flex-wrap items-center gap-2">{summary}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </Card>
  );
};
