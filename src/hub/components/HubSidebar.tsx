import React from 'react';
import { LayoutDashboard, Settings, ChevronLeft, ChevronRight, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  onSettingsClick?: () => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: '患者工作站' },
  { id: 'datacenter', icon: Database, label: '数据与报告' },
];

export const HubSidebar: React.FC<SidebarProps> = ({ activeId, onSelect, isCollapsed, onToggle, onSettingsClick }) => {
  return (
    <aside
      className={cn(
        'h-screen bg-slate-900 text-white transition-all duration-300 flex flex-col border-r border-slate-700/40 relative z-20 hidden md:flex',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="px-4 py-5 flex items-center gap-3 border-b border-slate-700/40">
        <div className="w-9 h-9 rounded-xl bg-antey-primary text-white flex items-center justify-center text-sm font-semibold">
          R
        </div>
        {!isCollapsed ? (
          <div className="min-w-0">
            <div className="text-sm font-semibold tracking-tight truncate">Rehab Hub</div>
            <div className="text-[11px] text-slate-400 truncate">康复评估系统</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-2">
        {navItems.map((item) => {
          const active = activeId === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 h-11 rounded-xl transition-colors text-left',
                active ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className={cn('flex-shrink-0', active ? 'text-antey-primary' : 'text-slate-300')} />
              {!isCollapsed ? (
                <span className="text-sm font-medium truncate flex-1">{item.label}</span>
              ) : null}
              {!isCollapsed && active ? <span className="w-1.5 h-1.5 rounded-full bg-antey-primary" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-700/40 space-y-2">
        <button
          onClick={onSettingsClick || (() => {})}
          className="w-full h-10 px-3 rounded-xl text-slate-300 hover:bg-white/5 transition-colors flex items-center gap-3"
        >
          <Settings size={16} />
          {!isCollapsed ? <span className="text-sm font-medium">系统设置</span> : null}
        </button>

        <button
          onClick={onToggle}
          className="w-full h-10 rounded-xl text-slate-300 hover:bg-white/5 transition-colors flex items-center justify-center"
          aria-label="toggle sidebar"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};
