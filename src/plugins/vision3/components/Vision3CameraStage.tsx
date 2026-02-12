import React from 'react';
import { Results } from '@mediapipe/holistic';
import { cn } from '../../../lib/utils';
import BaseWebcamView from '../../../components/shared/BaseWebcamView';

interface Vision3CameraStageProps {
  isCameraOn: boolean;
  isMirrored?: boolean;
  onResults?: (results: Results, video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  className?: string;
  children?: React.ReactNode;
}

export const Vision3CameraStage: React.FC<Vision3CameraStageProps> = ({
  isCameraOn,
  isMirrored = true,
  onResults,
  className,
  children
}) => {
  return (
    <div className={cn('relative w-full h-full', className)}>
      <BaseWebcamView
        onResults={onResults}
        isCameraOn={isCameraOn}
        isMirrored={isMirrored}
        className="w-full h-full object-cover opacity-90 transition-opacity duration-1000"
      />
      {children}
    </div>
  );
};
