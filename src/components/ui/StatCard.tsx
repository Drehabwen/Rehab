/**
 * StatCard —— 统计卡（设计系统 A 阶段新基元）。
 *
 * 统一：圆角 var(--radius-md)、边框 line-subtle、阴影 elev-1、数值 26px tabular-nums、
 * 图标 36px 圆角块 + 语义色调。旧代码里的手写统计卡应迁移到它。
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StatTone = 'brand' | 'info' | 'warn' | 'success' | 'neutral' | 'violet';

const TONE_STYLES: Record<StatTone, string> = {
  brand: 'bg-brand-soft text-brand-strong',
  info: 'bg-state-info-bg text-state-info',
  warn: 'bg-state-warn-bg text-state-warn',
  success: 'bg-state-success-bg text-state-success',
  neutral: 'bg-surface-sunken text-ink-body',
  violet: 'bg-violet-50 text-violet-700',
};

export interface StatCardProps {
  value: React.ReactNode;
  label: string;
  icon?: LucideIcon;
  tone?: StatTone;
  hint?: string;
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  value,
  label,
  icon: Icon,
  tone = 'brand',
  hint,
  onClick,
  className,
}) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    className={cn(
      'flex min-h-[84px] items-center justify-between gap-3 rounded-token-md border border-line-subtle bg-surface-card p-4 shadow-elev-1 transition-colors duration-[var(--dur-base)]',
      onClick && 'cursor-pointer hover:border-line-strong',
      className,
    )}
  >
    <div className="min-w-0">
      <div className="text-[26px] font-semibold leading-none tabular-nums text-ink-strong">{value}</div>
      <div className="mt-1.5 truncate text-xs text-ink-muted">{label}</div>
      {hint !== undefined && <div className="mt-1 truncate text-[11px] text-ink-faint">{hint}</div>}
    </div>
    {Icon !== undefined && (
      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-token-sm', TONE_STYLES[tone])}>
        <Icon size={16} />
      </div>
    )}
  </div>
);
