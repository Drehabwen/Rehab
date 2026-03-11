import React from 'react';
import { Activity, Layers, Mic, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkspaceToolbarProps {
  activeTool: 'vision3' | 'medvoice' | 'comparison' | 'rom';
  onSelectTool: (tool: 'vision3' | 'medvoice' | 'comparison' | 'rom') => void;
}

const primaryTools = [
  { id: 'vision3' as const, name: '体态评估', icon: Activity, accent: 'text-blue-600' },
  { id: 'rom' as const, name: 'ROM 评估', icon: Layers, accent: 'text-emerald-600' },
  { id: 'medvoice' as const, name: '语音问诊', icon: Mic, accent: 'text-violet-600' },
];

const comparisonTool = { id: 'comparison' as const, name: '进度对比', icon: BarChart3, accent: 'text-cyan-600' };

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({ activeTool, onSelectTool }) => {
  const visibleTools = activeTool === 'comparison' ? [...primaryTools, comparisonTool] : primaryTools;

  return (
    <div className="fixed bottom-3 left-1/2 z-30 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-white/95 px-2 py-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-sm">
        {visibleTools.map((tool) => {
          const active = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className={cn(
                'flex h-9 items-center gap-1.5 rounded-xl px-3 transition-colors',
                active ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:bg-slate-50',
              )}
            >
              <tool.icon size={15} className={cn(active ? tool.accent : 'text-slate-400')} />
              <span className="whitespace-nowrap text-xs font-medium">{tool.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
