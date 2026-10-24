import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

/**
 * 卡片基元（设计系统 A）。
 *
 * - default：白底 + hairline 边框 + elev-1
 * - elevated：白底 + elev-2（浮起面板）
 * - outlined：透明底 + 强边框（分组用，不抢层级）
 *
 * 圆角/边框/阴影全部来自 token（src/index.css :root），不要在这里写死色值。
 */
export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface-card border border-line-subtle shadow-elev-1',
    elevated: 'bg-surface-card shadow-elev-2',
    outlined: 'border border-line-strong bg-transparent',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-token-md transition-[border-color,box-shadow] duration-[var(--dur-base)]',
        variantStyles[variant],
        paddingStyles[padding],
        hover && 'cursor-pointer hover:border-line-strong hover:shadow-elev-2',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn('pb-4 border-b border-line-subtle mb-4', className)} {...props}>
      {children}
    </div>
  );
};

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' }> = ({
  children,
  className,
  as: Component = 'h3',
  ...props
}) => {
  return (
    <Component className={cn('text-xl font-semibold text-ink-strong', className)} {...props}>
      {children}
    </Component>
  );
};

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <p className={cn('text-sm text-ink-muted mt-1', className)} {...props}>
      {children}
    </p>
  );
};

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return <div className={cn('', className)} {...props}>{children}</div>;
};

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <div className={cn('pt-4 border-t border-line-subtle mt-4', className)} {...props}>
      {children}
    </div>
  );
};
