import React from 'react';
import { Camera as CameraIcon, RefreshCw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import BaseWebcamView from '@/components/shared/BaseWebcamView';
import { AnalysisOverlay } from '../AnalysisOverlay';
import { BOX } from '../utils';
import type { Results } from '@mediapipe/holistic';

interface PostureCameraViewProps {
  result: any;
  isCameraOn: boolean;
  onCameraToggle: (on: boolean) => void;
  onResults: (results: Results) => void;
  isMirrored: boolean;
  captureStatus: any;
  countdown: number;
  recordingProgress: number;
  isInPosition: boolean;
  showQualityWarning: boolean;
  startScanning: () => void;
  resetAnalysis: () => void;
}

export const PostureCameraView: React.FC<PostureCameraViewProps> = ({
  result,
  isCameraOn,
  onCameraToggle,
  onResults,
  isMirrored,
  captureStatus,
  countdown,
  recordingProgress,
  isInPosition,
  showQualityWarning,
  startScanning,
  resetAnalysis
}) => {
  return (
    <div className="lg:col-span-7 bg-black rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/3] relative group ring-1 ring-white/10">
      {!result ? (
        <BaseWebcamView
          isCameraOn={isCameraOn}
          onCameraToggle={onCameraToggle}
          onResults={onResults}
          isMirrored={isMirrored}
        >
          {isCameraOn && captureStatus !== 'idle' && (
            <div className={cn(
              "absolute border-2 border-dashed rounded-[2rem] transition-all duration-500",
              isInPosition ? "border-green-400 bg-green-400/10 shadow-[0_0_50px_rgba(74,222,128,0.2)]" : "border-white/30",
              captureStatus === 'countdown' ? "border-solid border-blue-400" : ""
            )}
            style={{
              left: `${BOX.xMin * 100}%`,
              top: `${BOX.yMin * 100}%`,
              width: `${(BOX.xMax - BOX.xMin) * 100}%`,
              height: `${(BOX.yMax - BOX.yMin) * 100}%`
            }}>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                <p className="text-[10px] font-bold text-white uppercase tracking-widest">请站在虚线框内</p>
              </div>
            </div>
          )}

          {captureStatus === 'countdown' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-30">
              <div className="text-9xl font-black text-white drop-shadow-2xl animate-ping">
                {countdown}
              </div>
            </div>
          )}

          {captureStatus === 'recording' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-[4px] z-30">
              <div className="relative w-48 h-48 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={552.92}
                    strokeDashoffset={552.92 * (1 - recordingProgress / 100)}
                    className="text-blue-500 transition-all duration-100 ease-linear"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-white">{Math.round(recordingProgress)}%</span>
                  <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest mt-1">采集数据中</span>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-full border border-red-500/50 animate-pulse">
                <div className="h-2 w-2 bg-red-500 rounded-full" />
                <span className="text-xs font-black text-red-400 uppercase tracking-widest">Recording</span>
              </div>
            </div>
          )}

          <AnalysisOverlay captureStatus={captureStatus} analysisProgress={0} />

          {showQualityWarning && (
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300">
              <div className="px-6 py-3 bg-rose-500 text-white rounded-2xl shadow-xl flex items-center gap-3 border border-rose-400">
                <AlertTriangle size={20} />
                <div>
                  <p className="text-sm font-black uppercase tracking-tight">采集质量较低</p>
                  <p className="text-[10px] font-bold text-rose-100 uppercase tracking-widest">请确保身体在框内并保持稳定，请重试</p>
                </div>
              </div>
            </div>
          )}

          {isCameraOn && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
              {captureStatus === 'idle' ? (
                <button
                  onClick={startScanning}
                  disabled={!isCameraOn}
                  className={cn(
                    "px-8 py-3.5 rounded-2xl font-bold transition-all shadow-xl active:scale-95 flex items-center gap-3 cursor-pointer pointer-events-auto",
                    isCameraOn 
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20" 
                      : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  )}
                >
                  <CameraIcon className="h-5 w-5" />
                  开始评估
                </button>
              ) : (
                <div className="px-6 py-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
                  <div className={cn(
                    "h-3 w-3 rounded-full animate-pulse",
                    captureStatus === 'recording' ? "bg-red-500" : 
                    (captureStatus === 'analyzing' ? "bg-blue-500" : 
                    (captureStatus === 'completed' ? "bg-green-500" : 
                    (isInPosition ? "bg-green-500" : "bg-yellow-500")))
                  )} />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {captureStatus === 'scanning' && "正在寻找体态..."}
                    {captureStatus === 'countdown' && `准备开始 (${countdown})`}
                    {captureStatus === 'recording' && "正在录制时序数据"}
                    {captureStatus === 'analyzing' && "正在智能分析"}
                    {captureStatus === 'completed' && "分析完成"}
                    {((captureStatus as string) === 'idle') && isInPosition && "准备就绪"}
                  </span>
                  {(captureStatus === 'scanning' || captureStatus === 'countdown') && (
                    <button 
                      onClick={resetAnalysis}
                      className="ml-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                    >
                      <RefreshCw className="h-4 w-4 text-gray-400" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </BaseWebcamView>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center p-4">
          <img 
            src={result.image} 
            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
            alt="Posture Analysis Result"
          />
          <button 
            onClick={resetAnalysis}
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/10 cursor-pointer"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
};
