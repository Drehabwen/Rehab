import { useCallback } from 'react';
import { SteppedResults, CaptureStatus } from '../components/Vision3CameraStage';
import { getNextView } from '../vision3-scope-config';
import type { AssessmentScope } from '../store/usePostureAssessmentStore';

interface UseVision3EventHandlerProps {
  setCaptureStatus: React.Dispatch<React.SetStateAction<CaptureStatus>>;
  setView: (view: 'front' | 'side' | 'back') => void;
  setStep: (step: string) => void;
  setIsEntryMode: (entryMode: boolean) => void;
  setSteppedResults: React.Dispatch<React.SetStateAction<SteppedResults>>;
  setIsCameraOn: (on: boolean) => void;
  toggleFullscreen: () => void;
  isFullscreen: boolean;
  view: 'front' | 'side' | 'back';
  steppedResults: SteppedResults;
  analyzeStepped: (frames: any[]) => void;
  scope: AssessmentScope;
}

export const useVision3EventHandler = ({
  setCaptureStatus,
  setView,
  setStep,
  setIsEntryMode,
  setSteppedResults,
  setIsCameraOn,
  toggleFullscreen,
  isFullscreen,
  view,
  steppedResults,
  analyzeStepped,
  scope
}: UseVision3EventHandlerProps) => {
  const handleStartCapture = useCallback(() => {
    setCaptureStatus('recording');
  }, [setCaptureStatus]);

  const handleNextView = useCallback(() => {
    const nextView = getNextView(scope, view);
    if (nextView) {
      setView(nextView);
      setCaptureStatus('idle');
    }
  }, [scope, view, setView, setCaptureStatus]);

  const canProceedToNextView = useCallback((): boolean => {
    const nextView = getNextView(scope, view);
    return nextView !== null;
  }, [scope, view]);

  const handleFinishStepped = useCallback(() => {
    const frames = Object.entries(steppedResults).map(([v, data]) => ({
      view: v as 'front' | 'side' | 'back',
      timeSeriesLandmarks: data.timeSeriesLandmarks,
      width: data.width,
      height: data.height,
      timestamp: data.timestamp
    }));
    
    if (frames.length > 0) {
      if (isFullscreen) {
        toggleFullscreen();
      }
      
      setCaptureStatus('analyzing');
      setStep('analyzing');
      analyzeStepped(frames);
    }
  }, [steppedResults, analyzeStepped, setCaptureStatus, setStep, isFullscreen, toggleFullscreen]);

  const handleResetToEntry = useCallback(() => {
    setIsEntryMode(true);
    setSteppedResults({});
    setCaptureStatus('idle');
  }, [setIsEntryMode, setSteppedResults, setCaptureStatus]);

  const handleSelectMode = useCallback((mode: 'stepped' | 'realtime', v: 'front' | 'side' | 'back') => {
    setView(v);
    setIsEntryMode(false);
    setIsCameraOn(true);
    setSteppedResults({});
    setCaptureStatus('idle');
  }, [setView, setIsEntryMode, setIsCameraOn, setSteppedResults, setCaptureStatus]);

  return {
    handleStartCapture,
    handleNextView,
    handleFinishStepped,
    handleResetToEntry,
    handleSelectMode,
    canProceedToNextView
  };
};
