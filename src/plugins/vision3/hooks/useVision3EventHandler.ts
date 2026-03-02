import { useCallback } from 'react';
import { SteppedResults, CaptureStatus } from '../components/Vision3CameraStage';
import { SteppedFrame } from '@/hooks/usePostureWS';
import { AssessmentType } from '../store/usePostureAssessmentStore';

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
  analyzeStepped: (frames: SteppedFrame[], assessmentType?: AssessmentType) => void;
  setAssessmentType: (type: AssessmentType) => void;
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
  setAssessmentType
}: UseVision3EventHandlerProps) => {
  const handleStartCapture = useCallback(() => {
    setCaptureStatus('scanning');
  }, [setCaptureStatus]);

  const handleNextView = useCallback((assessmentType?: AssessmentType) => {
    const viewOrder: ('front' | 'side' | 'back')[] = ['front', 'side', 'back'];
    const currentIndex = viewOrder.indexOf(view);
    
    if (assessmentType === 'quick') {
      handleFinishStepped(assessmentType);
    } else if (currentIndex < viewOrder.length - 1) {
      setView(viewOrder[currentIndex + 1]);
      setCaptureStatus('idle');
    }
  }, [view, setView, setCaptureStatus, steppedResults, analyzeStepped, setCaptureStatus, setStep, isFullscreen, toggleFullscreen]);

  const handleFinishStepped = useCallback(async (assessmentType?: AssessmentType) => {
    console.log('[handleFinishStepped] ===== START =====');
    console.log('[handleFinishStepped] assessmentType:', assessmentType);
    console.log('[handleFinishStepped] steppedResults:', Object.keys(steppedResults));
    
    const frames = Object.entries(steppedResults).map(([v, data]) => ({
      view: v as 'front' | 'side' | 'back',
      timeSeriesLandmarks: data.timeSeriesLandmarks,
      width: data.width,
      height: data.height,
      timestamp: data.timestamp
    }));
    
    console.log('[handleFinishStepped] frames length:', frames.length);
    console.log('[handleFinishStepped] frames detail:', frames.map(f => ({ view: f.view, landmarks: f.timeSeriesLandmarks?.length })));
    
    if (frames.length > 0) {
      console.log('[handleFinishStepped] Starting analysis...');
      
      // 优先退出全屏，确保数据传输在非全屏环境下执行
      if (document.fullscreenElement) {
        console.log('[handleFinishStepped] Exiting fullscreen...');
        await document.exitFullscreen();
        console.log('[handleFinishStepped] Fullscreen exited');
      }
      
      // 开始分析
      setCaptureStatus('analyzing');
      setStep('analyzing');
      
      console.log('[handleFinishStepped] Calling analyzeStepped with', frames.length, 'frames');
      analyzeStepped(frames, assessmentType);
      console.log('[handleFinishStepped] analyzeStepped called');
    } else {
      console.error('[handleFinishStepped] ERROR: No frames to analyze!');
    }
  }, [steppedResults, analyzeStepped, setCaptureStatus, setStep]);

  const handleResetToEntry = useCallback(() => {
    setIsEntryMode(true);
    setSteppedResults({});
    setCaptureStatus('idle');
  }, [setIsEntryMode, setSteppedResults, setCaptureStatus]);

  const handleSelectMode = useCallback((_: 'stepped' | 'realtime', v: 'front' | 'side' | 'back', assessmentType: AssessmentType) => {
    setView(v);
    setIsEntryMode(false);
    setIsCameraOn(true);
    setSteppedResults({});
    setCaptureStatus('idle');
    setAssessmentType(assessmentType);
  }, [setView, setIsEntryMode, setIsCameraOn, setSteppedResults, setCaptureStatus, setAssessmentType]);

  return {
    handleStartCapture,
    handleNextView,
    handleFinishStepped,
    handleResetToEntry,
    handleSelectMode
  };
};
