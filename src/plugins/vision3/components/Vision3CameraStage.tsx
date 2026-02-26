import React from 'react';
import { Maximize2, Video, VideoOff, Scan, RotateCcw, ArrowLeft, Square, Play, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import BaseWebcamView from '@/components/shared/BaseWebcamView';
import { PostureWorkbench } from './PostureWorkbench';
import { ROMWorkbench } from './ROMWorkbench';
import { AssessmentOverlay } from './AssessmentOverlay';
import { SteppedAssessmentOverlay } from './SteppedAssessmentOverlay';
import { VisualAnnotation, HeadAxes, PoseLandmark } from '../vision3-utils';
import { ActiveMeasurement } from '@/store/useMeasurementStore';

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
  handleNextView: () => void;
  handleFinishStepped: () => void;
  handleResetToEntry: () => void;
  activeMeasurements: ActiveMeasurement[];
  isMeasuring: boolean;
  startMeasurement: () => void;
  stopMeasurement: () => void;
  resetMeasurement: () => void;
  setIsCameraOn: (enabled: boolean) => void;
  setView: (view: ViewType) => void;
  simulateMockCapture?: () => void;
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
  simulateMockCapture
}) => {
  return (
    <div ref={videoContainerRef} className={cn(
      "bento-card glow-border !rounded-[3.5rem] group bg-black overflow-hidden relative transition-all duration-700",
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
        className="w-full h-full object-cover transition-opacity duration-1000"
      />

      {/* Phase 4: 评估交互层 */}
      {(captureStatus === 'analyzing' || step === 'completed' || assessmentMode === 'realtime') ? (
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
        className="absolute top-6 right-6 p-3 bg-black/40 backdrop-blur-md text-white/60 hover:text-white hover:bg-black/60 rounded-2xl border border-white/10 transition-all z-40 opacity-0 group-hover:opacity-100"
      >
        {isFullscreen ? <Maximize2 size={20} className="rotate-180" /> : <Maximize2 size={20} />}
      </button>
      
      {/* AI Scanning Effect */}
      {isCameraOn && (
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
      <div className="absolute top-10 left-10 flex items-center gap-4">
        <div className="px-6 py-3 bg-black/60 rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl">
          <div className="relative">
            <div className={cn("w-2 h-2 rounded-full", isCameraOn ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "bg-rose-500")} />
            {isCameraOn && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />}
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] leading-none mb-1">
              Engine Status
            </span>
            <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] leading-none">
              {activeTab === 'posture' ? 'Posture AI Core' : 'Joint ROM Engine'} v3.2
            </span>
          </div>
          {simulateMockCapture && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                simulateMockCapture();
              }}
              className="ml-2 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/40 text-amber-500 text-[10px] font-black rounded-lg border border-amber-500/30 transition-all uppercase"
              title="模拟测试数据"
            >
              Mock
            </button>
          )}
        </div>
      </div>

      {/* Floating Controls: Workbench Components */}
      {activeTab === 'posture' ? (
        step === 'idle' && (
          <PostureWorkbench 
            captureStatus={assessmentMode === 'realtime' ? captureStatus : 'idle'} 
            countdown={countdown} 
            isInPosition={isInPosition} 
          />
        )
      ) : (
        <ROMWorkbench 
          activeMeasurements={activeMeasurements} 
          isMeasuring={isMeasuring} 
        />
      )}

      {/* Floating Controls: Ultra Premium Glassmorphism (Only in Real-time mode) */}
      {assessmentMode === 'realtime' && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 p-6 bg-slate-900/90 rounded-[3rem] border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-8 group-hover:translate-y-0 shadow-[0_40px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={cn(
                "w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center gap-1.5 transition-all duration-500 relative group/btn",
                isCameraOn ? "bg-white/10 text-white hover:bg-white/20 hover:scale-110" : "bg-rose-500/80 text-white shadow-2xl shadow-rose-500/40 hover:scale-110"
              )}
            >
              {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
              <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">{isCameraOn ? '关闭' : '开启'}</span>
              {isCameraOn && <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
            </button>
          </div>
          
          <div className="w-px h-14 bg-white/10" />
          
          {activeTab === 'posture' ? (
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setCaptureStatus('countdown')}
                disabled={captureStatus !== 'idle'}
                className={cn(
                  "px-10 h-16 rounded-[1.5rem] flex items-center gap-4 font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
                  captureStatus === 'idle' 
                    ? "bg-antey-primary text-white hover:bg-antey-primary/80 hover:scale-105 hover:shadow-antey-primary/40" 
                    : "bg-white/10 text-white/40 cursor-not-allowed"
                )}
              >
                <Scan size={24} className={cn(captureStatus === 'scanning' && "animate-spin")} />
                {captureStatus === 'idle' ? '开始全维度扫描' : captureStatus === 'countdown' ? '准备拍照...' : '分析中...'}
              </button>
              
              <button 
                onClick={() => setView(view === 'front' ? 'side' : view === 'side' ? 'back' : 'front')}
                className="w-16 h-16 rounded-[1.5rem] bg-white/10 text-white flex flex-col items-center justify-center gap-1.5 hover:bg-white/20 transition-all hover:scale-110"
              >
                <RotateCcw size={20} className="rotate-180" />
                <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">切换视图</span>
              </button>

              <button 
                onClick={handleResetToEntry}
                className="w-16 h-16 rounded-[1.5rem] bg-white/5 text-white/40 flex flex-col items-center justify-center gap-1.5 hover:bg-white/10 hover:text-white transition-all hover:scale-110"
              >
                <ArrowLeft size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter">返回</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <button 
                onClick={() => isMeasuring ? stopMeasurement() : startMeasurement()}
                className={cn(
                  "px-10 h-16 rounded-[1.5rem] flex items-center gap-4 font-black text-sm uppercase tracking-[0.2em] transition-all duration-500 shadow-2xl",
                  isMeasuring 
                    ? "bg-rose-500 text-white hover:bg-rose-500/80 hover:scale-105" 
                    : "bg-antey-accent text-white hover:bg-antey-accent/80 hover:scale-105 shadow-antey-accent/40"
                )}
              >
                {isMeasuring ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                {isMeasuring ? '结束测量任务' : '启动关节采集'}
              </button>

              <button 
                onClick={() => resetMeasurement()}
                className="w-16 h-16 rounded-[1.5rem] bg-white/10 text-white flex flex-col items-center justify-center gap-1.5 hover:bg-white/20 transition-all hover:scale-110"
              >
                <RefreshCw size={20} />
                <span className="text-[8px] font-black uppercase tracking-tighter opacity-60">重置</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
