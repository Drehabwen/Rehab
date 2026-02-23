import React from 'react';
import { FileText, Trash2, Download, Eye, ChevronRight } from 'lucide-react';
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
  onDelete
}) => {
  const getPatientName = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    return patient?.name || '未知患者';
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      posture: '体态评估',
      rom: '关节活动度',
      combined: '综合评估'
    };
    return labels[type] || type;
  };

  const getModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      realtime: '实时模式',
      stepped: '分步模式'
    };
    return labels[mode] || mode;
  };

  if (filteredAssessments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-300">
        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
          <FileText size={32} className="opacity-20" />
        </div>
        <p className="text-sm font-black uppercase tracking-[0.2em]">暂无评估记录</p>
        <p className="text-[11px] font-medium mt-2 opacity-60">完成体态评估后将自动生成报告</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filteredAssessments.map((assessment) => (
        <div
          key={assessment.id}
          className="group bg-white rounded-2xl p-6 border border-slate-100 hover:border-antey-primary/20 hover:shadow-lg transition-all cursor-pointer"
          onClick={() => onViewDetail(assessment)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
                <FileText size={20} />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h4 className="font-black text-slate-900">
                    {getPatientName(assessment.patientId)}
                  </h4>
                  <span className={cn(
                    "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                    assessment.type === 'posture' && "bg-blue-50 text-blue-500",
                    assessment.type === 'rom' && "bg-purple-50 text-purple-500",
                    assessment.type === 'combined' && "bg-emerald-50 text-emerald-500"
                  )}>
                    {getTypeLabel(assessment.type)}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-slate-400">
                  <span>{getModeLabel(assessment.mode)}</span>
                  <span>•</span>
                  <span>{new Date(assessment.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(assessment);
                }}
                className="p-2.5 text-slate-400 hover:text-antey-primary hover:bg-slate-50 rounded-xl transition-all"
                title="查看详情"
              >
                <Eye size={16} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(assessment.id);
                }}
                className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                title="删除"
              >
                <Trash2 size={16} />
              </button>
              <ChevronRight size={16} className="text-slate-300" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
