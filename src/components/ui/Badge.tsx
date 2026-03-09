import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'disabled';
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
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-antey-primary/10 text-antey-primary',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    disabled: 'bg-slate-200 text-slate-500',
  };

  const sizeStyles = {
    sm: 'h-5 px-2 text-[11px] rounded-md',
    md: 'h-6 px-2.5 text-xs rounded-lg',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium',
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

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, ...props }) => {
  const statusConfig = {
    pending: { label: '待接诊', variant: 'warning' as const },
    assessing: { label: '评估中', variant: 'info' as const },
    report: { label: '待报告', variant: 'primary' as const },
    completed: { label: '已完成', variant: 'success' as const },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} size="md" className={className} {...props}>
      {config.label}
    </Badge>
  );
};
