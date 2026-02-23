import React from 'react';
import { ChevronLeft, User, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import type { ViewMode } from '../types';

interface PatientHeaderProps {
  view: ViewMode;
  patient: Patient;
  sessionCount: number;
  onBack: () => void;
  onSettingsClick: () => void;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({
  view,
  patient,
  sessionCount,
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
              <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center">
                <User size={18} className="text-slate-500" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black">
                    {patient.id}
                  </span>
                  <span className="text-sm font-black text-slate-900">
                    {patient.name || '匿名患者'}
                  </span>
                </div>
                <div className="text-[10px] font-medium text-slate-400">
                  {view === 'toolbox' ? '工具箱' : `第 ${sessionCount} 次接诊`}
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
