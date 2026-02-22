import React from 'react';
import { User } from 'lucide-react';

export const PostureEmptyState: React.FC = () => {
  return (
    <div className="flex-1 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
        <User className="h-10 w-10 text-blue-500" />
      </div>
      <h3 className="text-2xl font-bold text-slate-900 mb-3">等待评估</h3>
      <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
        点击"开始评估"并按照提示站立，AI 将自动分析您的体态数据。
      </p>

      <div className="mt-10 grid grid-cols-2 gap-4 w-full">
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">评估项</p>
          <p className="text-xl font-bold text-slate-700">12+ 维度</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">精准度</p>
          <p className="text-xl font-bold text-slate-700">医疗级</p>
        </div>
      </div>
    </div>
  );
};
