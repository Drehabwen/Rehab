import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { StatusTag } from './StatusTag';

interface AssessmentCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  status: 'completed' | 'pending';
  summary: string;
  meta?: string;
  actionLabel?: string;
  onAction?: () => void;
  accentClassName?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  icon: Icon,
  title,
  description,
  status,
  summary,
  meta,
  actionLabel,
  onAction,
  accentClassName = 'bg-slate-900 text-white',
  footer,
  className,
}) => {
  return (
    <Card variant="default" padding="lg" className={className}>
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentClassName}`}>
            <Icon size={18} />
          </div>
          <StatusTag status={status} />
        </div>

        <div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm leading-6 text-slate-700">{summary}</div>
          {meta ? <div className="mt-3 text-xs text-slate-500">{meta}</div> : null}
        </div>

        {footer ? <div>{footer}</div> : null}

        {actionLabel && onAction ? (
          <div className="mt-auto border-t border-slate-200 pt-4">
            <Button variant={status === 'completed' ? 'secondary' : 'primary'} onClick={onAction} className="w-full justify-center">
              {actionLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </Card>
  );
};
