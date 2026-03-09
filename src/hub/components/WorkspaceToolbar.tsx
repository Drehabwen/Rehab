import React from 'react';
import { Camera, Mic, FileText, Database, BarChart3, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceToolbarProps {
  activeTool: 'vision3' | 'medvoice' | 'reports' | 'datacenter' | 'comparison' | 'rom';
  onSelectTool: (tool: 'vision3' | 'medvoice' | 'reports' | 'datacenter' | 'comparison' | 'rom') => void;
}

const tools = [
  { id: 'medvoice' as const, name: '语音接诊', icon: Mic, accent: 'text-violet-600' },
  { id: 'vision3' as const, name: '体态分析', icon: Camera, accent: 'text-blue-600' },
  { id: 'rom' as const, name: '关节活动度', icon: Activity, accent: 'text-green-600' },
  { id: 'comparison' as const, name: '前后对比', icon: BarChart3, accent: 'text-cyan-600' },
  { id: 'datacenter' as const, name: '数据中心', icon: Database, accent: 'text-teal-600' },
  { id: 'reports' as const, name: '报告中心', icon: FileText, accent: 'text-slate-600' },
];

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({ activeTool, onSelectTool }) => {
  return (
    <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-30">
      <div className="flex items-center gap-1 px-2 py-1.5 bg-white/92 border border-slate-200 rounded-xl shadow-[0_4px_12px_rgba(15,23,42,0.10)]">
        {tools.map((tool) => {
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={cn(
                'h-8 px-2.5 rounded-lg flex items-center gap-1.5 transition-colors',
                active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50'
              )}
            >
              <tool.icon size={14} className={cn(active ? tool.accent : 'text-slate-400')} />
              <span className="text-[11px] font-medium whitespace-nowrap">{tool.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
