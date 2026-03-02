import React, { useState, useRef, useEffect } from 'react';
import { Results } from '@/lib/mediapipe-utils';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { useVision3Camera } from './hooks/useVision3Camera';
import { usePostureAnalysis } from './hooks/usePostureAnalysis';
import { useVision3EventHandler } from './hooks/useVision3EventHandler';
import { useVision3AutoSave } from './hooks/useVision3AutoSave';

import { usePostureAssessmentStore } from './store/usePostureAssessmentStore';
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
import { Vision3AnalysisPanel } from './components/Vision3AnalysisPanel';
import Vision3ErrorBoundary from '@/components/shared/Vision3ErrorBoundary';
import AssessmentFallbackHandler from '@/utils/assessmentFallback';
export const Vision3Plugin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'posture' | 'rom'>('posture');
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('stepped');
  const [view, setView] = useState<'front' | 'back' | 'side'>('front');
  const [showHeadAxes, setShowHeadAxes] = useState(true);
  const [axesScale, setAxesScale] = useState(1);
  const [activePanel, setActivePanel] = useState<'dashboard' | 'report'>('dashboard');
  const [reportType, setReportType] = useState<'auxiliary' | 'deep'>('auxiliary');
  
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
    assessmentType,
    setAssessmentType
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
    annotations,
    markdownReport,
    auxiliaryReport,
    timeSeriesData,
    simulateMockCapture
  } = usePostureAnalysis({
    axesScale,
    view,
    assessmentMode,
    assessmentType
  });

  const {
    handleStartCapture,
    handleNextView,
    handleFinishStepped,
    handleResetToEntry,
    handleSelectMode
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
    setAssessmentType
  });

  // Posture States
  const [result, setResult] = useState<{ issues: PostureIssue[]; metrics: PostureMetrics } | null>(null);
  const reportCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // ROM States (from store)
  const { 
    isMeasuring,
    startMeasurement,
    stopMeasurement,
    resetMeasurement,
    activeMeasurements
  } = useMeasurementStore();

  useVision3AutoSave({
    step,
    wsResult,
    assessmentMode,
    view,
    markdownReport,
    auxiliaryReport,
    timeSeriesData
  });

  // Auto exit fullscreen when recording completes
  useEffect(() => {
    if (captureStatus === 'analyzing' && document.fullscreenElement) {
      console.log('[Vision3Plugin] Recording complete, exiting fullscreen...');
      document.exitFullscreen();
    }
  }, [captureStatus]);

  // Sync WebSocket result to local state
  useEffect(() => {
    if (wsResult) {
      setResult({
        issues: wsResult.issues,
        metrics: wsResult.metrics
      });
    }
  }, [wsResult]);

  useEffect(() => {
    if (markdownReport) {
      console.log("Deep AI report received, switching to report panel");
      setReportType('deep');
      setActivePanel('report');
    }
  }, [markdownReport]);

  useEffect(() => {
    if (auxiliaryReport && !markdownReport) {
      setReportType('auxiliary');
      setActivePanel('report');
    }
  }, [auxiliaryReport, markdownReport]);

  // 当分析完成时，自动切换到报告面板
  useEffect(() => {
    if (captureStatus === 'completed') {
      console.log('[Vision3Plugin] Analysis completed, switching to report panel');
      // 如果有深度报告，优先显示深度报告
      if (markdownReport) {
        setReportType('deep');
        setActivePanel('report');
      } else if (auxiliaryReport) {
        setReportType('auxiliary');
        setActivePanel('report');
      }
    }
  }, [captureStatus, markdownReport, auxiliaryReport]);

  const handleResults = React.useCallback((results: Results) => {
    onResults(results);
  }, [onResults]);

  return (
    <Vision3ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[Vision3Plugin] Error caught:', error, errorInfo);
      }}
    >
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
              onSelectMode={(mode, v, assessmentType) => {
                setAssessmentMode(mode);
                handleSelectMode(mode, v, assessmentType);
              }} 
            />
          ) : (
            <div className={`flex-1 min-h-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ${
              captureStatus === 'completed'
                ? 'flex flex-col lg:flex-row gap-4 lg:gap-6 p-2'
                : 'grid grid-cols-12 grid-rows-6 gap-4 md:gap-6 lg:gap-8'
            }`}>
              {/* 拍摄前：视频占 8 列，拍摄后：视频占 4 列 */}
              <div className={`transition-all duration-500 ${
                captureStatus === 'completed'
                  ? 'w-full lg:w-4/12 h-[35vh] lg:h-auto flex-shrink-0'
                  : 'col-span-12 lg:col-span-8 row-span-6'
              }`}>
                <Vision3CameraStage 
                  videoContainerRef={videoContainerRef}
                  isFullscreen={isFullscreen}
                  isCameraOn={isCameraOn}
                  isMirrored={isMirrored}
                  showHeadAxes={showHeadAxes}
                  annotations={annotations}
                  headAxes={showHeadAxes ? headAxes : null}
                  onResults={handleResults}
                  activeTab={activeTab}
                  assessmentMode={assessmentMode}
                  assessmentType={assessmentType}
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
                  simulateMockCapture={simulateMockCapture}
                />
              </div>

              {/* 拍摄前：分析面板占 4 列，拍摄后：分析面板占 8 列 */}
              <div className={`transition-all duration-500 overflow-hidden ${
                captureStatus === 'completed'
                  ? 'w-full lg:w-8/12 flex-1 min-h-0'
                  : 'col-span-12 lg:col-span-4 row-span-6'
              }`}>
                <Vision3AnalysisPanel 
                  activePanel={activePanel}
                  setActivePanel={setActivePanel}
                  reportType={reportType}
                  setReportType={setReportType}
                  captureStatus={captureStatus}
                  markdownReport={markdownReport}
                  auxiliaryReport={auxiliaryReport}
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
                  assessmentType={assessmentType}
                />
              </div>
            </div>
      )}
      </React.Suspense>
      
      {/* Hidden Report Canvas */}
      <canvas ref={reportCanvasRef} className="hidden" />
    </div>
    </Vision3ErrorBoundary>
  );
};

export default Vision3Plugin;
