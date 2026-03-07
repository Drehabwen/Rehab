import React from 'react';
import { Maximize2, Video, VideoOff, Play, Square, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import BaseWebcamView from '@/components/shared/BaseWebcamView';
import { ROM_TEXTS } from '../constants/uiText';

interface ROMCameraStageProps {
  videoContainerRef: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  isCameraOn: boolean;
  isMirrored: boolean;
  isMeasuring: boolean;
  activeMeasurements: any[];
  onResults: (results: any, videoElement: HTMLVideoElement, canvasElement: HTMLCanvasElement) => void;
  startROMAssessment: () => void;
  stopROMAssessment: () => void;
  resetROMAssessment: () => void;
  setIsCameraOn: (enabled: boolean) => void;
  toggleFullscreen: () => void;
}

export const ROMCameraStage: React.FC<ROMCameraStageProps> = ({
  videoContainerRef,
  isFullscreen,
  isCameraOn,
  isMirrored,
  isMeasuring,
  activeMeasurements,
  onResults,
  startROMAssessment,
  stopROMAssessment,
  resetROMAssessment,
  setIsCameraOn,
  toggleFullscreen,
}) => {
  return (
    <div className="relative w-full h-full" ref={videoContainerRef}>
      {/* 摄像头视图 */}
      <BaseWebcamView
        isCameraOn={isCameraOn}
        isMirrored={isMirrored}
        onResults={onResults}
        className="w-full h-full"
      />
      
      {/* 控制按钮 */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex items-center gap-4 z-10">
        <button
          onClick={() => setIsCameraOn(!isCameraOn)}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center', 'bg-black/60 text-white', 'hover:bg-black/80 transition-all')}
          title={isCameraOn ? '关闭摄像头' : '打开摄像头'}
        >
          {isCameraOn ? <VideoOff size={20} /> : <Video size={20} />}
        </button>
        
        {isMeasuring ? (
          <button
            onClick={stopROMAssessment}
            className={cn('w-16 h-16 rounded-full flex items-center justify-center', 'bg-red-500 text-white shadow-lg', 'hover:bg-red-600 transition-all')}
            title="停止测量"
          >
            <Square size={24} />
          </button>
        ) : (
          <button
            onClick={startROMAssessment}
            className={cn('w-16 h-16 rounded-full flex items-center justify-center', 'bg-green-500 text-white shadow-lg', 'hover:bg-green-600 transition-all')}
            title="开始测量"
          >
            <Play size={24} />
          </button>
        )}
        
        <button
          onClick={resetROMAssessment}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center', 'bg-black/60 text-white', 'hover:bg-black/80 transition-all')}
          title="重置测量"
        >
          <RotateCcw size={20} />
        </button>
        
        <button
          onClick={toggleFullscreen}
          className={cn('w-12 h-12 rounded-full flex items-center justify-center', 'bg-black/60 text-white', 'hover:bg-black/80 transition-all')}
          title={isFullscreen ? '退出全屏' : '进入全屏'}
        >
          <Maximize2 size={20} />
        </button>
      </div>
      
      {/* 提示信息 */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-10">
        <div className={cn('bg-black/60 text-white px-6 py-3 rounded-full', 'backdrop-blur-sm')}>
          {isMeasuring ? ROM_TEXTS.messages.measuring : ROM_TEXTS.messages.start}
        </div>
      </div>
    </div>
  );
};
