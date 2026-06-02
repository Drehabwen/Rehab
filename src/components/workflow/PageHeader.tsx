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
  compact?: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  summary,
  actions,
  className,
  compact = false,
}) => {
  return (
    <Card
      variant="outlined"
      padding={compact ? 'md' : 'lg'}
      className={cn('border-slate-200 bg-white/85', className)}
    >
      <div className={cn('flex flex-col gap-4 xl:flex-row xl:justify-between', compact ? 'xl:items-center' : 'xl:items-end')}>
        <div className="min-w-0">
          {eyebrow ? (
            <div className={cn('font-semibold tracking-[0.14em] text-slate-400', compact ? 'text-xs' : 'text-xs uppercase tracking-[0.18em]')}>
              {eyebrow}
            </div>
          ) : null}
          <h1 className={cn('font-semibold tracking-tight text-slate-900', compact ? 'mt-1 text-2xl' : 'mt-2 text-3xl')}>{title}</h1>
          <p className={cn('max-w-3xl text-sm leading-6 text-slate-500', compact ? 'mt-1.5' : 'mt-2')}>{description}</p>
          {summary ? <div className={cn('flex flex-wrap items-center gap-2', compact ? 'mt-3' : 'mt-4')}>{summary}</div> : null}
        </div>
        {actions ? <div className={cn('flex flex-wrap items-center gap-2', compact && 'xl:justify-end')}>{actions}</div> : null}
      </div>
    </Card>
  );
};
