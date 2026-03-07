import React from 'react';
import { Camera, Mic, FileText, Database, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceToolbarProps {
  activeTool: 'vision3' | 'medvoice' | 'reports' | 'datacenter' | 'comparison';
  onSelectTool: (tool: 'vision3' | 'medvoice' | 'reports' | 'datacenter' | 'comparison') => void;
}

const tools = [
  { id: 'vision3' as const, name: '体态分析', icon: Camera, color: 'from-blue-500 to-cyan-500' },
  { id: 'medvoice' as const, name: '语音接诊', icon: Mic, color: 'from-purple-500 to-pink-500' },
  { id: 'comparison' as const, name: '前后对比', icon: BarChart3, color: 'from-emerald-500 to-teal-500' },
  { id: 'datacenter' as const, name: '数据中心', icon: Database, color: 'from-emerald-500 to-teal-500' },
  { id: 'reports' as const, name: '报告中心', icon: FileText, color: 'from-amber-500 to-orange-500' },
];

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  activeTool,
  onSelectTool
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-2 py-2 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20">
        {tools.map(tool => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className={cn(
              "flex items-center gap-3 px-5 py-3 rounded-[1.5rem] transition-all duration-300",
              activeTool === tool.id
                ? "bg-gradient-to-r shadow-lg"
                : "hover:bg-slate-50"
            )}
            style={activeTool === tool.id ? {
              backgroundImage: `linear-gradient(to right, ${tool.color.includes('blue') ? '#3b82f6, #06b6d4' : tool.color.includes('purple') ? '#a855f7, #ec4899' : tool.color.includes('emerald') ? '#10b981, #14b8a6' : tool.color.includes('amber') ? '#f59e0b, #f97316' : '#3b82f6, #06b6d4'})`
            } : {}}
          >
            <tool.icon 
              size={18} 
              className={activeTool === tool.id ? "text-white" : "text-slate-400"} 
            />
            <span className={cn(
              "text-[11px] font-black uppercase tracking-wider whitespace-nowrap",
              activeTool === tool.id ? "text-white" : "text-slate-400"
            )}>
              {tool.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
