import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ChevronDown, ShieldCheck } from 'lucide-react';
import { NexusHub } from '@/hub/NexusHub';
import { CompetitionDemoPage } from './pages/CompetitionDemoPage';
import { ROLE_LOGIN_OPTIONS, type UserRole } from '@/auth/access';
import { RoleLoginPanel } from '@/components/auth/RoleLoginPanel';
import { RoleSelector } from '@/components/auth/RoleSelector';
import { Button } from '@/components/ui';

const readStoredRole = (): UserRole | null => {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem('rehab_role');
  if (!value) return null;
  return ROLE_LOGIN_OPTIONS.some((item) => item.value === value) ? (value as UserRole) : null;
};

export default function App() {
  const isCompetitionDemo =
    typeof window !== 'undefined' && window.location.pathname.startsWith('/competition-demo');
  const initialRole = useMemo(() => readStoredRole(), []);
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole ?? 'assistant_medic');
  const [authenticatedRole, setAuthenticatedRole] = useState<UserRole | null>(initialRole);
  const [hubVersion, setHubVersion] = useState(0);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);
  const activeRoleOption = ROLE_LOGIN_OPTIONS.find((option) => option.value === authenticatedRole) ?? ROLE_LOGIN_OPTIONS[0];

  const handleLogin = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('rehab_role', selectedRole);
    if (!window.localStorage.getItem('rehab_user_id')) {
      window.localStorage.setItem('rehab_user_id', selectedRole === 'assistant_medic' ? 'operator-001' : 'manager-001');
    }
    if (!window.localStorage.getItem('rehab_team_id')) {
      window.localStorage.setItem('rehab_team_id', 'team-alpha');
    }
    setAuthenticatedRole(selectedRole);
    setHubVersion((prev) => prev + 1);
  };

  const handleSwitchRole = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem('rehab_role');
    setAuthenticatedRole(null);
    setShowRoleMenu(false);
  };

  const handleApplyRole = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('rehab_role', selectedRole);
    window.localStorage.setItem('rehab_user_id', selectedRole === 'assistant_medic' ? 'operator-001' : 'manager-001');
    if (!window.localStorage.getItem('rehab_team_id')) {
      window.localStorage.setItem('rehab_team_id', 'team-alpha');
    }
    setAuthenticatedRole(selectedRole);
    setHubVersion((prev) => prev + 1);
    setShowRoleMenu(false);
  };

  useEffect(() => {
    if (!showRoleMenu) return;
    const handleDocumentClick = (event: MouseEvent) => {
      if (!roleMenuRef.current) return;
      if (!roleMenuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [showRoleMenu]);

  if (isCompetitionDemo) {
    return (
      <Router>
        <Routes>
          <Route path="/competition-demo" element={<CompetitionDemoPage />} />
        </Routes>
      </Router>
    );
  }

  if (!authenticatedRole) {
    return (
      <RoleLoginPanel
        options={ROLE_LOGIN_OPTIONS}
        selectedRole={selectedRole}
        onSelectRole={setSelectedRole}
        onLogin={handleLogin}
      />
    );
  }

  return (
    <>
      <div ref={roleMenuRef} className="fixed right-4 top-4 z-[60]">
        <button
          type="button"
          onClick={() => setShowRoleMenu((prev) => !prev)}
          className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3 py-2 text-xs shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur transition hover:border-slate-300 hover:bg-white"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white">
            <ShieldCheck size={14} />
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[10px] font-medium text-slate-500">当前角色</span>
            <span className="block text-xs font-semibold text-slate-800">{activeRoleOption.label}</span>
          </span>
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${showRoleMenu ? 'rotate-180' : ''}`}
          />
        </button>
        {showRoleMenu ? (
          <div className="mt-2 w-[360px] rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-[0_20px_56px_rgba(15,23,42,0.18)] backdrop-blur">
            <div className="mb-3">
              <div className="text-sm font-semibold text-slate-900">快速切换角色</div>
              <div className="mt-1 text-xs text-slate-500">切换后会立即刷新可访问模块与权限范围。</div>
            </div>
            <RoleSelector options={ROLE_LOGIN_OPTIONS} value={selectedRole} onChange={setSelectedRole} />
            <div className="mt-4 flex items-center gap-2">
              <Button type="button" onClick={handleApplyRole} className="flex-1">
                应用角色
              </Button>
              <Button type="button" variant="secondary" onClick={handleSwitchRole} className="flex-1">
                返回登录页
              </Button>
            </div>
          </div>
        ) : null}
      </div>
      <Router>
        <Routes>
          <Route path="/*" element={<NexusHub key={hubVersion} />} />
        </Routes>
      </Router>
    </>
  );
}
