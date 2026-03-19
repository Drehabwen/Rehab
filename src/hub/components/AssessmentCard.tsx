import React from 'react';
import { Activity, Calendar, User, ArrowUpRight, FileJson, FileSpreadsheet, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Assessment } from '@/types/assessment';

interface AssessmentCardProps {
  assessment: Assessment;
  patientName?: string;
  onExportJson: (assessment: Assessment) => void;
  onExportCsv: (assessment: Assessment) => void;
  onDelete: (id: string) => void;
  onViewDetails: (assessment: Assessment) => void;
}

export const AssessmentCard: React.FC<AssessmentCardProps> = ({
  assessment,
  patientName,
  onExportJson,
  onExportCsv,
  onDelete,
  onViewDetails,
}) => {
  return (
    <div className="bento-card p-5 flex items-center justify-between hover:border-antey-primary/30 transition-all group">
      <div className="flex items-center gap-5">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
          <Activity size={18} className="text-blue-500" />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-sm font-black text-slate-900">
              {assessment.type === 'posture' ? '体态监控' : '灵活性监控'}
            </span>
            <span className={cn(
              "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
              assessment.mode === 'realtime' 
                ? "bg-emerald-50 text-emerald-600" 
                : "bg-blue-50 text-blue-600"
            )}>
              {assessment.mode === 'realtime' ? '实时' : '分步'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-slate-400 text-[10px] font-medium">
            <span className="flex items-center gap-1">
              <Calendar size={10} />
              {new Date(assessment.createdAt).toLocaleDateString()}
            </span>
            <span className="flex items-center gap-1">
              <User size={10} />
              {patientName || '未知运动员'}
            </span>
            {assessment.data.posture?.view && (
              <span className="flex items-center gap-1">
                <ArrowUpRight size={10} />
                {assessment.data.posture.view === 'front' ? '正面' : 
                 assessment.data.posture.view === 'side' ? '侧面' : '背面'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => onExportJson(assessment)}
          className="p-2.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
          title="导出 JSON"
        >
          <FileJson size={16} />
        </button>
        <button 
          onClick={() => onExportCsv(assessment)}
          className="p-2.5 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
          title="导出 CSV"
        >
          <FileSpreadsheet size={16} />
        </button>
        <button 
          onClick={() => onDelete(assessment.id)}
          className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
          title="删除"
        >
          <Trash2 size={16} />
        </button>
        <button 
          onClick={() => onViewDetails(assessment)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-antey-primary transition-all"
        >
          详情
          <ExternalLink size={12} />
        </button>
      </div>
    </div>
  );
};
