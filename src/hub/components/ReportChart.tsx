import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface ReportChartProps {
  type: 'sway' | 'angle' | 'velocity';
  data: any[];
  title?: string;
  metricKey: string;
  unit?: string;
  color?: string;
}

export const ReportChart: React.FC<ReportChartProps> = ({ 
  type, 
  data, 
  title, 
  metricKey, 
  unit = '', 
  color = '#3b82f6' 
}) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-64 my-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">{title}</h4>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">单位: {unit}</span>
        </div>
      )}
      <ResponsiveContainer width="100%" height="100%">
        {type === 'sway' ? (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="timestamp" 
              hide 
            />
            <YAxis 
              fontSize={10} 
              fontWeight="bold" 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(val) => `${val.toFixed(1)}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, title]}
            />
            <Area 
              type="monotone" 
              dataKey={metricKey} 
              stroke={color} 
              fillOpacity={1} 
              fill="url(#colorMetric)" 
              strokeWidth={3}
            />
          </AreaChart>
        ) : (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis dataKey="timestamp" hide />
            <YAxis 
              fontSize={10} 
              fontWeight="bold" 
              axisLine={false} 
              tickLine={false}
              tickFormatter={(val) => `${val.toFixed(1)}`}
            />
            <Tooltip 
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              labelStyle={{ display: 'none' }}
              formatter={(value: number) => [`${value.toFixed(2)} ${unit}`, title]}
            />
            <Line 
              type="monotone" 
              dataKey={metricKey} 
              stroke={color} 
              strokeWidth={3} 
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};
