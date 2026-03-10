import React from 'react';
import { Maximize2, Video, VideoOff, Scan, RotateCcw, ArrowLeft, Square, Play, RefreshCw, CheckCircle2, Layers, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import BaseWebcamView from '@/components/shared/BaseWebcamView';
import { PostureWorkbench } from './PostureWorkbench';
import { ROMWorkbench } from './ROMWorkbench';
import { AssessmentOverlay } from './AssessmentOverlay';
import { SteppedAssessmentOverlay } from './SteppedAssessmentOverlay';
import { VisualAnnotation, HeadAxes, PoseLandmark } from '../vision3-utils';
import { ActiveMeasurement } from '@/store/useMeasurementStore';
import { AssessmentType } from '../store/usePostureAssessmentStore';
import { BUTTON_TEXTS, CAPTURE_STATUS_TEXTS, CAMERA_TEXTS, MEASUREMENT_TEXTS } from '../constants/uiText';
import { COLORS, SIZES, ANIMATIONS, TRANSITIONS, SHADOWS, BACKDROP } from '@/constants/uiStyles';

export type ViewType = 'front' | 'side' | 'back';
export type CaptureStatus = 'idle' | 'scanning' | 'countdown' | 'recording' | 'analyzing' | 'completed' | 'error';
export type StepStatus = 'idle' | 'capturing' | 'analyzing' | 'completed';
export type AssessmentMode = 'stepped' | 'realtime';

export interface SteppedResults {
  [key: string]: {
    timeSeriesLandmarks: PoseLandmark[][];
    width: number;
    height: number;
    timestamp: number;
  };
}

interface Vision3CameraStageProps {
  videoContainerRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  isCameraOn: boolean;
  isMirrored: boolean;
  showHeadAxes: boolean;
  annotations: VisualAnnotation[];
  headAxes: HeadAxes | null;
  onResults?: (results: unknown, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  activeTab: 'posture' | 'rom';
  assessmentMode: AssessmentMode;
  assessmentType: AssessmentType;
  captureStatus: CaptureStatus;
  step: string;
  countdown: number;
  isInPosition: boolean;
  recordingProgress: number;
  view: ViewType;
  steppedResults: SteppedResults;
  setSteppedResults: React.Dispatch<React.SetStateAction<SteppedResults>>;
  setCaptureStatus: React.Dispatch<React.SetStateAction<CaptureStatus>>;
  toggleFullscreen: () => void;
  handleStartCapture: () => void;
  handleNextView: (assessmentType?: AssessmentType) => void;
  handleFinishStepped: (assessmentType?: AssessmentType) => void;
  handleResetToEntry: () => void;
  activeMeasurements: ActiveMeasurement[];
  isMeasuring: boolean;
  startMeasurement: () => void;
  stopMeasurement: () => void;
  resetMeasurement: () => void;
  setIsCameraOn: (enabled: boolean) => void;
  setView: (view: ViewType) => void;
  simulateMockCapture?: () => void;
  compact?: boolean;
}

export const Vision3CameraStage: React.FC<Vision3CameraStageProps> = ({
  videoContainerRef,
  isFullscreen,
  isCameraOn,
  isMirrored,
  showHeadAxes,
  annotations,
  headAxes,
  onResults,
  activeTab,
  assessmentMode,
  assessmentType,
  captureStatus,
  step,
  countdown,
  isInPosition,
  recordingProgress,
  view,
  steppedResults,
  setSteppedResults,
  setCaptureStatus,
  toggleFullscreen,
  handleStartCapture,
  handleNextView,
  handleFinishStepped,
  handleResetToEntry,
  activeMeasurements,
  isMeasuring,
  startMeasurement,
  stopMeasurement,
  resetMeasurement,
  setIsCameraOn,
  setView,
  simulateMockCapture,
  compact = false
}) => {
  const viewLabelMap: Record<ViewType, string> = {
    front: '\u6b63\u9762',
    side: '\u4fa7\u9762',
    back: '\u80cc\u9762',
  };
  const iconControlClass = `w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center gap-1.5 transition-all hover:scale-110`;
  const whiteGlassChipClass = `inline-flex items-center rounded-full border ${COLORS.neutral.whiteBorder} ${COLORS.neutral.whiteBg10} px-2.5 py-1 text-[11px] ${COLORS.neutral.whiteText85}`;
  const overlayControlBaseClass = cn(
    'border',
    COLORS.neutral.whiteBorder,
    COLORS.neutral.whiteText,
    COLORS.neutral.whiteBg10,
    COLORS.neutral.whiteHoverBg20,
  );
  const primaryIconControlClass = `${iconControlClass} ${overlayControlBaseClass}`;
  const fullscreenButtonClass = cn(
    `absolute ${BACKDROP.sm} ${COLORS.neutral.whiteText60} ${COLORS.neutral.whiteHoverText} ${SIZES.radius.lg} border ${TRANSITIONS.default} z-40 opacity-0 group-hover:opacity-100`,
    COLORS.neutral.blackBg40,
    COLORS.neutral.blackHoverBg60,
    COLORS.neutral.whiteBorder,
  );
  const statusPanelClass = cn(
    `${SIZES.radius.lg} border flex items-center ${SIZES.gap.lg} ${SHADOWS.lg}`,
    COLORS.neutral.blackBg60,
    COLORS.neutral.whiteBorder,
  );
  const completedSummaryClass = cn(
    'rounded-[1.75rem] border p-4 shadow-2xl backdrop-blur-xl',
    COLORS.neutral.whiteBorder15,
    COLORS.neutral.blackBg55,
    COLORS.neutral.whiteText,
  );
  const cameraToggleClass = (enabled: boolean) =>
    enabled
      ? `${primaryIconControlClass} hover:scale-110`
      : cn('shadow-2xl shadow-rose-500/40 hover:scale-110', 'bg-rose-500/80', COLORS.neutral.whiteText);
  const posturePrimaryActionClass = (enabled: boolean) =>
    enabled
      ? cn(
          `px-10 h-16 rounded-[1.5rem] flex items-center ${SIZES.gap.lg} font-black text-sm uppercase tracking-[0.2em] ${TRANSITIONS.medium} ${SHADOWS.lg}`,
          'bg-antey-primary hover:bg-antey-primary/80 hover:scale-105 hover:shadow-antey-primary/40',
          COLORS.neutral.whiteText,
        )
      : `${COLORS.neutral.whiteBg10} ${COLORS.neutral.whiteText40} cursor-not-allowed px-10 h-16 rounded-[1.5rem] flex items-center ${SIZES.gap.lg} font-black text-sm uppercase tracking-[0.2em] ${TRANSITIONS.medium} ${SHADOWS.lg}`;
  const measureActionClass = (active: boolean) =>
    cn(
      `px-10 h-16 rounded-[1.5rem] flex items-center ${SIZES.gap.lg} font-black text-sm uppercase tracking-[0.2em] ${TRANSITIONS.medium} ${SHADOWS.lg}`,
      active
        ? `bg-rose-500 ${COLORS.neutral.whiteText} hover:bg-rose-500/80 hover:scale-105`
        : `bg-antey-accent ${COLORS.neutral.whiteText} hover:bg-antey-accent/80 hover:scale-105 shadow-antey-accent/40`,
    );

  return (
    <div ref={videoContainerRef} className={cn(
      "bento-card glow-border group bg-black overflow-hidden relative transition-all duration-700",
      compact ? "!rounded-[2rem] min-h-[260px] md:min-h-[320px]" : "!rounded-[3.5rem] min-h-[300px] xs:min-h-[400px] md:min-h-[500px]",
      isFullscreen ? "fixed inset-0 z-50 !rounded-none" : "col-span-12 lg:col-span-8 row-span-4 lg:row-span-6"
    )}>
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
        backgroundImage: 'radial-gradient(circle, #0d948a 1px, transparent 1px)', 
        backgroundSize: '40px 40px' 
      }} />
      
      <BaseWebcamView 
        onResults={onResults} 
        isCameraOn={isCameraOn}
        isMirrored={isMirrored}
        showSkeleton={isCameraOn}
        annotations={annotations}
        headAxes={showHeadAxes ? headAxes : null}
        className={cn(
          'w-full h-full object-cover',
          compact ? 'transition-none' : 'transition-opacity duration-700'
        )}
      />

      {/* Phase 4: 评估交互层 */}
      {(captureStatus === 'analyzing' || assessmentMode === 'realtime') ? (
        <AssessmentOverlay />
      ) : (
        <div className="absolute inset-0 z-40 pointer-events-none">
          <SteppedAssessmentOverlay 
            view={view}
            captureStatus={captureStatus}
            countdown={countdown}
            recordingProgress={recordingProgress}
            isInPosition={isInPosition}
            steppedResults={steppedResults}
            assessmentType={assessmentType}
            onStartCapture={handleStartCapture}
            onNextView={handleNextView}
            onRetake={() => {
              const newResults = { ...steppedResults };
              delete newResults[view];
              setSteppedResults(newResults);
              setCaptureStatus('idle');
            }}
            onFinish={handleFinishStepped}
            onReset={handleResetToEntry}
          />
        </div>
      )}

      {/* Fullscreen Toggle Button */}
      <button 
        onClick={toggleFullscreen}
        className={cn(
          fullscreenButtonClass,
          compact ? 'top-4 right-4 p-2.5' : 'top-6 right-6 p-3'
        )}
      >
        {isFullscreen ? <Maximize2 size={20} className="rotate-180" /> : <Maximize2 size={20} />}
      </button>
      
      {/* AI Scanning Effect */}
      {isCameraOn && !compact && captureStatus !== 'completed' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-antey-primary to-transparent opacity-80 animate-scan shadow-[0_0_20px_rgba(13,148,136,0.8)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(13,148,136,0.1)_0%,transparent_70%)] animate-pulse-subtle" />
          
          {/* Corner Accents */}
          <div className="absolute top-10 left-10 w-12 h-12 border-t-2 border-l-2 border-antey-primary/40 rounded-tl-2xl" />
          <div className="absolute top-10 right-10 w-12 h-12 border-t-2 border-r-2 border-antey-primary/40 rounded-tr-2xl" />
          <div className="absolute bottom-10 left-10 w-12 h-12 border-b-2 border-l-2 border-antey-primary/40 rounded-bl-2xl" />
          <div className="absolute bottom-10 right-10 w-12 h-12 border-b-2 border-r-2 border-antey-primary/40 rounded-br-2xl" />
        </div>
      )}
      
      {/* Bento Overlay: Status Indicator */}
      <div className={cn(`absolute flex items-center ${SIZES.gap.lg}`, compact ? 'top-4 left-4' : 'top-10 left-10')}>
        <div className={cn(
          statusPanelClass,
          compact ? 'px-3 py-2' : SIZES.padding.lg
        )}>
          <div className="relative">
            <div className={cn(`${SIZES.size.sm} ${SIZES.radius.full}`, isCameraOn ? `${COLORS.success.emeraldLight} shadow-[0_0_12px_rgba(52,211,153,0.8)]` : "bg-rose-500")} />
            {isCameraOn && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />}
          </div>
          <div className="flex flex-col">
            <span className={`${compact ? 'text-[8px]' : SIZES.font.sm} font-black ${COLORS.neutral.whiteText40} uppercase tracking-[0.3em] leading-none mb-1`}>
              Engine Status
            </span>
            <span className={`${compact ? 'text-[10px]' : SIZES.font.lg} font-black ${COLORS.neutral.whiteText} uppercase tracking-[0.2em] leading-none`}>
              {activeTab === 'posture' ? (compact ? 'Posture Core' : 'Posture AI Core') : 'Joint ROM Engine'} v3.2
            </span>
          </div>
          {simulateMockCapture && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                simulateMockCapture();
              }}
              className="ml-2 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 text-[10px] font-black rounded-lg border border-amber-500/30 transition-all uppercase"
              title={CAMERA_TEXTS.mockTest}
            >
              Mock
            </button>
          )}
        </div>
      </div>

      {/* Floating Controls: Workbench Components */}
      {activeTab === 'posture' ? (
        step === 'idle' && !compact && (
          <PostureWorkbench 
            captureStatus={assessmentMode === 'realtime' ? captureStatus : 'idle'} 
            countdown={countdown} 
            isInPosition={isInPosition} 
          />
        )
      ) : (
        !compact && <ROMWorkbench 
          activeMeasurements={activeMeasurements} 
          isMeasuring={isMeasuring} 
        />
      )}

      {captureStatus === 'completed' ? (
        <div className={cn(
          'absolute left-4 right-4 bottom-4 z-30',
          compact ? '' : 'md:left-6 md:right-6 md:bottom-6'
        )}>
          <div className={completedSummaryClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  <CheckCircle2 size={12} />
                  {'\u5df2\u5b8c\u6210'}
                </div>
                <h3 className="mt-3 text-lg font-semibold">{'\u62cd\u6444\u4e0e\u5206\u6790\u5df2\u7ed3\u675f'}</h3>
                <p className={`mt-1 text-sm ${COLORS.neutral.whiteText70}`}>{'\u5de6\u4fa7\u4fdd\u7559\u5f53\u524d\u89c6\u56fe\u9884\u89c8\uff0c\u53f3\u4fa7\u53ef\u7ee7\u7eed\u9605\u8bfb\u62a5\u544a\u3002'}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <span className={`${whiteGlassChipClass} gap-1.5`}>
                  {assessmentType === 'quick' ? <Zap size={12} /> : <Layers size={12} />}
                  {assessmentType === 'quick' ? '\u5feb\u901f\u8bc4\u4f30' : '\u6807\u51c6\u8bc4\u4f30'}
                </span>
                <span className={whiteGlassChipClass}>
                  {viewLabelMap[view]}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Floating Controls: Ultra Premium Glassmorphism (Only in Real-time mode) */}
      {assessmentMode === 'realtime' && (
        <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center ${SIZES.gap.xxl} ${SIZES.padding.lg} ${COLORS.neutral.slateBg80} ${SIZES.radius.pillXl} border ${COLORS.neutral.whiteBorder20} opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-8 group-hover:translate-y-0 shadow-[0_40px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 z-30`}>
          <div className={`flex items-center ${SIZES.gap.lg}`}>
            <button 
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={cn(
                `w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center gap-1.5 ${TRANSITIONS.medium} relative group/btn`,
                cameraToggleClass(isCameraOn)
              )}
            >
              {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
              <span className={`${SIZES.font.xs} font-black uppercase tracking-tighter opacity-60`}>{isCameraOn ? CAMERA_TEXTS.close : CAMERA_TEXTS.open}</span>
              {isCameraOn && <span className={`absolute top-2 right-2 ${SIZES.size.sm} ${COLORS.success.emeraldLight} ${SIZES.radius.full} animate-pulse`} />}
            </button>
          </div>
          
          <div className={`w-px h-14 ${COLORS.neutral.whiteBg10}`} />
          
          {activeTab === 'posture' ? (
            <div className={`flex items-center ${SIZES.gap.xl}`}>
              <button 
                onClick={() => setCaptureStatus('countdown')}
                disabled={captureStatus !== 'idle'}
                className={posturePrimaryActionClass(captureStatus === 'idle')}
              >
                <Scan size={24} className={cn(captureStatus === 'scanning' && "animate-spin")} />
                {captureStatus === 'idle' ? BUTTON_TEXTS.startScan : captureStatus === 'countdown' ? BUTTON_TEXTS.preparing : CAPTURE_STATUS_TEXTS.analyzing}
              </button>
              
              <button 
                onClick={() => setView(view === 'front' ? 'side' : view === 'side' ? 'back' : 'front')}
                className={primaryIconControlClass}
              >
                <RotateCcw size={20} className="rotate-180" />
                <span className={`${SIZES.font.xs} font-black uppercase tracking-tighter opacity-60`}>{MEASUREMENT_TEXTS.switchView}</span>
              </button>

              <button 
                onClick={handleResetToEntry}
                className={`${iconControlClass} ${COLORS.neutral.whiteBg} ${COLORS.neutral.whiteText40} ${COLORS.neutral.whiteHoverBg10} ${COLORS.neutral.whiteHoverText}`}
              >
                <ArrowLeft size={20} />
                <span className={`${SIZES.font.xs} font-black uppercase tracking-tighter`}>{MEASUREMENT_TEXTS.back}</span>
              </button>
            </div>
          ) : (
            <div className={`flex items-center ${SIZES.gap.xl}`}>
              <button 
                onClick={() => isMeasuring ? stopMeasurement() : startMeasurement()}
                className={measureActionClass(isMeasuring)}
              >
                {isMeasuring ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                {isMeasuring ? MEASUREMENT_TEXTS.stop : MEASUREMENT_TEXTS.start}
              </button>

              <button 
                onClick={() => resetMeasurement()}
                className={primaryIconControlClass}
              >
                <RefreshCw size={20} />
                <span className={`${SIZES.font.xs} font-black uppercase tracking-tighter opacity-60`}>{MEASUREMENT_TEXTS.reset}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
