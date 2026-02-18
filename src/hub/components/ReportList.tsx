import React from 'react';
import { FileText, Activity, Calendar, User, ArrowUpRight, FileJson, FileSpreadsheet, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Assessment } from '@/types/assessment';
import type { Patient } from '@/types/patient';

interface ReportListProps {
  filteredAssessments: Assessment[];
  patients: Patient[];
  onViewDetail: (assessment: Assessment) => void;
  onExportJson: (assessment: Assessment) => void;
  onExportCsv: (assessment: Assessment) => void;
  onDelete: (id: string) => void;
}

export const ReportList: React.FC<ReportListProps> = ({
  filteredAssessments,
  patients,
  onViewDetail,
  onExportJson,
  onExportCsv,
  onDelete
}) => {
  if (filteredAssessments.length === 0) {
    return (
      <div className="bento-card p-16 text-center">
        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-6">
          <FileText size={32} className="text-slate-300" />
        </div>
        <h3 className="text-xl font-black text-slate-900 mb-2">暂无评估记录</h3>
        <p className="text-slate-400">完成体态评估后，数据将在此自动保存。</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredAssessments.map((assessment) => (
        <div key={assessment.id} className="bento-card p-5 flex items-center justify-between hover:border-antey-primary/30 transition-all group">
          <div className="flex items-center gap-5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Activity size={18} className="text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-sm font-black text-slate-900">
                  {assessment.type === 'posture' ? '体态评估' : '关节活动度评估'}
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
                  {patients.find(p => p.id === assessment.patientId)?.name || '未知患者'}
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
              onClick={() => onViewDetail(assessment)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-antey-primary transition-all"
            >
              详情
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
