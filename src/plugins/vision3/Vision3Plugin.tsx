import React, { useState, useRef, useEffect } from 'react';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { useVision3Camera } from './hooks/useVision3Camera';
import { usePostureAnalysis } from './hooks/usePostureAnalysis';
import { useVision3EventHandler } from './hooks/useVision3EventHandler';
import { useVision3AutoSave } from './hooks/useVision3AutoSave';

import { usePostureAssessmentStore, AssessmentScope } from './store/usePostureAssessmentStore';
import {
  getShoulderStatus,
  getHeadStatus,
  getHipStatus,
  getSeverityLabel
} from './vision3-utils';

import { Vision3EntryHub, AssessmentMode } from './components/Vision3EntryHub';
import { MetricsSidebar } from './components/MetricsSidebar';
import { Vision3Header } from './components/Vision3Header';
import { Vision3CameraStage } from './components/Vision3CameraStage';
import { Vision3Dashboard } from './components/Vision3Dashboard';

export const Vision3Plugin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'posture' | 'rom'>('posture');
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('stepped');
  const [view, setView] = useState<'front' | 'back' | 'side'>('front');
  const [showHeadAxes, setShowHeadAxes] = useState(true);
  const [axesScale, setAxesScale] = useState(1);
  
  // Custom Hooks
  const {
    isCameraOn,
    setIsCameraOn,
    isMirrored,
    isFullscreen,
    toggleFullscreen,
    videoContainerRef
  } = useVision3Camera();

  const { 
    step,
    setStep,
    scope,
    setScope
  } = usePostureAssessmentStore();

  const {
    wsResult,
    onResults,
    captureStatus,
    setCaptureStatus,
    countdown,
    recordingProgress,
    isInPosition,
    steppedResults,
    setSteppedResults,
    analyzeStepped,
    headAxes,
    annotations
  } = usePostureAnalysis({
    axesScale,
    activeTab,
    isEntryMode,
    view,
    assessmentMode
  });

  const {
    handleStartCapture,
    handleNextView,
    handleFinishStepped,
    handleResetToEntry,
    handleSelectMode,
    canProceedToNextView
  } = useVision3EventHandler({
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
  });

  useVision3AutoSave({
    step,
    wsResult,
    assessmentMode,
    view
  });

  // Posture States
  const [result, setResult] = useState<{ issues: PostureIssue[]; metrics: PostureMetrics } | null>(null);
  const reportCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // ROM States (from store)
  const { 
    isMeasuring, startMeasurement, stopMeasurement, resetMeasurement, activeMeasurements
  } = useMeasurementStore();

  // Sync WebSocket result to local state
  useEffect(() => {
    if (wsResult) {
      setResult({
        issues: wsResult.issues,
        metrics: wsResult.metrics
      });
    }
  }, [wsResult]);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden relative">
      <MetricsSidebar 
        isVisible={step === 'completed'} 
        metrics={wsResult?.metrics}
        stability={wsResult?.stability}
      />

      <Vision3Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isEntryMode={isEntryMode}
        setIsEntryMode={setIsEntryMode}
        view={view}
        setView={setView}
      />

      {/* Conditional Rendering: Entry Hub vs Active Mode */}
      <React.Suspense fallback={
        <div className="flex-1 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-antey-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }>
        {activeTab === 'posture' && isEntryMode ? (
          <Vision3EntryHub 
            onSelectMode={(mode, v) => {
              setAssessmentMode(mode);
              handleSelectMode(mode, v);
            }}
            selectedScope={scope}
            onSelectScope={setScope}
          />
        ) : (
          <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-8 min-h-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Vision3CameraStage 
              videoContainerRef={videoContainerRef}
              isFullscreen={isFullscreen}
              isCameraOn={isCameraOn}
              isMirrored={isMirrored}
              showHeadAxes={showHeadAxes}
              annotations={annotations}
              headAxes={showHeadAxes ? headAxes : null}
              onResults={onResults}
              activeTab={activeTab}
              assessmentMode={assessmentMode}
              captureStatus={captureStatus}
              step={step}
              countdown={countdown}
              isInPosition={isInPosition}
              recordingProgress={recordingProgress}
              view={view}
              steppedResults={steppedResults}
              setSteppedResults={setSteppedResults}
              setCaptureStatus={setCaptureStatus}
              toggleFullscreen={toggleFullscreen}
              handleStartCapture={handleStartCapture}
              handleNextView={handleNextView}
              handleFinishStepped={handleFinishStepped}
              handleResetToEntry={handleResetToEntry}
              activeMeasurements={activeMeasurements}
              isMeasuring={isMeasuring}
              startMeasurement={startMeasurement}
              stopMeasurement={stopMeasurement}
              resetMeasurement={resetMeasurement}
              setIsCameraOn={setIsCameraOn}
              setView={setView}
              scope={scope}
            />

          <Vision3Dashboard 
            activeTab={activeTab}
            result={result}
            showHeadAxes={showHeadAxes}
            setShowHeadAxes={setShowHeadAxes}
            axesScale={axesScale}
            setAxesScale={setAxesScale}
            getShoulderStatus={getShoulderStatus}
            getHeadStatus={getHeadStatus}
            getHipStatus={getHipStatus}
            getSeverityLabel={getSeverityLabel}
          />
        </div>
      )}
      </React.Suspense>
      
      {/* Hidden Report Canvas */}
      <canvas ref={reportCanvasRef} className="hidden" />
    </div>
  );
};

export default Vision3Plugin;
