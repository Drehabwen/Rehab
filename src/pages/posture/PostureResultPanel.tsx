import React from 'react';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { CheckCircle, AlertTriangle, FileDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostureResultPanelProps {
  result: { issues: PostureIssue[]; metrics: PostureMetrics; image: string } | null;
  exportPDF: () => void;
  resetAnalysis: () => void;
}

export const PostureResultPanel: React.FC<PostureResultPanelProps> = ({ result, exportPDF, resetAnalysis }) => {
  if (!result) return null;

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Summary Stats */}
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-slate-900">评估结论</h3>
          <div className={cn(
            "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
            result.issues.length === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
          )}>
            {result.issues.length === 0 ? "状况良好" : `发现 ${result.issues.length} 项异常`}
          </div>
        </div>

        <div className="space-y-4">
          {result.issues.length === 0 ? (
            <div className="flex items-start gap-4 p-5 bg-green-50 rounded-3xl border border-green-100">
              <CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-green-900">体态非常标准</p>
                <p className="text-green-700 text-sm mt-1">未发现明显的姿态问题，请继续保持良好的生活习惯。</p>
              </div>
            </div>
          ) : (
            result.issues.map((issue) => (
              <div key={issue.id} className="flex items-start gap-4 p-5 bg-amber-50 rounded-3xl border border-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">{issue.title}</p>
                  <p className="text-amber-700 text-sm mt-1">{issue.description}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-6">
           <button 
            onClick={exportPDF}
            className="flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95"
           >
             <FileDown className="h-5 w-5" />
             导出 PDF
           </button>
           <button 
            onClick={resetAnalysis}
            className="flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-bold transition-all active:scale-95"
           >
             <RefreshCw className="h-5 w-5" />
             重新评估
           </button>
        </div>
      </div>
    </div>
  );
};
