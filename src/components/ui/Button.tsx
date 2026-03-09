import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'outline' | 'danger' | 'ghost';
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
    primary: 'bg-antey-primary text-white hover:bg-teal-700',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400',
    tertiary: 'bg-transparent text-slate-700 hover:bg-slate-100',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
    outline: 'bg-transparent border border-slate-300 text-slate-700 hover:border-antey-primary hover:text-antey-primary',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const sizeStyles = {
    sm: 'h-8 px-3 rounded-lg text-xs gap-1.5',
    md: 'h-10 px-4 rounded-xl text-sm gap-2',
    lg: 'h-11 px-5 rounded-xl text-sm gap-2.5',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>处理中...</span>
        </>
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
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
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
    default: 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400',
    primary: 'bg-antey-primary/10 text-antey-primary hover:bg-antey-primary/20',
    ghost: 'bg-transparent text-slate-500 hover:bg-slate-100',
    danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  };

  const sizeStyles = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-11 w-11 rounded-xl',
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
