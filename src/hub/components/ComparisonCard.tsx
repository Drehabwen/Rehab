import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MetricComparison } from '@/types/comparison';
import { STATUS_LABELS } from '@/types/comparison';
import { cn } from '@/lib/utils';

interface ComparisonCardProps {
  metric: MetricComparison;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({ metric }) => {
  // 获取状态图标
  const getStatusIcon = () => {
    switch (metric.status) {
      case 'improved':
        return <TrendingUp className="text-emerald-500" size={20} aria-hidden="true" />;
      case 'worsened':
        return <TrendingDown className="text-rose-500" size={20} aria-hidden="true" />;
      case 'stable':
        return <Minus className="text-slate-400" size={20} aria-hidden="true" />;
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    switch (metric.status) {
      case 'improved':
        return 'bg-emerald-50 border-emerald-200';
      case 'worsened':
        return 'bg-rose-50 border-rose-200';
      case 'stable':
        return 'bg-slate-50 border-slate-200';
    }
  };

  // 获取改善率颜色
  const getImprovementColor = () => {
    if (metric.status === 'improved') return 'text-emerald-600';
    if (metric.status === 'worsened') return 'text-rose-600';
    return 'text-slate-500';
  };

  // 构建无障碍标签
  const ariaLabel = `${metric.label}对比：从${metric.baseline}${metric.unit}到${metric.current}${metric.unit}，${STATUS_LABELS[metric.status]}`;
  
  // 屏幕阅读器文本
  const srText = `${metric.label}：基线${metric.baseline}${metric.unit}，当前${metric.current}${metric.unit}，改善率${metric.improvement > 0 ? '正' : '负'}${Math.abs(metric.improvement)}%，状态${STATUS_LABELS[metric.status]}`;

  return (
    <div 
      role="article"
      aria-label={ariaLabel}
      className={cn(
        'bento-card p-6 transition-all hover:scale-[1.02]',
        getStatusColor()
      )}
    >
      {/* 屏幕阅读器专用文本 */}
      <span className="sr-only">{srText}</span>
      
      {/* 视觉内容（对屏幕阅读器隐藏） */}
      <div aria-hidden="true">
        {/* 头部：指标名称和状态图标 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              {metric.label}
            </h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {metric.unit}
          </span>
        </div>

        {/* 数值对比 */}
        <div className="flex items-center justify-between">
          {/* 基线值 */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              基线
            </div>
            <div className="text-2xl font-black text-slate-900">
              {metric.baseline}
            </div>
          </div>

          {/* 箭头 */}
          <ArrowRight className="text-slate-300" size={20} />

          {/* 当前值 */}
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              当前
            </div>
            <div className="text-2xl font-black text-slate-900">
              {metric.current}
            </div>
          </div>

          {/* 改善率 */}
          <div className="text-right">
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              改善率
            </div>
            <div className={cn('text-2xl font-black', getImprovementColor())}>
              {metric.improvement > 0 ? '+' : ''}{metric.improvement}%
            </div>
          </div>
        </div>

        {/* 变化值提示 */}
        <div className="mt-3 pt-3 border-t border-slate-200/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              变化: {metric.change > 0 ? '+' : ''}{metric.change} {metric.unit}
            </span>
            <span className={cn(
              'font-medium',
              metric.status === 'improved' ? 'text-emerald-600' :
              metric.status === 'worsened' ? 'text-rose-600' :
              'text-slate-500'
            )}>
              {STATUS_LABELS[metric.status]}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
