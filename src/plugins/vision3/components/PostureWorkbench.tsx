import React from 'react';
import { cn } from '@/lib/utils';

interface PostureWorkbenchProps {
  captureStatus: 'idle' | 'scanning' | 'countdown' | 'analyzing';
  countdown: number;
  isInPosition: boolean;
}

export const PostureWorkbench: React.FC<PostureWorkbenchProps> = ({ 
  captureStatus, 
  countdown, 
  isInPosition 
}) => {
  return (
    <>
      {/* Analysis Overlays - Always show when in countdown */}
      {captureStatus === 'countdown' && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl">
          <div className="relative">
            <span className="text-[12rem] font-black text-white leading-none tracking-tighter animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
              {countdown}
            </span>
            <div className="absolute -inset-16 border border-white/10 rounded-full animate-spin-slow" />
            <div className="absolute -inset-24 border border-white/5 rounded-full animate-reverse-spin-slow" />
          </div>
        </div>
      )}

      {captureStatus === 'scanning' && (
        <div className="absolute inset-0 pointer-events-none">
          <div className={cn(
            "absolute inset-10 border-[1px] transition-all duration-700 rounded-[2.5rem]",
            isInPosition ? "border-antey-primary/60 bg-antey-primary/5" : "border-rose-500/40 bg-rose-500/5"
          )} />
        </div>
      )}
    </>
  );
};
