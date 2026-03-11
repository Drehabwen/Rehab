import React from 'react';
import { ClipboardList, FileText, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  onSettingsClick?: () => void;
}

const navItems = [
  { id: 'dashboard', icon: ClipboardList, label: '接诊中心' },
  { id: 'reports', icon: FileText, label: '报告中心' },
];

export const HubSidebar: React.FC<SidebarProps> = ({ activeId, onSelect, isCollapsed, onToggle, onSettingsClick }) => {
  return (
    <aside
      className={cn(
        'relative z-20 hidden h-screen flex-col border-r border-slate-700/40 bg-slate-900 text-white transition-all duration-300 md:flex',
        isCollapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex items-center gap-3 border-b border-slate-700/40 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-antey-primary text-sm font-semibold text-white">
          R
        </div>
        {!isCollapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">Medical AI Workspace</div>
            <div className="truncate text-[11px] text-slate-400">围绕接诊流程组织的康复 AI 工作台</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-2 px-3 py-4">
        {navItems.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'flex h-11 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors',
                active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5',
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className={cn('flex-shrink-0', active ? 'text-antey-primary' : 'text-slate-300')} />
              {!isCollapsed ? <span className="flex-1 truncate text-sm font-medium">{item.label}</span> : null}
              {!isCollapsed && active ? <span className="h-1.5 w-1.5 rounded-full bg-antey-primary" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-slate-700/40 p-3">
        <button
          onClick={onSettingsClick || (() => {})}
          className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-slate-300 transition-colors hover:bg-white/5"
        >
          <Settings size={16} />
          {!isCollapsed ? <span className="text-sm font-medium">系统设置</span> : null}
        </button>

        <button
          onClick={onToggle}
          className="flex h-10 w-full items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/5"
          aria-label="toggle sidebar"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};
