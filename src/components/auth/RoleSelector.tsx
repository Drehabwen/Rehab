import React from 'react';
import type { RoleLoginOption, UserRole } from '@/auth/access';
import { cn } from '@/lib/utils';

interface RoleSelectorProps {
  options: RoleLoginOption[];
  value: UserRole;
  onChange: (role: UserRole) => void;
  className?: string;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({ options, value, onChange, className }) => (
  <div className={cn('space-y-3', className)}>
    {options.map((option) => {
      const active = value === option.value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'w-full rounded-2xl border px-4 py-4 text-left transition',
            active
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300',
          )}
        >
          <div className="text-sm font-semibold">{option.label}</div>
          <div className={cn('mt-1 text-xs', active ? 'text-slate-200' : 'text-slate-500')}>{option.description}</div>
        </button>
      );
    })}
  </div>
);
