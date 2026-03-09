import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  count: number;
  label: string;
  icon: LucideIcon;
  variant?: 'primary' | 'blue' | 'amber' | 'emerald';
  onClick?: () => void;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  count,
  label,
  icon: Icon,
  variant = 'primary',
  onClick,
}) => {
  const variants = {
    primary: 'bg-teal-50 text-teal-700',
    blue: 'bg-blue-50 text-blue-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'bento-card p-4 flex items-center justify-between min-h-[84px]',
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      )}
    >
      <div>
        <div className="text-[30px] font-semibold text-slate-900 leading-none tabular-nums">{count}</div>
        <div className="text-xs text-slate-500 mt-1.5">{label}</div>
      </div>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', variants[variant])}>
        <Icon size={16} />
      </div>
    </div>
  );
};
