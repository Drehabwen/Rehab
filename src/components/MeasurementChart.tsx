import { useMeasurementStore } from '@/store/useMeasurementStore';
import { getStandardRange } from '@/constants/standard-ranges';
import { Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const JOINT_NAMES: Record<string, string> = {
  'cervical': '颈椎',
  'shoulder': '肩关节',
  'thoracolumbar': '胸腰椎',
  'wrist': '腕关节',
  'ankle': '踝关节',
  'hip': '髋关节',
  'knee': '膝关节',
  'elbow': '肘关节'
};

const DIRECTION_NAMES: Record<string, string> = {
  'flexion': '前屈',
  'extension': '后伸',
  'abduction': '外展',
  'adduction': '内收',
  'internal-rotation': '内旋',
  'external-rotation': '外旋',
  'left-rotation': '左旋',
  'right-rotation': '右旋',
  'left-lateral-flexion': '左侧屈',
  'right-lateral-flexion': '右侧屈',
  'ulnar-deviation': '尺偏',
  'radial-deviation': '桡偏',
  'dorsiflexion': '背伸',
  'plantarflexion': '跖屈'
};

const SIDE_NAMES: Record<string, string> = {
  'left': '左',
  'right': '右'
};

export default function MeasurementChart() {
  const { activeMeasurements, isMeasuring } = useMeasurementStore();

  if (activeMeasurements.length === 0) {
    return (
      <div className="h-[350px] flex flex-col items-center justify-center text-center p-8 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
        <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
          <Activity className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-gray-500 font-medium">请添加测量项并开始测量以查看趋势图</p>
      </div>
    );
  }

  // Use the first measurement as the time base
  const primaryMeasurement = activeMeasurements[0];
  const chartData = primaryMeasurement.data.map((point, index) => {
    const merged: any = { timestamp: point.timestamp };
    activeMeasurements.forEach(m => {
      if (m.data[index]) {
        merged[m.id] = m.data[index].angle;
      }
    });
    return merged;
  });
  
  const displayData = chartData.slice(-100);

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-antey-accent animate-pulse" />
            活动度实时趋势
          </h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">Real-time ROM Analysis</p>
        </div>
        <div className="flex flex-wrap gap-2">
           {activeMeasurements.map(m => {
             const standardRange = getStandardRange(m.joint, m.direction);
             return (
               <div key={m.id} className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                 <div className="w-1.5 h-8 rounded-full" style={{ backgroundColor: m.color }} />
                 <div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                     {JOINT_NAMES[m.joint] || m.joint}
                   </div>
                   <div className="flex items-baseline gap-1.5">
                     <span className="text-sm font-black text-slate-900 leading-none">
                       {m.maxAngle === -Infinity ? '0.0' : m.maxAngle.toFixed(1)}°
                     </span>
                     {standardRange && (
                       <span className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">
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
      
      <div className="flex-1 w-full min-h-[250px] relative">
        <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ 
          backgroundImage: 'linear-gradient(#f1f5f9 1px, transparent 1px), linear-gradient(90deg, #f1f5f9 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              {activeMeasurements.map(m => (
                <linearGradient key={`grad-${m.id}`} id={`color-${m.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={m.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={m.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              type="number" 
              domain={['auto', 'auto']} 
              tickFormatter={(val) => val.toFixed(1) + 's'}
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
              tickFormatter={(val) => val + '°'}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                borderRadius: '20px', 
                border: '1px solid #f1f5f9', 
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)',
                padding: '12px',
                backdropFilter: 'blur(10px)'
              }}
              itemStyle={{ fontSize: '11px', fontWeight: 800, padding: '2px 0' }}
              labelStyle={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
              cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 5' }}
              formatter={(value: number, name: string) => {
                  const m = activeMeasurements.find(am => am.id === name);
                  if (m) {
                    const joint = JOINT_NAMES[m.joint] || m.joint;
                    const side = m.side ? (SIDE_NAMES[m.side] || m.side) : '';
                    const dir = DIRECTION_NAMES[m.direction] || m.direction;
                    const sideText = side ? `(${side})` : '';
                    return [`${value.toFixed(1)}°`, `${joint}${sideText} ${dir}`];
                  }
                  return [value.toFixed(1) + '°', name];
              }}
              labelFormatter={(label: number) => `T+ ${label.toFixed(2)}s`}
            />
            
            {activeMeasurements.map(m => (
              <Line 
                key={m.id}
                type="monotone" 
                dataKey={m.id} 
                stroke={m.color} 
                strokeWidth={4} 
                dot={false} 
                activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: m.color }}
                isAnimationActive={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {!isMeasuring && displayData.length === 0 && (
        <div className="absolute inset-x-0 bottom-20 flex items-center justify-center pointer-events-none">
          <span className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-xs font-bold text-gray-400 shadow-sm border border-gray-100">
            等待数据采集...
          </span>
        </div>
      )}
    </div>
  );
}
