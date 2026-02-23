import React from 'react';
import { ChevronLeft, Database, Settings } from 'lucide-react';

interface DataCenterHeaderProps {
  onBack: () => void;
  onSettingsClick: () => void;
}

export const DataCenterHeader: React.FC<DataCenterHeaderProps> = ({
  onBack,
  onSettingsClick
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-20">
      <div className="bg-white/60 backdrop-blur-xl border-b border-slate-200/60 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <ChevronLeft size={18} className="text-slate-600" />
            </button>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center">
                <Database size={18} className="text-emerald-500" />
              </div>
              <div>
                <span className="text-sm font-black text-slate-900">数据与报告中心</span>
                <div className="text-[10px] font-medium text-slate-400">
                  查看所有评估记录
                </div>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onSettingsClick}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <Settings size={18} className="text-slate-500" />
          </button>
        </div>
      </div>
    </div>
  );
};
