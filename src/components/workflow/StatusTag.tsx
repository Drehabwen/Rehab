import React from 'react';
import { cn } from '@/lib/utils';
import type { WorkflowStatus } from '@/hub/workflow';

interface StatusTagProps {
  status: WorkflowStatus;
  className?: string;
}

const statusClassMap: Record<WorkflowStatus, string> = {
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
};

const statusLabelMap: Record<WorkflowStatus, string> = {
  completed: '已完成',
  pending: '待完成',
};

export const StatusTag: React.FC<StatusTagProps> = ({ status, className }) => {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full border px-3 text-xs font-semibold',
        statusClassMap[status],
        className,
      )}
    >
      {statusLabelMap[status]}
    </span>
  );
};
