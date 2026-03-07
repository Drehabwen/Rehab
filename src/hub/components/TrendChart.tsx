import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendData } from '@/types/comparison';

interface TrendChartProps {
  data: TrendData[];
  metricKey: string;
  metricLabel: string;
  unit?: string;
  color?: string;
  showAverage?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  metricKey,
  metricLabel,
  unit = '',
  color = '#3b82f6',
  showAverage = true
}) => {
  // 使用 useMemo 缓存图表数据计算
  const chartData = useMemo(() => {
    return data
      .filter(d => d.metrics[metricKey] !== undefined && !isNaN(d.metrics[metricKey]))
      .map(d => ({
        date: d.date,
        value: Number(d.metrics[metricKey]),
        timestamp: d.timestamp
      }));
  }, [data, metricKey]);

  // 计算平均值
  const average = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.value, 0);
    return sum / chartData.length;
  }, [chartData]);

  // 计算趋势
  const trend = useMemo(() => {
    if (chartData.length < 2) return 'stable';
    const first = chartData[0].value;
    const last = chartData[chartData.length - 1].value;
    const change = ((last - first) / Math.abs(first)) * 100;
    
    if (change > 10) return 'up';
    if (change < -10) return 'down';
    return 'stable';
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-slate-50 rounded-2xl border border-slate-100">
        <div className="text-center">
          <div className="text-slate-400 text-sm mb-2">暂无数据</div>
          <div className="text-slate-300 text-xs">该指标在历史评估中未记录</div>
        </div>
      </div>
    );
  }

  // 如果数据点过多，进行采样
  const sampledData = useMemo(() => {
    const maxPoints = 20;
    if (chartData.length <= maxPoints) return chartData;
    
    const step = Math.ceil(chartData.length / maxPoints);
    return chartData.filter((_, index) => index % step === 0);
  }, [chartData]);

  return (
    <div className="w-full h-64 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      {/* 标题和统计信息 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">
            {metricLabel} 趋势
          </h4>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              单位: {unit}
            </span>
            {chartData.length > 0 && (
              <span className="text-[10px] font-medium text-slate-500">
                共 {chartData.length} 次评估
              </span>
            )}
          </div>
        </div>
        
        {/* 趋势指示器 */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            趋势
          </span>
          <span className={`
            text-xs font-black px-2 py-1 rounded-lg
            ${trend === 'up' ? 'bg-emerald-100 text-emerald-700' :
              trend === 'down' ? 'bg-rose-100 text-rose-700' :
              'bg-slate-200 text-slate-600'}
          `}>
            {trend === 'up' ? '↑ 上升' :
             trend === 'down' ? '↓ 下降' :
             '→ 稳定'}
          </span>
        </div>
      </div>

      {/* 图表 */}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={sampledData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            stroke="#e2e8f0"
            tickLine={false}
            axisLine={false}
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            stroke="#e2e8f0"
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: number) => [`${value} ${unit}`, metricLabel]}
            labelFormatter={(label) => `日期: ${label}`}
          />
          {showAverage && chartData.length > 1 && (
            <ReferenceLine 
              y={average} 
              stroke="#94a3b8" 
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          )}
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 3, stroke: '#fff' }}
            activeDot={{ r: 5, strokeWidth: 0 }}
            animationDuration={500}
            animationEasing="ease-out"
          />
        </LineChart>
      </ResponsiveContainer>

      {/* 统计信息 */}
      {chartData.length > 0 && (
        <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-center justify-between text-[10px] text-slate-400">
          <span>首次: {chartData[0].value} {unit}</span>
          <span>平均: {average.toFixed(1)} {unit}</span>
          <span>最新: {chartData[chartData.length - 1].value} {unit}</span>
        </div>
      )}
    </div>
  );
};

// 虚拟滚动版本（用于大数据量）
interface VirtualTrendChartProps extends TrendChartProps {
  containerHeight?: number;
}

export const VirtualTrendChart: React.FC<VirtualTrendChartProps> = ({
  data,
  containerHeight = 600,
  ...props
}) => {
  // 如果数据量不大，使用普通版本
  if (data.length <= 10) {
    return <TrendChart data={data} {...props} />;
  }

  // 大数据量时，只显示最近 10 条
  const recentData = useMemo(() => {
    return data.slice(-10);
  }, [data]);

  return (
    <div>
      <TrendChart data={recentData} {...props} />
      <div className="mt-2 text-center text-xs text-slate-400">
        显示最近 10 次评估（共 {data.length} 次）
      </div>
    </div>
  );
};
