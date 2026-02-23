import React from 'react';
import { Activity } from 'lucide-react';
import { jointNameMap } from '../vision3-utils';
import { ActiveMeasurement, MeasurementDataPoint } from '@/store/useMeasurementStore';

interface ROMWorkbenchProps {
  activeMeasurements: ActiveMeasurement[];
  isMeasuring: boolean;
}

export const ROMWorkbench: React.FC<ROMWorkbenchProps> = ({ 
  activeMeasurements, 
  isMeasuring 
}) => {
  return (
    <div className="absolute top-10 right-10 flex flex-col gap-4 z-20">
      {activeMeasurements.map((m, idx) => (
        <div 
          key={m.id} 
          className="bg-black/40 backdrop-blur-3xl rounded-3xl border border-white/10 p-6 flex flex-col gap-4 shadow-2xl min-w-[240px] animate-in slide-in-from-right duration-500" 
          style={{ animationDelay: `${idx * 100}ms` }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: m.color }}>
              <Activity size={24} />
            </div>
            <div className="flex-1">
              <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1.5">正在测量</div>
              <div className="text-sm font-black text-white uppercase tracking-widest leading-none">
                {jointNameMap[m.joint] || m.joint} {m.side ? (m.side === 'left' ? '(左)' : '(右)') : ''}
              </div>
            </div>
          </div>

          <div className="flex items-baseline justify-between gap-4 mt-2">
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">实时角度</span>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-black text-white tracking-tighter tabular-nums">
                  {m.currentAngle.toFixed(1)}
                </span>
                <span className="text-sm font-black text-white/40 uppercase">deg</span>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">峰值</span>
              <span className="text-xl font-black text-antey-accent">
                {m.maxAngle === -Infinity ? '0.0' : m.maxAngle.toFixed(1)}°
              </span>
            </div>
          </div>

          {/* Mini Sparkline indicator */}
          {isMeasuring && m.data.length > 1 && (
            <div className="h-10 flex items-end gap-1 px-1">
              {m.data.slice(-20).map((p: MeasurementDataPoint, i: number) => {
                const height = Math.max(4, (p.angle / 180) * 40);
                return (
                  <div 
                    key={i} 
                    className="flex-1 rounded-full opacity-60 transition-all duration-300"
                    style={{ 
                      height: `${height}px`, 
                      backgroundColor: m.color,
                      opacity: 0.3 + (i / 20) * 0.7
                    }} 
                  />
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
