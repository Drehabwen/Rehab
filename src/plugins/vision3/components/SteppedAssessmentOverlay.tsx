import React from 'react';
import { Camera, CheckCircle2, ChevronRight, RefreshCw, Home, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PoseLandmark } from '../vision3-utils';
import { getViewsForScope, getNextView, getTotalSteps } from '../vision3-scope-config';
import type { AssessmentScope } from '../store/usePostureAssessmentStore';

interface SteppedAssessmentOverlayProps {
  view: 'front' | 'side' | 'back';
  captureStatus: 'idle' | 'scanning' | 'countdown' | 'recording' | 'analyzing' | 'completed' | 'error';
  countdown: number;
  recordingProgress: number;
  isInPosition: boolean;
  steppedResults: Record<string, { timeSeriesLandmarks: PoseLandmark[][]; width: number; height: number; timestamp: number }>;
  onStartCapture: () => void;
  onNextView: () => void;
  onRetake: () => void;
  onFinish: () => void;
  onReset: () => void;
  scope: AssessmentScope;
}

export const SteppedAssessmentOverlay: React.FC<SteppedAssessmentOverlayProps> = ({
  view,
  captureStatus,
  countdown,
  recordingProgress,
  isInPosition,
  steppedResults,
  onStartCapture,
  onNextView,
  onRetake,
  onFinish,
  onReset,
  scope
}) => {
  const views = getViewsForScope(scope);
  const currentViewConfig = views.find(v => v.id === view) || views[0];
  const capturedCount = Object.keys(steppedResults).length;
  const totalSteps = getTotalSteps(scope);
  const currentCaptured = steppedResults[view];
  const canProceed = getNextView(scope, view) !== null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between p-8 pointer-events-none">
      <div className="w-full flex items-center justify-between pointer-events-auto">
        <button 
          onClick={onReset}
          className="p-3 bg-white/10 backdrop-blur-md rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-all"
        >
          <Home size={20} />
        </button>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-6 py-3 rounded-full border border-white/20">
          {views.map((v, index) => (
            <div 
              key={v.id} 
              className={cn(
                "w-3 h-3 rounded-full transition-all duration-300",
                steppedResults[v.id] ? "bg-emerald-400" :
                view === v.id ? "bg-white scale-125" : "bg-white/30"
              )} 
            />
          ))}
        </div>

        <div className="text-white/40 text-sm font-medium">
          {capturedCount}/{totalSteps}
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        {captureStatus === 'completed' && currentCaptured ? (
          <div className="text-center">
            <CheckCircle2 size={64} className="text-emerald-400 mx-auto mb-4" />
            <h2 className="text-3xl font-light text-white">已完成</h2>
            <p className="text-white/60 mt-2">{currentViewConfig.label} 拍摄成功</p>
          </div>
        ) : captureStatus === 'recording' ? (
          <div className="text-center">
            <div className="w-24 h-24 mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-white/20 rounded-full" />
              <div 
                className="absolute inset-0 border-4 border-emerald-400 rounded-full transition-all duration-100"
                style={{ 
                  clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin(recordingProgress / 100 * 2 * Math.PI)}% ${50 - 50 * Math.cos(recordingProgress / 100 * 2 * Math.PI)}%, 50% 50%)` 
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">{Math.round(recordingProgress)}%</span>
              </div>
            </div>
            <h2 className="text-2xl font-light text-white">录制中</h2>
            <p className="text-white/60 mt-2">请保持姿势稳定</p>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-4xl font-light text-white mb-2">{currentViewConfig.label}</h2>
            <p className="text-white/60 mb-4">{currentViewConfig.hint}</p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/80 text-sm">
              {currentViewConfig.description}
            </div>
          </div>
        )}
      </div>

      <div className="w-full flex flex-col items-center gap-4 pointer-events-auto">
        {captureStatus === 'completed' ? (
          <div className="flex gap-4">
            <button 
              onClick={onRetake}
              className="px-6 py-3 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white rounded-xl transition-all flex items-center gap-2"
            >
              <RefreshCw size={18} />
              <span>重拍</span>
            </button>

            {canProceed ? (
              <button 
                onClick={onNextView}
                className="px-8 py-3 bg-white text-slate-900 rounded-xl font-medium hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <span>下一视角</span>
                <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                onClick={onFinish}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium hover:scale-105 active:scale-95 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/30"
              >
                <Sparkles size={18} />
                <span>生成报告</span>
              </button>
            )}
          </div>
        ) : captureStatus === 'recording' ? (
          <div className="px-8 py-3 bg-white/10 text-white/60 rounded-xl cursor-not-allowed">
            请稍候...
          </div>
        ) : (
          <button 
            onClick={onStartCapture}
            className="px-10 py-4 bg-white text-slate-900 rounded-2xl font-semibold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-3"
          >
            <Camera size={24} />
            <span>开始拍摄</span>
          </button>
        )}
      </div>
    </div>
  );
}; 
