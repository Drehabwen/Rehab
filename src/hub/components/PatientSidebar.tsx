import React from 'react';
import { User, Search, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import type { Assessment } from '@/types/assessment';

interface PatientSidebarProps {
  patients: Patient[];
  assessments: Assessment[];
  selectedPatientId: string | null;
  onSelectPatient: (id: string | null) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const PatientSidebar: React.FC<PatientSidebarProps> = ({
  patients,
  assessments,
  selectedPatientId,
  onSelectPatient,
  searchQuery,
  onSearchChange,
}) => {
  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bento-card p-6">
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
        <User size={14} />
        患者筛选
      </div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input 
          type="text" 
          placeholder="搜索患者..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:ring-2 focus:ring-antey-primary/10 focus:border-antey-primary/30 transition-all outline-none"
        />
      </div>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
        <button
          onClick={() => onSelectPatient(null)}
          className={cn(
            "w-full px-4 py-3 flex items-center gap-3 text-left rounded-xl transition-all",
            !selectedPatientId 
              ? "bg-antey-primary/10 text-antey-primary border border-antey-primary/20" 
              : "hover:bg-slate-50 text-slate-600 border border-transparent"
          )}
        >
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center",
            !selectedPatientId ? "bg-antey-primary/20" : "bg-slate-100"
          )}>
            <Database size={16} />
          </div>
          <div>
            <div className="font-bold text-sm">全部患者</div>
            <div className="text-[10px] text-slate-400">{assessments.length} 条评估</div>
          </div>
        </button>
        
        {filteredPatients.map((patient) => {
          const patientAssessments = assessments.filter(a => a.patientId === patient.id);
          return (
            <button
              key={patient.id}
              onClick={() => onSelectPatient(patient.id)}
              className={cn(
                "w-full px-4 py-3 flex items-center gap-3 text-left rounded-xl transition-all",
                selectedPatientId === patient.id 
                  ? "bg-antey-primary/10 text-antey-primary border border-antey-primary/20" 
                  : "hover:bg-slate-50 text-slate-600 border border-transparent"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                selectedPatientId === patient.id 
                  ? "bg-antey-primary/20 text-antey-primary" 
                  : "bg-slate-100 text-slate-500"
              )}>
                {patient.name?.charAt(0) || patient.id.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm truncate">{patient.name || '未命名患者'}</div>
                <div className="text-[10px] text-slate-400">{patientAssessments.length} 条评估</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
