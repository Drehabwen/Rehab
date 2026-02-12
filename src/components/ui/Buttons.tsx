import React, { KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
  activeColor?: 'primary' | 'accent';
  ariaLabel?: string;
}

export const TabButton: React.FC<TabButtonProps> = ({
  active,
  onClick,
  children,
  icon: Icon,
  activeColor = 'primary',
  ariaLabel,
}) => {
  const activeColorClass = activeColor === 'primary' 
    ? 'text-antey-primary shadow-lg shadow-antey-primary/5' 
    : 'text-antey-accent shadow-lg shadow-antey-accent/5';

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      role="tab"
      aria-selected={active}
      aria-label={ariaLabel}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2",
        active
          ? `bg-white ${activeColorClass} ring-1 ring-slate-200`
          : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
      )}
    >
      {Icon && (
        <Icon
          size={16}
          className={cn("transition-transform duration-500", active && "scale-110")}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
};

interface ViewToggleProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({ 
  options, 
  value, 
  onChange,
  ariaLabel = '视图切换'
}) => {
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, optionValue: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(optionValue);
    }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = options.findIndex(o => o.value === optionValue);
      const nextIndex = (currentIndex + 1) % options.length;
      onChange(options[nextIndex].value);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = options.findIndex(o => o.value === optionValue);
      const prevIndex = (currentIndex - 1 + options.length) % options.length;
      onChange(options[prevIndex].value);
    }
  };

  return (
    <div 
      className="flex p-1.5 bg-slate-100/50 rounded-2xl"
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          role="radio"
          aria-checked={value === option.value}
          aria-label={option.label}
          tabIndex={value === option.value ? 0 : -1}
          onClick={() => onChange(option.value)}
          onKeyDown={(e) => handleKeyDown(e, option.value)}
          className={cn(
            "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2",
            value === option.value
              ? "bg-white text-antey-primary shadow-md ring-1 ring-slate-200"
              : "text-slate-400 hover:text-slate-600"
          )}
        >
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              value === option.value ? "bg-antey-primary" : "bg-slate-300"
            )}
            aria-hidden="true"
          />
          {option.label}
        </button>
      ))}
    </div>
  );
};

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ElementType;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  icon: Icon,
  variant = 'default',
  size = 'md',
  disabled = false,
  className,
  ariaLabel,
  type = 'button',
}) => {
  const variantClasses = {
    default: 'bg-white/10 hover:bg-white/20 text-white border-white/20',
    primary: 'bg-antey-primary hover:bg-antey-primary/90 text-white border-antey-primary/30',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500/30',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500/30',
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-[9px] gap-1.5',
    md: 'px-5 py-3 text-[10px] gap-2',
    lg: 'px-6 py-4 text-[11px] gap-2.5',
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type={type}
      role="button"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        "flex items-center rounded-2xl border font-black uppercase tracking-widest transition-all duration-300 backdrop-blur-md",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2",
        variantClasses[variant],
        sizeClasses[size],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {Icon && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 20 : 16} aria-hidden="true" />}
      {children}
    </button>
  );
};

interface IconButtonProps {
  onClick: () => void;
  icon: React.ElementType;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'primary' | 'ghost';
}

export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  icon: Icon,
  ariaLabel,
  disabled = false,
  className,
  size = 'md',
  variant = 'default',
}) => {
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-2.5',
    lg: 'p-3',
  };

  const variantClasses = {
    default: 'text-slate-500 hover:bg-white hover:text-antey-primary hover:shadow-sm',
    primary: 'bg-antey-primary text-white hover:bg-antey-primary/90',
    ghost: 'text-white/60 hover:text-white hover:bg-white/10',
  };

  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 24,
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
      className={cn(
        "rounded-xl transition-all group",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-antey-primary focus-visible:ring-offset-2",
        sizeClasses[size],
        variantClasses[variant],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      <Icon 
        size={iconSizes[size]} 
        className="group-hover:scale-110 transition-transform" 
        aria-hidden="true" 
      />
    </button>
  );
};
