import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  CheckCircle2, 
  ChevronRight, 
  Info,
  Layers,
  Sparkles,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PoseLandmark } from '../vision3-utils';
import { AssessmentType } from '../store/usePostureAssessmentStore';
import { VIEW_TEXTS, CAPTURE_STATUS_TEXTS, BUTTON_TEXTS, PANEL_TEXTS, POSITION_TEXTS, DATA_CAPTURE_TEXTS, RECORDING_TEXTS } from '../constants/uiText';
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS, SHADOWS, BACKDROP } from '@/constants/uiStyles';

interface SteppedAssessmentOverlayProps {
  view: 'front' | 'side' | 'back';
  captureStatus: 'idle' | 'scanning' | 'countdown' | 'recording' | 'analyzing' | 'completed' | 'error';
  countdown: number;
  recordingProgress: number;
  isInPosition: boolean;
  steppedResults: Record<string, { timeSeriesLandmarks: PoseLandmark[][]; width: number; height: number; timestamp: number }>;
  assessmentType: AssessmentType;
  onStartCapture: () => void;
  onNextView: (assessmentType?: AssessmentType) => void;
  onRetake: () => void;
  onFinish: (assessmentType?: AssessmentType) => void;
  onReset: () => void;
}

export const SteppedAssessmentOverlay: React.FC<SteppedAssessmentOverlayProps> = ({
  view,
  captureStatus,
  countdown,
  recordingProgress,
  isInPosition,
  steppedResults,
  assessmentType,
  onStartCapture,
  onNextView,
  onRetake,
  onFinish,
  onReset
}) => {
  const capturedCount = Object.keys(steppedResults).length;
  const currentCaptured = steppedResults[view];
  
  const isQuickAssessment = assessmentType === 'quick';
  const requiredViews = isQuickAssessment ? [view] : ['front', 'side', 'back'];
  const currentViewIndex = requiredViews.indexOf(view);
  const isLastView = currentViewIndex === requiredViews.length - 1;

  // 成功提示自动隐藏逻辑：3秒后自动隐藏
  const [showSuccessCard, setShowSuccessCard] = useState(true);
  
  useEffect(() => {
    if (captureStatus === 'completed') {
      setShowSuccessCard(true);
      const timer = setTimeout(() => {
        setShowSuccessCard(false);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setShowSuccessCard(true);
    }
  }, [captureStatus, view]);

  const neutralActionButtonClass = `${SIZES.padding.xl} ${SIZES.radius.lg} ${COLORS.neutral.whiteBg} ${COLORS.neutral.whiteText60} ${COLORS.neutral.whiteHoverBg10} ${COLORS.neutral.whiteHoverText} transition-all font-bold ${SIZES.font.xl}`;
  const viewBadgeStateClass = (isActive: boolean, isCaptured: boolean) => cn(
    `${SIZES.size.md} ${SIZES.radius.md} flex items-center justify-center border ${TRANSITIONS.medium}`,
    isActive
      ? `${COLORS.neutral.white} ${COLORS.neutral.light.text} ${COLORS.neutral.whiteBorderSolid} shadow-lg scale-110`
      : isCaptured
        ? `${COLORS.success.emeraldBg} ${COLORS.success.emeraldText} ${COLORS.success.emeraldBorder}`
        : `${COLORS.neutral.whiteBg} ${COLORS.neutral.whiteText30} ${COLORS.neutral.whiteBorder}`,
  );
  
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center pointer-events-none p-4 xs:p-6 md:p-8 lg:p-12">
      {/* 1. 顶部多视角进度 */}
      <div className={`flex items-center ${SIZES.gap.lg} ${COLORS.neutral.slateBg80} ${SIZES.padding.xl} ${SIZES.radius.pillLg} border ${COLORS.neutral.whiteBorder20} ${SHADOWS.lg} ${ANIMATIONS.slideInTop}`}>
        <div className={`flex items-center ${SIZES.gap.md} pr-6 border-r ${COLORS.neutral.whiteBorder}`}>
          <Layers className={COLORS.success.emeraldText} size={18} />
          <span className={`${SIZES.font.md} font-black uppercase tracking-[0.2em] ${COLORS.neutral.whiteText}`}>
            {isQuickAssessment ? PANEL_TEXTS.progress.quick : PANEL_TEXTS.progress.standard}
          </span>
        </div>
        
        <div className="flex items-center gap-4 xs:gap-6 md:gap-8">
          {requiredViews.map((v) => {
            const isCaptured = !!steppedResults[v];
            const isActive = view === v;
            return (
              <div key={v} className={`flex items-center ${SIZES.gap.md} group`}>
                <div className={viewBadgeStateClass(isActive, isCaptured)}>
                  {isCaptured ? <CheckCircle2 size={18} /> : <User size={18} />}
                </div>
                <div className="flex flex-col">
                  <span className={cn(
                    `${SIZES.font.sm} font-black uppercase tracking-widest`,
                    isActive ? COLORS.neutral.whiteText : COLORS.neutral.whiteText40
                  )}>{v}</span>
                  <span className={cn(
                    `${SIZES.font.lg} font-bold`,
                    isActive ? COLORS.neutral.whiteText : COLORS.neutral.whiteText60
                  )}>{VIEW_TEXTS[v].label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {/* 2. 状态文字 */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className={`inline-flex items-center ${SIZES.gap.sm} ${SIZES.padding.md} ${SIZES.radius.full} ${COLORS.neutral.whiteBg} border ${COLORS.neutral.whiteBorder} mb-6`}>
            <Info size={14} className={COLORS.success.emeraldText} />
            <span className={`${SIZES.font.lg} ${COLORS.neutral.whiteText80} font-medium`}>{VIEW_TEXTS[view].description}</span>
          </div>
          
          <h2 className={`text-5xl font-light ${COLORS.neutral.whiteText} tracking-tight drop-shadow-2xl`}>
            {captureStatus === 'idle' && `准备拍摄${VIEW_TEXTS[view].label}`}
            {captureStatus === 'scanning' && (!isInPosition ? CAPTURE_STATUS_TEXTS.scanning.notInPosition : CAPTURE_STATUS_TEXTS.scanning.ready)}
            {captureStatus === 'countdown' && (
              <span className="text-7xl font-black tabular-nums animate-pulse">{CAPTURE_STATUS_TEXTS.countdown(countdown)}</span>
            )}
            {captureStatus === 'recording' && CAPTURE_STATUS_TEXTS.recording}
            {captureStatus === 'completed' && CAPTURE_STATUS_TEXTS.completed(VIEW_TEXTS[view].label)}
          </h2>
        </div>

        {/* 3. 实时检测提示 或 拍摄预览 */}
        {captureStatus === 'recording' ? (
          <div className="w-80 space-y-4 animate-in fade-in zoom-in-95 duration-500">
            <div
              className={`h-2 w-full ${COLORS.neutral.whiteBg10} rounded-full overflow-hidden border ${COLORS.neutral.whiteBorder}`}
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(recordingProgress)}
            >
              <div 
                className={`h-full ${COLORS.success.emerald} transition-all duration-100 ease-linear ${COLORS.success.emeraldShadow}`}
                style={{ width: `${recordingProgress}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className={`${SIZES.font.md} font-black ${COLORS.success.emeraldText} uppercase tracking-widest`}>{RECORDING_TEXTS.label}</span>
              <span className={`${SIZES.font.md} font-black ${COLORS.neutral.whiteText60} uppercase tracking-widest`}>{Math.round(recordingProgress)}%</span>
            </div>
          </div>
        ) : captureStatus === 'completed' && currentCaptured && showSuccessCard ? (
          <div className={`relative ${SIZES.size.xl} ${SIZES.radius.pill} overflow-hidden border-4 ${COLORS.success.emerald} ${COLORS.neutral.slateBg50} flex flex-col items-center justify-center ${SIZES.gap.lg} ${SHADOWS.lg} animate-in zoom-in-95 duration-500`}>
            <div className={`p-6 ${COLORS.success.emeraldBg} ${SIZES.radius.full}`}>
              <CheckCircle2 size={48} className={COLORS.success.emeraldText} />
            </div>
            <div className="text-center px-6">
              <p className={`${COLORS.neutral.whiteText} font-black text-xs uppercase tracking-widest mb-2`}>{DATA_CAPTURE_TEXTS.captured}</p>
              <p className={`${COLORS.neutral.whiteText40} ${SIZES.font.md} leading-relaxed`}>
                {DATA_CAPTURE_TEXTS.description}
              </p>
            </div>
          </div>
        ) : captureStatus === 'scanning' && (
          <div className={cn(
            `${SIZES.padding.xl} ${SIZES.radius.xl} ${BACKDROP.lg} border ${TRANSITIONS.medium} flex items-center ${SIZES.gap.lg}`,
            isInPosition 
              ? `${COLORS.success.emeraldBg} ${COLORS.success.emeraldBorder} ${COLORS.success.emeraldText}` 
              : `${COLORS.neutral.whiteBg} ${COLORS.neutral.whiteBorder} ${COLORS.neutral.whiteText60}`
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full",
              isInPosition ? `${COLORS.success.emeraldLight} animate-pulse` : COLORS.neutral.whiteBg20
            )} />
            <span className="text-sm font-bold tracking-tight uppercase">
              {isInPosition ? POSITION_TEXTS.locked : POSITION_TEXTS.scanning}
            </span>
          </div>
        )}
      </div>

      {/* 4. 底部控制栏 */}
      <div className={`w-full max-w-4xl ${COLORS.neutral.whiteBg} ${BACKDROP.lg} ${SIZES.padding.xl} ${SIZES.radius.pillXl} border ${COLORS.neutral.whiteBorder20} flex items-center justify-between pointer-events-auto ${ANIMATIONS.slideInBottom}`}>
        <div className={`flex ${SIZES.gap.lg}`}>
          <button 
            onClick={onReset}
            className={neutralActionButtonClass}
          >
            {BUTTON_TEXTS.backToEntry}
          </button>
        </div>

        <div className={`flex items-center ${SIZES.gap.xxl}`}>
          {captureStatus === 'completed' ? (
            <div className={`flex ${SIZES.gap.lg}`}>
              <button 
                onClick={onRetake}
                className={neutralActionButtonClass}
              >
                {BUTTON_TEXTS.retake}
              </button>
              
              {/* 灵活选择：立即分析 或 下一步 */}
              <div className={`flex ${SIZES.gap.md} ${COLORS.neutral.whiteBg} p-1.5 rounded-[2.2rem] border ${COLORS.neutral.whiteBorder}`}>
                <button 
                  onClick={() => onFinish(assessmentType)}
                  className={`flex items-center ${SIZES.gap.sm} ${COLORS.success.emeraldBg} ${COLORS.success.emeraldHoverBase} ${COLORS.success.emeraldText} ${COLORS.neutral.whiteHoverText} px-6 py-3.5 ${SIZES.radius.xl} font-bold ${SIZES.font.xl} transition-all`}
                >
                  <Sparkles size={18} />
                  <span>{isQuickAssessment ? BUTTON_TEXTS.generateReport : BUTTON_TEXTS.generateReportNow}</span>
                </button>

                {!isQuickAssessment && !isLastView && (
                  <button 
                    onClick={() => onNextView(assessmentType)}
                    className={`flex items-center ${SIZES.gap.sm} ${COLORS.neutral.white} ${COLORS.neutral.light.text} px-8 py-3.5 ${SIZES.radius.xl} font-bold ${SIZES.font.xl} transition-all ${SHADOWS.md} hover:scale-105 active:scale-95`}
                  >
                    <span>{BUTTON_TEXTS.nextStep(VIEW_TEXTS[requiredViews[currentViewIndex + 1]].label)}</span>
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <button 
              onClick={onStartCapture}
              disabled={captureStatus !== 'idle'}
              className={cn(
                `flex items-center ${SIZES.gap.md} ${SIZES.padding.xxl} ${SIZES.radius.pill} font-black ${SIZES.font.xxl} transition-all ${SHADOWS.lg}`,
                captureStatus === 'idle' 
                  ? `${COLORS.neutral.white} ${COLORS.neutral.light.text} hover:scale-105 active:scale-95` 
                  : `${COLORS.neutral.whiteBg} ${COLORS.neutral.whiteText20} cursor-not-allowed`
              )}
            >
              <Camera size={24} />
              <span>{captureStatus === 'idle' ? BUTTON_TEXTS.startAutoCapture : BUTTON_TEXTS.capturing}</span>
            </button>
          )}
        </div>

        <div className="flex flex-col items-end">
          <span className={`${SIZES.font.md} font-black ${COLORS.neutral.whiteText40} uppercase tracking-[0.2em] mb-1`}>Current Progress</span>
            <div className="flex gap-1.5">
              {requiredViews.map((_, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "w-8 h-1.5 rounded-full transition-all duration-500",
                    index < capturedCount ? `${COLORS.success.emeraldLight} shadow-[0_0_10px_rgba(52,211,153,0.5)]` : COLORS.neutral.whiteBg10
                  )} 
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}; 
