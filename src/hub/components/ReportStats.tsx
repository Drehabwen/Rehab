import React from 'react';
import { Database, User, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReportStatsProps {
  assessmentsCount: number;
  patientsCount: number;
  recentCount: number;
}

export const ReportStats: React.FC<ReportStatsProps> = ({ 
  assessmentsCount, 
  patientsCount, 
  recentCount 
}) => {
  const stats: Array<{ label: string; value: number; icon: LucideIcon; color: string; bg: string }> = [
    { label: '总评估数', value: assessmentsCount, icon: Database, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: '患者总数', value: patientsCount, icon: User, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: '本周新增', value: recentCount, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-50' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {stats.map((stat, idx) => (
        <div key={idx} className="bento-card p-6 flex items-center justify-between">
          <div>
            <div className="text-3xl font-black text-slate-900">{stat.value}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</div>
          </div>
          <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", stat.bg)}>
            <stat.icon size={20} className={stat.color} />
          </div>
        </div>
      ))}
    </div>
  );
};
