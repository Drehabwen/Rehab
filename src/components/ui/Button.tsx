import React from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled,
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-gradient-to-r from-antey-primary to-teal-600 text-white hover:shadow-lg hover:shadow-antey-primary/20',
    secondary: 'bg-white border border-slate-200 text-slate-700 hover:border-antey-primary/30 hover:bg-slate-50',
    outline: 'bg-transparent border border-slate-300 text-slate-700 hover:border-antey-primary hover:text-antey-primary',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-[10px] gap-1.5 rounded-lg',
    md: 'px-4 py-2 text-xs gap-2 rounded-xl',
    lg: 'px-6 py-3 text-sm gap-2.5 rounded-2xl',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-black uppercase tracking-wider transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="animate-spin mr-2">⟳</span>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
          {children}
          {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton: React.FC<IconButtonProps> = ({
  children,
  className,
  variant = 'default',
  size = 'md',
  ...props
}) => {
  const variantStyles = {
    default: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
    primary: 'bg-antey-primary/10 hover:bg-antey-primary/20 text-antey-primary',
    ghost: 'bg-transparent hover:bg-slate-100 text-slate-500',
  };

  const sizeStyles = {
    sm: 'p-1.5 rounded-lg',
    md: 'p-2.5 rounded-xl',
    lg: 'p-3 rounded-2xl',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
