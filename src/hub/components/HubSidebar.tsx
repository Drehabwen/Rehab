import React, { KeyboardEvent } from 'react';
import { LayoutDashboard, Activity, Mic, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeId: string;
  onSelect: (id: string) => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: '患者工作站', description: '查看患者工作站概览' },
  { id: 'vision3', icon: Activity, label: '体态分析', description: '进入体态分析模块' },
  { id: 'medvoice', icon: Mic, label: '语音接诊', description: '进入语音接诊助手' },
];

export const HubSidebar: React.FC<SidebarProps> = ({ activeId, onSelect, isCollapsed, onToggle }) => {
  const handleNavKeyDown = (e: KeyboardEvent<HTMLButtonElement>, itemId: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(itemId);
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = navItems.findIndex(item => item.id === itemId);
      const nextIndex = (currentIndex + 1) % navItems.length;
      const nextButton = e.currentTarget.parentElement?.querySelector(`[data-nav-id="${navItems[nextIndex].id}"]`) as HTMLButtonElement;
      nextButton?.focus();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = navItems.findIndex(item => item.id === itemId);
      const prevIndex = (currentIndex - 1 + navItems.length) % navItems.length;
      const prevButton = e.currentTarget.parentElement?.querySelector(`[data-nav-id="${navItems[prevIndex].id}"]`) as HTMLButtonElement;
      prevButton?.focus();
    }
  };

  const handleToggleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <aside 
      className={cn(
        "h-screen bg-slate-900 text-white transition-all duration-500 flex flex-col border-r border-white/5 relative z-20 shadow-2xl",
        isCollapsed ? "w-24" : "w-72"
      )}
      role="navigation"
      aria-label="主导航菜单"
    >
      {/* Brand Logo */}
      <div className="p-8 flex items-center gap-4 overflow-hidden">
        <div 
          className="w-10 h-10 rounded-2xl bg-gradient-to-br from-antey-primary to-blue-600 flex-shrink-0 flex items-center justify-center font-black text-xl shadow-lg shadow-antey-primary/20"
          aria-hidden="true"
        >
          A
        </div>
        {!isCollapsed && (
          <div className="flex flex-col animate-in fade-in slide-in-from-left-4 duration-500">
            <span className="font-black text-sm tracking-tight whitespace-nowrap uppercase">安特易健康</span>
            <span className="text-[9px] text-white/40 uppercase tracking-[0.3em] font-bold">Nexus Hub Pro</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-3" role="menubar" aria-label="功能模块">
        {navItems.map((item) => (
          <button
            key={item.id}
            data-nav-id={item.id}
            role="menuitem"
            aria-current={activeId === item.id ? 'page' : undefined}
            aria-label={item.description}
            tabIndex={activeId === item.id ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(e) => handleNavKeyDown(e, item.id)}
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-500 group relative overflow-hidden",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
              activeId === item.id 
                ? "bg-white/10 text-white shadow-xl ring-1 ring-white/10" 
                : "text-white/40 hover:bg-white/5 hover:text-white"
            )}
          >
            {activeId === item.id && (
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-antey-primary rounded-r-full shadow-[0_0_15px_rgba(13,148,136,0.8)]"
                aria-hidden="true"
              />
            )}
            
            <item.icon 
              size={24} 
              className={cn(
                "flex-shrink-0 transition-all duration-500",
                activeId === item.id ? "text-antey-primary scale-110" : "group-hover:scale-110"
              )} 
              aria-hidden="true"
            />
            
            {!isCollapsed && (
              <span className={cn(
                "font-black text-[11px] uppercase tracking-[0.2em] whitespace-nowrap transition-all duration-500",
                activeId === item.id ? "translate-x-1" : "group-hover:translate-x-1"
              )}>
                {item.label}
              </span>
            )}
            
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div 
                className="absolute left-full ml-6 px-4 py-2 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-300 whitespace-nowrap z-50 shadow-2xl ring-1 ring-white/10 translate-x-[-10px] group-hover:translate-x-0"
                role="tooltip"
              >
                {item.label}
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* Footer Actions */}
      <div className="p-4 space-y-3 border-t border-white/5">
        <button 
          className={cn(
            "w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-white/40 hover:bg-white/5 hover:text-white transition-all duration-500 group",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          )}
          aria-label="打开系统设置"
        >
          <Settings size={24} className="group-hover:rotate-90 transition-transform duration-700" aria-hidden="true" />
          {!isCollapsed && <span className="font-black text-[11px] uppercase tracking-[0.2em]">系统设置</span>}
        </button>
        
        <button 
          onClick={onToggle}
          onKeyDown={handleToggleKeyDown}
          className={cn(
            "w-full flex items-center justify-center p-4 rounded-2xl hover:bg-white/5 text-white/20 hover:text-white transition-all duration-500 group",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          )}
          aria-label={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
              <span className="text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">收起面板</span>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
