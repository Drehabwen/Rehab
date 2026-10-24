/**
 * EmptyState —— 空状态（设计系统 A 阶段新基元）。
 *
 * 统一：虚线边框 + 居中 + 图标块 + 一句话说明 + 至多两个动作。
 * 旧代码里的 StatePanel 逐步迁移到这里（StatePanel 保留兼容）。
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  /** 撑满父级剩余高度并垂直居中（用于整页空态，避免底部留一大块空白） */
  fill?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon: Icon,
  actions,
  fill = false,
  className,
}) => (
  <section
    className={cn(
      'rounded-token-md border border-dashed border-line-subtle bg-surface-card px-6 py-10 text-center',
      fill && 'flex flex-1 flex-col items-center justify-center',
      className,
    )}
  >
    {Icon !== undefined && (
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-token-sm bg-surface-sunken text-ink-faint">
        <Icon size={20} />
      </div>
    )}
    <h3 className="text-[16px] font-semibold text-ink-strong">{title}</h3>
    {description !== undefined && (
      <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-ink-muted">{description}</p>
    )}
    {actions !== undefined && <div className="mt-5 flex items-center justify-center gap-3">{actions}</div>}
  </section>
);
