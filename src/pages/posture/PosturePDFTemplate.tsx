import React from 'react';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';

interface PosturePDFTemplateProps {
  result: { issues: PostureIssue[]; metrics: PostureMetrics; image: string } | null;
}

export const PosturePDFTemplate: React.FC<PosturePDFTemplateProps> = ({ result }) => {
  if (!result) return null;

  return (
    <div id="posture-report" className="hidden fixed left-0 top-0 w-[210mm] bg-white p-12 text-slate-900">
      <div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-8">
        <div>
          <h1 className="text-5xl font-black tracking-tighter mb-2">VISION<span className="text-blue-600">3</span></h1>
          <p className="text-xl font-bold text-slate-500 uppercase tracking-widest">AI POSTURE ANALYSIS REPORT</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-slate-400">REPORT ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
          <p className="text-sm font-bold text-slate-400">DATE: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-6">
          <h3 className="text-2xl font-black border-l-4 border-blue-600 pl-4">评估影像</h3>
          <div className="aspect-[4/3] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 shadow-inner">
            <img src={result.image} className="w-full h-full object-cover" />
          </div>
        </div>
        
        <div className="space-y-6">
          <h3 className="text-2xl font-black border-l-4 border-blue-600 pl-4">关键指标</h3>
          <div className="grid grid-cols-1 gap-4">
            {(Object.entries(result.metrics) as Array<[keyof PostureMetrics, PostureMetrics[keyof PostureMetrics]]>).map(([key, value]) => {
              if (typeof value !== 'number') return null;
              const label = String(key).replace(/_/g, ' ');
              return (
                <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                  <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">{label}</span>
                  <span className="text-2xl font-black text-slate-900">{value.toFixed(1)}°</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6 mb-12">
        <h3 className="text-2xl font-black border-l-4 border-blue-600 pl-4">评估建议</h3>
        <div className="grid grid-cols-1 gap-4">
          {result.issues.map((issue) => (
            <div key={issue.id} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
              <p className="text-lg font-black text-slate-900 mb-1">{issue.title}</p>
              <p className="text-slate-600">{issue.description}</p>
            </div>
          ))}
          {result.issues.length === 0 && (
            <div className="p-8 bg-green-50 rounded-3xl border border-green-100 text-center">
              <p className="text-xl font-bold text-green-900">恭喜！未发现任何体态异常。</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 pt-8 border-t border-slate-200 text-center">
        <p className="text-xs font-bold text-slate-400">本报告由 Vision3 AI 视觉引擎自动生成。仅供参考，不作为医疗诊断依据。</p>
      </div>
    </div>
  );
};
