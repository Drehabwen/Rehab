import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'shimmer' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className,
  variant = 'text',
  width,
  height,
  animation = 'shimmer',
}) => {
  const baseStyles = 'bg-slate-200/70';
  
  const variantStyles = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-2xl',
  };

  const animationStyles = {
    pulse: 'animate-pulse',
    shimmer: 'animate-shimmer',
    none: '',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        animationStyles[animation],
        className
      )}
      style={style}
      aria-hidden="true"
    />
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('bento-card-glass p-6 space-y-4', className)}>
    <Skeleton variant="rounded" height={120} className="w-full" />
    <div className="space-y-2">
      <Skeleton variant="text" width="60%" />
      <Skeleton variant="text" width="80%" />
    </div>
  </div>
);

export const SkeletonButton: React.FC<{ 
  className?: string; 
  size?: 'sm' | 'md' | 'lg' 
}> = ({ className, size = 'md' }) => {
  const sizeStyles = {
    sm: 'h-8 w-20 rounded-xl',
    md: 'h-10 w-24 rounded-2xl',
    lg: 'h-12 w-28 rounded-2xl',
  };

  return (
    <Skeleton
      variant="rounded"
      className={cn(sizeStyles[size], className)}
    />
  );
};

export const SkeletonChart: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-4', className)}>
    <div className="flex justify-between items-end h-48 gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={Math.random() * 60 + 40}
          className="flex-1"
        />
      ))}
    </div>
    <div className="flex justify-between">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton key={i} variant="text" width={30} />
      ))}
    </div>
  </div>
);

export const SkeletonWebcam: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('relative aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-slate-900', className)}>
    <Skeleton variant="rectangular" className="absolute inset-0" animation="shimmer" />
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
      <SkeletonButton size="md" />
      <SkeletonButton size="md" />
    </div>
  </div>
);

export const SkeletonMetric: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('p-6 bg-white/60 rounded-[2rem] border border-white/40', className)}>
    <div className="flex items-center gap-3 mb-4">
      <Skeleton variant="circular" width={40} height={40} />
      <Skeleton variant="text" width={100} />
    </div>
    <Skeleton variant="text" height={32} width="60%" className="mb-2" />
    <Skeleton variant="text" width="40%" />
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="space-y-8 p-6">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton variant="text" height={32} width={200} />
        <Skeleton variant="text" width={300} />
      </div>
      <SkeletonButton />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-8">
        <SkeletonWebcam />
      </div>
      <div className="lg:col-span-4 space-y-4">
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
      </div>
    </div>
  </div>
);
