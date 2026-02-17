import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-100 text-slate-600',
    primary: 'bg-antey-primary/10 text-antey-primary',
    success: 'bg-emerald-50 text-emerald-600',
    warning: 'bg-amber-50 text-amber-600',
    danger: 'bg-red-50 text-red-600',
    info: 'bg-blue-50 text-blue-600',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[9px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-black uppercase tracking-wider rounded-lg',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: 'pending' | 'assessing' | 'report' | 'completed';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className,
  ...props
}) => {
  const statusConfig = {
    pending: { label: '待接诊', variant: 'default' as const },
    assessing: { label: '评估中', variant: 'info' as const },
    report: { label: '待报告', variant: 'warning' as const },
    completed: { label: '已完成', variant: 'success' as const },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size="md" className={className} {...props}>
      {config.label}
    </Badge>
  );
};
