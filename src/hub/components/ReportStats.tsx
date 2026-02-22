import React from 'react';
import { Database, User, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stat {
  label: string;
  value: number;
  icon: string;
  color: string;
  bg: string;
}

interface ReportStatsProps {
  stats: Stat[];
}

const iconMap = {
  Database,
  User,
  Activity
};

export const ReportStats: React.FC<ReportStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((stat, idx) => {
        const Icon = iconMap[stat.icon as keyof typeof iconMap];
        return (
          <div key={idx} className="bento-card p-6 flex items-center justify-between">
            <div>
              <div className="text-3xl font-black text-slate-900">{stat.value}</div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
            </div>
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
              <Icon size={20} className={stat.color} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
