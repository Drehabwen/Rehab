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
  onClick
}) => {
  const variants = {
    primary: {
      bg: 'bg-antey-primary/10',
      hoverBg: 'group-hover:bg-antey-primary',
      text: 'text-antey-primary',
      hoverText: 'group-hover:text-white',
      gradient: 'from-antey-primary/5 to-transparent'
    },
    blue: {
      bg: 'bg-blue-50',
      hoverBg: '',
      text: 'text-blue-500',
      hoverText: '',
      gradient: ''
    },
    amber: {
      bg: 'bg-amber-50',
      hoverBg: '',
      text: 'text-amber-500',
      hoverText: '',
      gradient: ''
    },
    emerald: {
      bg: 'bg-emerald-50',
      hoverBg: '',
      text: 'text-emerald-500',
      hoverText: '',
      gradient: ''
    }
  };

  const v = variants[variant];

  return (
    <div
      onClick={onClick}
      className={cn(
        "bento-card p-4 md:p-6 flex items-center justify-between min-w-[140px] md:min-w-0",
        onClick && "cursor-pointer hover:border-antey-primary/30 transition-all",
        v.gradient && `bg-gradient-to-br ${v.gradient}`
      )}
    >
      <div>
        <div className="text-2xl md:text-3xl font-black text-slate-900">{count}</div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{label}</div>
      </div>
      <div className={cn(
        "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center transition-all",
        v.bg,
        onClick && "group-hover:scale-110",
        v.hoverBg
      )}>
        <Icon size={18} className={cn(v.text, v.hoverText, "md:size-[20px]")} />
      </div>
    </div>
  );
};
