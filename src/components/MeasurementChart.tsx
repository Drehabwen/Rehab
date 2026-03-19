import { useMeasurementStore } from '@/store/useMeasurementStore';
import { getStandardRange } from '@/constants/standard-ranges';
import { Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const JOINT_NAMES: Record<string, string> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  thoracolumbar: '胸腰段',
  wrist: '腕关节',
  ankle: '踝关节',
  hip: '髋关节',
  knee: '膝关节',
  elbow: '肘关节',
};

const DIRECTION_NAMES: Record<string, string> = {
  flexion: '前屈',
  extension: '后伸',
  abduction: '外展',
  adduction: '内收',
  'internal-rotation': '内旋',
  'external-rotation': '外旋',
  'left-rotation': '左旋',
  'right-rotation': '右旋',
  'left-lateral-flexion': '左侧屈',
  'right-lateral-flexion': '右侧屈',
  'ulnar-deviation': '尺偏',
  'radial-deviation': '桡偏',
  dorsiflexion: '背屈',
  plantarflexion: '跖屈',
};

const SIDE_NAMES: Record<string, string> = {
  left: '左',
  right: '右',
};

export default function MeasurementChart() {
  const { activeMeasurements, isMeasuring } = useMeasurementStore();

  if (activeMeasurements.length === 0) {
    return (
      <div className="flex h-[350px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-8 text-center">
        <div className="mb-4 rounded-xl bg-white p-3 shadow-sm">
          <Activity className="h-6 w-6 text-gray-400" />
        </div>
        <p className="font-medium text-gray-500">请先添加测量项并开始采集，趋势图会显示在这里。</p>
      </div>
    );
  }

  const primaryMeasurement = activeMeasurements[0];
  const chartData = primaryMeasurement.data.map((point, index) => {
    const merged: { timestamp: number; [key: string]: number } = { timestamp: point.timestamp };
    activeMeasurements.forEach((measurement) => {
      if (measurement.data[index]) {
        merged[measurement.id] = measurement.data[index].angle;
      }
    });
    return merged;
  });

  const displayData = chartData.slice(-100);

  return (
    <div className="relative flex h-full flex-col">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-slate-900">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-antey-accent" />
            活动度实时趋势
          </h3>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Real-time ROM Analysis</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeMeasurements.map((measurement) => {
            const standardRange = getStandardRange(measurement.joint, measurement.direction);
            return (
              <div
                key={measurement.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm"
              >
                <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: measurement.color }} />
                <div>
                  <div className="mb-1 text-[9px] font-black uppercase leading-none tracking-widest text-slate-400">
                    {JOINT_NAMES[measurement.joint] || measurement.joint}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black leading-none text-slate-900">
                      {measurement.maxAngle === -Infinity ? '0.0' : measurement.maxAngle.toFixed(1)}°
                    </span>
                    {standardRange && (
                      <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">
                        REF: {standardRange.min}-{standardRange.max}°
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="relative min-h-[250px] w-full flex-1">
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              {activeMeasurements.map((measurement) => (
                <linearGradient key={`grad-${measurement.id}`} id={`color-${measurement.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={measurement.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={measurement.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="timestamp"
              type="number"
              domain={['auto', 'auto']}
              tickFormatter={(value) => `${value.toFixed(1)}s`}
              tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              hide={!isMeasuring}
            />
            <YAxis
              domain={[0, 180]}
              tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}°`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                border: '1px solid #f1f5f9',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
                padding: '12px',
                backdropFilter: 'blur(10px)',
              }}
              itemStyle={{ fontSize: '11px', fontWeight: 800, padding: '2px 0' }}
              labelStyle={{
                fontSize: '10px',
                fontWeight: 900,
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 5' }}
              formatter={(value: number, name: string) => {
                const measurement = activeMeasurements.find((item) => item.id === name);
                if (measurement) {
                  const joint = JOINT_NAMES[measurement.joint] || measurement.joint;
                  const side = measurement.side ? SIDE_NAMES[measurement.side] || measurement.side : '';
                  const direction = DIRECTION_NAMES[measurement.direction] || measurement.direction;
                  const sideText = side ? `(${side})` : '';
                  return [`${value.toFixed(1)}°`, `${joint}${sideText} ${direction}`];
                }
                return [`${value.toFixed(1)}°`, name];
              }}
              labelFormatter={(label: number) => `T+ ${label.toFixed(2)}s`}
            />

            {activeMeasurements.map((measurement) => (
              <Line
                key={measurement.id}
                type="monotone"
                dataKey={measurement.id}
                stroke={measurement.color}
                strokeWidth={4}
                dot={false}
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: measurement.color }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!isMeasuring && displayData.length === 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 flex items-center justify-center">
          <span className="rounded-full border border-gray-100 bg-white/80 px-4 py-2 text-xs font-bold text-gray-400 shadow-sm backdrop-blur-sm">
            等待数据采集...
          </span>
        </div>
      )}
    </div>
  );
}
