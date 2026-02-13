import React, { useEffect, useState } from 'react';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';
import { globalMonitor } from '../services/GlobalMonitor';

export const AssessmentOverlay: React.FC = () => {
  const { 
    step, 
    countdown, 
    stabilityProgress, 
    captureProgress,
    result 
  } = usePostureAssessmentStore();

  const [showFlash, setShowFlash] = useState(false);

  // 采样开始时的白闪特效
  useEffect(() => {
    if (step === 'capturing_upper' || step === 'capturing_lower') {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  if (step === 'idle' && !result) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex flex-col items-center justify-center">
      {/* 1. 白闪特效层 */}
      {showFlash && (
        <div className="absolute inset-0 bg-white opacity-40 animate-out fade-out duration-300" />
      )}

      {/* 2. 动态取景框 (ROI Guide) */}
      {(step === 'prep_upper' || step === 'prep_lower') && (
        <div className={`
          w-64 h-80 border-4 border-dashed rounded-2xl transition-all duration-300
          ${stabilityProgress > 0 ? 'border-yellow-400 scale-105' : 'border-white/40'}
          ${stabilityProgress >= 100 ? 'border-green-500 border-solid bg-green-500/10' : ''}
          ${step === 'prep_upper' ? 'translate-y-[-20%]' : 'translate-y-[20%]'}
        `}>
          {/* 稳定性进度条 */}
          <div className="absolute bottom-[-40px] left-0 right-0 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-100"
              style={{ width: `${stabilityProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 3. 采样中：圆形进度条 */}
      {(step === 'capturing_upper' || step === 'capturing_lower') && (
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64" cy="64" r="58"
              stroke="white" strokeWidth="8" fill="transparent"
              className="opacity-20"
            />
            <circle
              cx="64" cy="64" r="58"
              stroke="#22c55e" strokeWidth="8" fill="transparent"
              strokeDasharray={364}
              strokeDashoffset={364 - (364 * captureProgress) / 100}
              className="transition-all duration-100"
            />
          </svg>
          <span className="absolute text-white font-bold text-xl">REC</span>
        </div>
      )}

      {/* 4. 状态提示文本 */}
      <div className="mt-8 bg-black/60 px-6 py-3 rounded-full backdrop-blur-md border border-white/20">
        <p className="text-white text-lg font-medium">
          {step === 'prep_upper' && '请站在取景框内，保持上半身稳定'}
          {step === 'capturing_upper' && '正在采集上半身数据...'}
          {step === 'prep_lower' && '请后退，将下半身放入取景框并站稳'}
          {step === 'capturing_lower' && '正在采集下半身数据...'}
          {step === 'stitching' && '拼图中...'}
          {step === 'analyzing' && '正在分析体态指标...'}
          {step === 'completed' && '评估完成！'}
        </p>
      </div>

      {/* 5. 结果浮层 (临时展示) */}
      {step === 'completed' && result && (
        <div className="mt-4 bg-green-600/90 px-6 py-4 rounded-xl text-white pointer-events-auto">
          <h3 className="font-bold mb-2">静态评估指标：</h3>
          <ul className="text-sm space-y-1">
            <li>高低肩角度: {result.metrics.shoulderIncline.toFixed(2)}°</li>
            <li>骨盆倾斜度: {result.metrics.pelvicIncline.toFixed(2)}°</li>
            <li>膝间距比例: {result.metrics.kneeDistanceRatio.toFixed(2)}</li>
          </ul>
          <button 
            onClick={() => usePostureAssessmentStore.getState().reset()}
            className="mt-4 w-full bg-white text-green-700 py-2 rounded-lg font-bold hover:bg-green-50"
          >
            重新评估
          </button>
        </div>
      )}
    </div>
  );
};
