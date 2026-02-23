import React from 'react';
import { TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THRESHOLDS, SYSTEM_CONFIG } from '../config';
import type { PostureMetrics } from '@/hooks/usePostureWS';

interface MetricsSidebarProps {
  isVisible: boolean;
  metrics?: PostureMetrics;
  stability?: { sd: number };
}

export const MetricsSidebar: React.FC<MetricsSidebarProps> = ({ 
  isVisible, 
  metrics,
  stability 
}) => {
  if (!isVisible || !metrics) return null;

  return (
    <div className="absolute right-6 top-[100px] bottom-6 w-80 z-40 flex flex-col gap-4 pointer-events-none">
      <div className="bg-white/40 backdrop-blur-3xl p-6 rounded-[2.5rem] border border-white/60 shadow-2xl pointer-events-auto animate-in slide-in-from-right-8 duration-1000 ease-out">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-antey-primary/10 flex items-center justify-center border border-antey-primary/20">
            <TrendingUp className="text-antey-primary" size={20} />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">核心生物力学指标</h3>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Core Biomechanics</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-white/40 rounded-2xl border border-white/60 group hover:border-antey-primary/30 transition-all duration-500">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">重心偏移</span>
              <span className={cn(
                "text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter",
                Math.abs(metrics?.swayOffset || 0) < THRESHOLDS.swayOffset.excellent ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                {Math.abs(metrics?.swayOffset || 0) < THRESHOLDS.swayOffset.excellent ? 'Excellent' : 'Offset'}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-light text-slate-900 tracking-tighter">{(metrics?.swayOffset || 0).toFixed(1)}</span>
              <span className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">mm</span>
            </div>
            <div className="mt-4 w-full h-1 bg-slate-200/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-antey-primary transition-all duration-1000" 
                style={{ width: `${Math.min(100, Math.abs(metrics?.swayOffset || 0) * SYSTEM_CONFIG.chartScaling.swayOffset)}%` }}
              />
            </div>
          </div>

          <div className="p-4 bg-white/40 rounded-2xl border border-white/60 group hover:border-antey-primary/30 transition-all duration-500">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">肩部平衡</span>
              <span className={cn(
                "text-[9px] px-2.5 py-1 rounded-full font-black uppercase tracking-tighter",
                Math.abs(metrics?.shoulderAngle || 0) < THRESHOLDS.shoulderAngle.balanced ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
              )}>
                {Math.abs(metrics?.shoulderAngle || 0) < THRESHOLDS.shoulderAngle.balanced ? 'Balanced' : 'Tilted'}
              </span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-light text-slate-900 tracking-tighter">{(metrics?.shoulderAngle || 0).toFixed(1)}</span>
              <span className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">°</span>
            </div>
          </div>

          <div className="p-4 bg-white/40 rounded-2xl border border-white/60 group hover:border-antey-primary/30 transition-all duration-500">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">骨盆对称性</span>
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-light text-slate-900 tracking-tighter">{(metrics?.hipAngle || 0).toFixed(1)}</span>
              <span className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">°</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200/60">
          <div className="flex items-center gap-3 text-antey-primary mb-3">
            <Zap size={14} />
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">Clinical Stability</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
            {stability && stability.sd < THRESHOLDS.stability.clinical 
              ? "数据采集质量极高，已达到临床级分析标准。" 
              : "建议保持更稳定的站姿，以获得更精准的关节受力分析。"}
          </p>
        </div>
      </div>
    </div>
  );
};
