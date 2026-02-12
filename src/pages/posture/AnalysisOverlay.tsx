import React from 'react';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnalysisOverlayProps {
  captureStatus: string;
  analysisProgress: number;
}

export const AnalysisOverlay: React.FC<AnalysisOverlayProps> = ({ captureStatus, analysisProgress }) => {
  if (captureStatus !== 'analyzing' && captureStatus !== 'completed') return null;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 backdrop-blur-2xl z-50">
      <div className="flex flex-col md:flex-row items-center gap-12 max-w-2xl w-full px-8">
        {/* Vertical Progress Bar */}
        <div className="relative w-4 h-64 bg-white/10 rounded-full overflow-hidden border border-white/5 shadow-inner">
          <div 
            className={cn(
              "absolute bottom-0 left-0 right-0 w-full transition-all duration-500 ease-out rounded-t-full",
              captureStatus === 'completed' ? "bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]" : "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]"
            )}
            style={{ height: `${analysisProgress}%` }}
          >
            <div className="absolute top-0 left-0 right-0 h-full w-full bg-gradient-to-t from-transparent via-white/20 to-white/40 animate-pulse" />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left">
          {captureStatus === 'analyzing' ? (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 rounded-full border border-blue-500/30">
                <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Processing Data</span>
              </div>
              <h3 className="text-4xl font-black text-white uppercase tracking-tight leading-none">
                智能 AI 分析中
              </h3>
              <p className="text-slate-400 text-sm font-medium leading-relaxed max-w-sm">
                正在解析 20 帧关键点数据，计算重心偏移与骨骼角度。由于报告深度包含医学建议，可能需要 5-10 秒...
              </p>
              <div className="flex items-center gap-4 mt-8">
                <div className="text-3xl font-black text-blue-500 tabular-nums">
                  {Math.round(analysisProgress)}%
                </div>
                <div className="flex-1 h-[1px] bg-gradient-to-r from-blue-500/50 to-transparent" />
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in zoom-in duration-500">
              <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(34,197,94,0.4)] mb-6 mx-auto md:mx-0">
                <CheckCircle className="text-white w-10 h-10" />
              </div>
              <h3 className="text-4xl font-black text-white uppercase tracking-tight leading-none">
                评估已完成
              </h3>
              <p className="text-green-400/80 text-sm font-bold uppercase tracking-widest">
                深度报告已生成并存入档案
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
