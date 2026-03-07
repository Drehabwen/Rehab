import React from 'react';
import { FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ROMAssessment } from '../types';
import { ROMService } from '../services/ROMService';

interface ROMReportProps {
  assessment: ROMAssessment;
  onExport: (assessment: ROMAssessment) => void;
}

export const ROMReport: React.FC<ROMReportProps> = ({ assessment, onExport }) => {
  const report = ROMService.generateReport(assessment);
  
  return (
    <div className={cn('bg-white rounded-2xl shadow-lg p-8', 'animate-fade-in')}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center', 'bg-blue-100 text-blue-500')}>
            <FileText size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-slate-900">关节活动度评估报告</h3>
            <p className="text-slate-400">{new Date(assessment.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <button
          onClick={() => onExport(assessment)}
          className={cn('flex items-center gap-2 px-4 py-2 rounded-xl', 'bg-blue-500 text-white', 'hover:bg-blue-600 transition-all')}
        >
          <Download size={16} />
          导出报告
        </button>
      </div>
      
      <div className="prose max-w-none">
        {report.split('\n').map((line, index) => {
          if (line.startsWith('# ')) {
            return <h1 key={index} className="text-2xl font-bold mb-4">{line.substring(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={index} className="text-xl font-semibold mb-2">{line.substring(3)}</h2>;
          }
          if (line.startsWith('- ')) {
            return <li key={index} className="mb-1">{line.substring(2)}</li>;
          }
          return <p key={index}>{line}</p>;
        })}
      </div>
      
      <div className="mt-8 border-t pt-6">
        <h4 className="font-semibold text-slate-700 mb-4">评估详情</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-slate-50 p-3 rounded-lg">
            <span className="text-slate-400 block mb-1">评估ID</span>
            <span className="font-medium">{assessment.id}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <span className="text-slate-400 block mb-1">患者ID</span>
            <span className="font-medium">{assessment.patientId}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <span className="text-slate-400 block mb-1">测量项数</span>
            <span className="font-medium">{assessment.data.length}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg">
            <span className="text-slate-400 block mb-1">状态</span>
            <span className="font-medium">{assessment.status === 'completed' ? '已完成' : assessment.status === 'reviewed' ? '已审核' : '待处理'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
