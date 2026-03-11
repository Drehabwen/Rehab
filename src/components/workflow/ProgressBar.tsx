import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps {
  value: number;
  total: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, total, className }) => {
  const safeTotal = total <= 0 ? 1 : total;
  const ratio = Math.max(0, Math.min(1, value / safeTotal));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>评估进度</span>
        <span className="font-medium text-slate-700">{value} / {total}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-antey-primary transition-[width] duration-300"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
};
