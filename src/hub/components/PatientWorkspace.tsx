import React from 'react';
import { Camera, Mic, FileText, ChevronLeft, User, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Patient } from '@/types/patient';
import { 
  getPatientDisplayName,
  getPatientAvatar,
  getPatientColor
} from '@/lib/patient-utils';

interface PatientWorkspaceProps {
  patient: Patient;
  sessionCount: number;
  onSelectTool: (tool: 'vision3' | 'medvoice' | 'reports' | 'comparison') => void;
  onBack: () => void;
}

export const PatientWorkspace: React.FC<PatientWorkspaceProps> = ({
  patient,
  sessionCount,
  onSelectTool,
  onBack
}) => {
  const tools = [
    { 
      id: 'vision3' as const, 
      name: '体态分析', 
      icon: Camera, 
      color: 'from-blue-500 to-cyan-500',
      description: '基于计算机视觉的实时姿态评估与关键关节活动度分析'
    },
    { 
      id: 'medvoice' as const, 
      name: '语音接诊', 
      icon: Mic, 
      color: 'from-purple-500 to-pink-500',
      description: 'AI 驱动的病历录入与语音指令交互助手'
    },
    { 
      id: 'comparison' as const, 
      name: '前后对比', 
      icon: BarChart3, 
      color: 'from-emerald-500 to-teal-500',
      description: '对比不同时期的评估数据，展示治疗效果和改善趋势'
    },
    { 
      id: 'reports' as const, 
      name: '报告中心', 
      icon: FileText, 
      color: 'from-amber-500 to-orange-500',
      description: '查看历史评估报告与生成新的分析报告'
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 患者信息头 */}
      <div className="flex items-center gap-6">
        <button 
          onClick={onBack}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-antey-primary/30 hover:shadow-lg transition-all group"
        >
          <ChevronLeft size={20} className="text-slate-400 group-hover:text-antey-primary" />
        </button>
        
        <div className="flex-1 bento-card p-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={cn(
              "w-16 h-16 rounded-[2rem] flex items-center justify-center",
              getPatientColor(patient)
            )}>
              <span className="text-white text-3xl font-black">
                {getPatientAvatar(patient)}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-2xl font-black text-slate-900">
                  {getPatientDisplayName(patient)}
                </h2>
              </div>
              <p className="text-slate-400 text-sm font-medium">
                第 <span className="text-antey-primary font-black">{sessionCount}</span> 次接诊
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">状态</div>
            <div className="px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider">
              就绪
            </div>
          </div>
        </div>
      </div>

      {/* 工具选择 */}
      <div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
          选择工作工具
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {tools.map(tool => (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="group bento-card p-8 text-left h-full flex flex-col justify-between hover:border-antey-primary/20 transition-all hover:scale-[1.02]"
            >
              <div className={cn(
                "w-14 h-14 rounded-[1.5rem] bg-gradient-to-br flex items-center justify-center mb-6 shadow-lg",
                tool.color
              )}>
                <tool.icon size={24} className="text-white" />
              </div>
              
              <div>
                <h4 className="text-lg font-black text-slate-900 mb-2">{tool.name}</h4>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  {tool.description}
                </p>
              </div>
              
              <div className="mt-6 flex items-center gap-2 text-antey-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0 duration-500">
                进入 <ChevronLeft size={14} className="rotate-180" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
