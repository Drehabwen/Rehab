import React from 'react';
import { Activity, ChevronDown, FileJson, FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Assessment } from '@/types/assessment';

interface ReportDetailModalProps {
  assessment: Assessment;
  onClose: () => void;
  onExportJson: (assessment: Assessment) => void;
  onExportCsv: (assessment: Assessment) => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  assessment,
  onClose,
  onExportJson,
  onExportCsv
}) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white shadow-2xl w-full max-w-3xl max-h-[80vh] rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500">
              <Activity size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-900">评估详情</h3>
              <p className="text-[10px] text-slate-400">
                {new Date(assessment.createdAt).toLocaleString()}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
          >
            <ChevronDown size={20} className="rotate-180" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {assessment.data.posture && (
            <div className="space-y-6">
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">检测问题</h4>
                <div className="space-y-2">
                  {assessment.data.posture.issues.map((issue, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "px-2 py-1 text-[9px] font-black uppercase rounded-lg",
                          issue.severity === 'severe' ? 'bg-rose-100 text-rose-600' :
                          issue.severity === 'moderate' ? 'bg-amber-100 text-amber-600' :
                          'bg-blue-100 text-blue-600'
                        )}>
                            {issue.severity === 'severe' ? '严重' : issue.severity === 'moderate' ? '中度' : '轻度'}
                        </span>
                        <span className="font-bold text-slate-900">{issue.title}</span>
                      </div>
                      <p className="text-sm text-slate-600">{issue.description}</p>
                      <p className="text-xs text-slate-400 mt-1">{issue.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">测量指标</h4>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(assessment.data.posture.metrics).map(([key, value]) => (
                    <div key={key} className="bento-card p-4">
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{key}</div>
                      <div className="text-lg font-black text-slate-900">
                        {typeof value === 'number' ? value.toFixed(1) : value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button 
            onClick={() => onExportJson(assessment)}
            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all flex items-center gap-2"
          >
            <FileJson size={14} />
            导出 JSON
          </button>
          <button 
            onClick={() => onExportCsv(assessment)}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-antey-primary transition-all flex items-center gap-2"
          >
            <FileSpreadsheet size={14} />
            导出 CSV
          </button>
        </div>
      </div>
    </div>
  );
};
