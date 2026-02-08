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
    <div className="h-[400px] flex flex-col relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">活动度实时趋势</h3>
          <p className="text-sm text-gray-500 mt-1">记录关节活动的角度变化曲线</p>
        </div>
        <div className="flex flex-wrap gap-3">
           {activeMeasurements.map(m => {
             const standardRange = getStandardRange(m.joint, m.direction);
             return (
               <div key={m.id} className="bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                 <div className="flex items-center space-x-2 mb-1">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                   <span className="text-xs font-bold text-gray-900">
                     {JOINT_NAMES[m.joint] || m.joint} {m.side ? `(${SIDE_NAMES[m.side] || m.side})` : ''}
                   </span>
                 </div>
                 <div className="flex items-baseline space-x-2">
                   <span className="text-lg font-black" style={{ color: m.color }}>
                     {m.maxAngle === -Infinity ? '0' : m.maxAngle.toFixed(1)}°
                   </span>
                   {standardRange && (
                     <span className="text-[10px] text-gray-400 font-medium">
                       参考: {standardRange.min}-{standardRange.max}°
                     </span>
                   )}
                 </div>
               </div>
             );
           })}
        </div>
      </div>
      
      <div className="flex-1 w-full min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis 
              dataKey="timestamp" 
              type="number" 
              domain={['auto', 'auto']} 
              tickFormatter={(val) => val.toFixed(1) + 's'}
              tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              domain={[0, 180]} 
              tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => val + '°'}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.98)', 
                borderRadius: '16px', 
                border: '1px solid #f3f4f6', 
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                padding: '12px'
              }}
              itemStyle={{ fontSize: '12px', fontWeight: 600, padding: '2px 0' }}
              labelStyle={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase' }}
              cursor={{ stroke: '#e5e7eb', strokeWidth: 2 }}
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
              labelFormatter={(label: number) => `时间: ${label.toFixed(2)}s`}
            />
            
            {activeMeasurements.map(m => (
                <Line 
                  key={m.id}
                  type="monotone" 
                  dataKey={m.id} 
                  stroke={m.color} 
                  strokeWidth={3} 
                  dot={false} 
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff', fill: m.color }}
                  isAnimationActive={false}
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
