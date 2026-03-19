import React from 'react';
import type { RoleLoginOption, UserRole } from '@/auth/access';
import { Button } from '@/components/ui';
import { RoleSelector } from './RoleSelector';

interface RoleLoginPanelProps {
  options: RoleLoginOption[];
  selectedRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  onLogin: () => void;
}

export const RoleLoginPanel: React.FC<RoleLoginPanelProps> = ({
  options,
  selectedRole,
  onSelectRole,
  onLogin,
}) => (
  <div className="min-h-screen bg-slate-100 px-4 py-10">
    <div className="mx-auto w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
      <div className="mb-6">
        <div className="text-xs font-semibold tracking-wide text-slate-500">SPORT REHAB</div>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">登录并选择角色</h1>
        <p className="mt-2 text-sm text-slate-600">先选择本次身份，系统会按角色显示可用功能与权限。</p>
      </div>

      <RoleSelector options={options} value={selectedRole} onChange={onSelectRole} />

      <Button type="button" onClick={onLogin} className="mt-6 w-full">
        进入系统
      </Button>
    </div>
  </div>
);
