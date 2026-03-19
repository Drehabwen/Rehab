import React from 'react';
import {
  Activity,
  Bell,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileText,
  School,
  Settings,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
  onSettingsClick?: () => void;
  visibleItemIds?: string[];
  showSettings?: boolean;
}

const navItems = [
  { id: 'home', icon: ClipboardList, label: '首页' },
  { id: 'screening', icon: Activity, label: '筛查工作台' },
  { id: 'students', icon: Users, label: '学生档案' },
  { id: 'reports', icon: FileText, label: '报告中心' },
  { id: 'alerts', icon: Bell, label: '预警复测' },
  { id: 'organization', icon: School, label: '机构管理' },
];

export const HubSidebar: React.FC<SidebarProps> = ({
  activeId,
  onSelect,
  isCollapsed,
  onToggle,
  onSettingsClick,
  visibleItemIds,
  showSettings = true,
}) => {
  const visibleNavItems = visibleItemIds?.length
    ? navItems.filter((item) => visibleItemIds.includes(item.id))
    : navItems;

  return (
    <aside
      className={cn(
        'relative z-20 hidden h-screen flex-col border-r border-slate-700/40 bg-slate-900 text-white transition-all duration-300 md:flex',
        isCollapsed ? 'w-20' : 'w-64',
      )}
    >
      <div className="flex items-center gap-3 border-b border-slate-700/40 px-4 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-antey-primary text-sm font-semibold text-white">
          P
        </div>
        {!isCollapsed ? (
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight">体态筛查监控中心</div>
          </div>
        ) : null}
      </div>

      <nav className="flex-1 space-y-2 px-3 py-4">
        {visibleNavItems.map((item) => {
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
              type="button"
            >
              <item.icon size={18} className={cn('flex-shrink-0', active ? 'text-antey-primary' : 'text-slate-300')} />
              {!isCollapsed ? <span className="flex-1 truncate text-sm font-medium">{item.label}</span> : null}
              {!isCollapsed && active ? <span className="h-1.5 w-1.5 rounded-full bg-antey-primary" /> : null}
            </button>
          );
        })}
      </nav>

      <div className="px-3">
        <div className="h-px bg-slate-700/40" />
      </div>

      <div className="space-y-2 p-3">
        {showSettings ? (
          <button
            onClick={onSettingsClick || (() => {})}
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-slate-300 transition-colors hover:bg-white/5"
            type="button"
          >
            <Settings size={16} />
            {!isCollapsed ? <span className="text-sm font-medium">系统设置</span> : null}
          </button>
        ) : null}

        <button
          onClick={onToggle}
          className="flex h-10 w-full items-center justify-center rounded-xl text-slate-300 transition-colors hover:bg-white/5"
          aria-label="toggle sidebar"
          type="button"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
};
