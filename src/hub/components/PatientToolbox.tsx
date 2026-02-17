import React from 'react';
import { cn } from '@/lib/utils';
import { 
  ChevronLeft,
  FileText,
  Settings2,
  Clock,
  Calendar,
  User,
  TrendingUp,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import type { Patient } from '@/types/patient';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { tools } from './patient-tools';

interface PatientToolboxProps {
  patient: Patient;
  onSelectTool: (toolId: string) => void;
  onBack: () => void;
  sessionCount: number;
}

export const PatientToolbox: React.FC<PatientToolboxProps> = ({ 
  patient, 
  onSelectTool, 
  onBack,
  sessionCount 
}) => {
  const { assessments } = useAssessmentStore();
  
  const patientAssessments = assessments.filter(a => a.patientId === patient.id);
  
  const assessmentCounts = {
    posture: patientAssessments.filter(a => a.type === 'posture').length,
    rom: patientAssessments.filter(a => a.type === 'rom').length,
    voice: 0,
    scale: 0
  };

  const getToolCount = (toolId: string): number => {
    switch (toolId) {
      case 'vision3':
        return assessmentCounts.posture;
      case 'medvoice':
        return assessmentCounts.voice;
      case 'rom':
        return assessmentCounts.rom;
      case 'scale':
        return assessmentCounts.scale;
      default:
        return 0;
    }
  };

  const getLastAssessmentTime = (toolId: string): string | null => {
    const filtered = patientAssessments.filter(a => {
      if (toolId === 'vision3') return a.type === 'posture';
      if (toolId === 'rom') return a.type === 'rom';
      return false;
    });
    
    if (filtered.length === 0) return null;
    
    const latest = filtered[0];
    const diff = Date.now() - latest.createdAt;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    return new Date(latest.createdAt).toLocaleDateString('zh-CN');
  };

  return (
    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="p-6 pb-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-4"
        >
          <ChevronLeft size={18} />
          <span className="text-sm font-medium">返回患者列表</span>
        </button>

        <div className="bento-card p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-antey-primary to-teal-500 flex items-center justify-center text-white">
                <User size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black">
                    {patient.id}
                  </span>
                  <span className="text-xl font-black text-slate-900">
                    {patient.name || '匿名患者'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(patient.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    第 {sessionCount + 1} 次接诊
                  </span>
                </div>
              </div>
            </div>
            <button className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
              <Settings2 size={16} className="text-slate-400" />
            </button>
          </div>

          {patient.notes && (
            <div className="p-3 bg-slate-50 rounded-xl mb-4">
              <p className="text-xs text-slate-600 leading-relaxed">{patient.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-xl text-center">
              <div className="text-lg font-black text-blue-600">{assessmentCounts.posture}</div>
              <div className="text-[10px] text-slate-500 font-medium">体态分析</div>
            </div>
            <div className="p-3 bg-violet-50 rounded-xl text-center">
              <div className="text-lg font-black text-violet-600">{assessmentCounts.voice}</div>
              <div className="text-[10px] text-slate-500 font-medium">语音接诊</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-center">
              <div className="text-lg font-black text-emerald-600">{assessmentCounts.scale}</div>
              <div className="text-[10px] text-slate-500 font-medium">量表评估</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-center">
              <div className="text-lg font-black text-amber-600">{assessmentCounts.rom}</div>
              <div className="text-[10px] text-slate-500 font-medium">ROM测量</div>
            </div>
          </div>
        </div>

        {patientAssessments.length > 0 && (
          <div className="bento-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                <TrendingUp size={14} />
                最近评估
              </div>
              <button className="text-[10px] text-antey-primary font-bold flex items-center gap-1 hover:underline">
                查看全部 <ArrowRight size={10} />
              </button>
            </div>
            <div className="space-y-2">
              {patientAssessments.slice(0, 3).map((assessment) => {
                const tool = tools.find(t => 
                  (t.id === 'vision3' && assessment.type === 'posture') ||
                  (t.id === 'rom' && assessment.type === 'rom')
                );
                const diff = Date.now() - assessment.createdAt;
                const hours = Math.floor(diff / (1000 * 60 * 60));
                const timeStr = hours < 1 ? '刚刚' : hours < 24 ? `${hours}小时前` : `${Math.floor(hours / 24)}天前`;
                
                return (
                  <div key={assessment.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                        `bg-gradient-to-br ${tool?.color || 'from-slate-400 to-slate-500'}`
                      )}>
                        {tool?.icon && <tool.icon size={16} />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-700">{tool?.name || assessment.type}</div>
                        <div className="text-[10px] text-slate-400">{timeStr}</div>
                      </div>
                    </div>
                    <CheckCircle2 size={14} className="text-emerald-500" />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 pt-2 overflow-y-auto">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">
          <FileText size={14} />
          工具箱
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
          {tools.map((tool, idx) => {
            const count = getToolCount(tool.id);
            const lastTime = getLastAssessmentTime(tool.id);
            const isComplete = count > 0;
            
            return (
              <button
                key={tool.id}
                onClick={() => tool.available && onSelectTool(tool.id)}
                disabled={!tool.available}
                className={cn(
                  "group relative bento-card p-4 text-left transition-all duration-300 hover:scale-[1.02]",
                  tool.available 
                    ? "hover:border-antey-primary/30 hover:shadow-lg cursor-pointer" 
                    : "opacity-50 cursor-not-allowed"
                )}
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {isComplete && (
                  <div className="absolute top-3 right-3 w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50" />
                )}
                
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110",
                  `bg-gradient-to-br ${tool.color} text-white`
                )}>
                  <tool.icon size={20} />
                </div>
                
                <h3 className="text-xs font-black text-slate-900 mb-0.5">
                  {tool.name}
                </h3>
                <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed">
                  {tool.description}
                </p>
                
                {!tool.available && (
                  <div className="absolute inset-0 bg-white/60 rounded-xl flex items-center justify-center">
                    <span className="px-2 py-1 bg-slate-100 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-wider">
                      即将推出
                    </span>
                  </div>
                )}
                
                {tool.available && (count > 0 || lastTime) && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    {count > 0 && (
                      <span className="text-[9px] font-bold text-emerald-600">
                        {count} 次
                      </span>
                    )}
                    {lastTime && (
                      <span className="text-[9px] text-slate-400 flex items-center gap-1">
                        <Clock size={9} />
                        {lastTime}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
