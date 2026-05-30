import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Results } from '@/lib/mediapipe-utils';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { useVision3Camera } from './hooks/useVision3Camera';
import { usePostureAnalysis } from './hooks/usePostureAnalysis';
import { useVision3EventHandler } from './hooks/useVision3EventHandler';
import { useVision3AutoSave } from './hooks/useVision3AutoSave';
import { usePostureAssessmentStore } from './store/usePostureAssessmentStore';
import {
  getShoulderStatus,
  getHeadStatus,
  getHipStatus,
  getSeverityLabel,
} from './vision3-utils';
import { Vision3EntryHub, AssessmentMode } from './components/Vision3EntryHub';
import { MetricsSidebar } from './components/MetricsSidebar';
import { Vision3Header } from './components/Vision3Header';
import { Vision3CameraStage } from './components/Vision3CameraStage';
import { Vision3AnalysisPanel } from './components/Vision3AnalysisPanel';
import { Vision3Workspace } from './components/Vision3Workspace';
import { AdamsWorkspace } from './components/AdamsWorkspace';
import Vision3ErrorBoundary from '@/components/shared/Vision3ErrorBoundary';

type WorkspaceFocusTarget =
  | 'workspace-summary'
  | 'report-basic'
  | 'report-deep'
  | 'data-overview'
  | 'data-metrics'
  | 'data-issues'
  | 'data-head';

export const Vision3Plugin: React.FC = () => {
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('stepped');
  const [view, setView] = useState<'front' | 'back' | 'side'>('front');
  const [showHeadAxes, setShowHeadAxes] = useState(true);
  const [axesScale, setAxesScale] = useState(1);
  const [activePanel, setActivePanel] = useState<'dashboard' | 'report'>('dashboard');
  const [focusTarget, setFocusTarget] = useState<WorkspaceFocusTarget>('workspace-summary');

  const {
    isCameraOn,
    setIsCameraOn,
    isMirrored,
    isFullscreen,
    toggleFullscreen,
    videoContainerRef,
  } = useVision3Camera();

  const {
    step,
    setStep,
    assessmentType,
    setAssessmentType,
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
    auxiliaryDiagnosis,
    timeSeriesData,
    streamingReport,
    isStreamingReport,
    simulateMockCapture,
  } = usePostureAnalysis({
    axesScale,
    view,
    assessmentMode,
    assessmentType,
  });

  const {
    handleStartCapture,
    handleNextView,
    handleFinishStepped,
    handleResetToEntry,
    handleSelectMode,
  } = useVision3EventHandler({
    setCaptureStatus,
    setView,
    setStep,
    setIsEntryMode,
    setSteppedResults,
    setIsCameraOn,
    view,
    steppedResults,
    analyzeStepped,
    setAssessmentType,
  });

  const reportCanvasRef = useRef<HTMLCanvasElement>(null);

  const {
    isMeasuring,
    startMeasurement,
    stopMeasurement,
    resetMeasurement,
    activeMeasurements,
  } = useMeasurementStore();

  const { currentAssessment } = useAssessmentStore();

  const postureData = currentAssessment?.data?.posture;
  const hasReportPayload = useCallback((posture?: typeof postureData | null) => (
    Boolean(posture?.markdownReport || posture?.auxiliaryDiagnosis || posture?.metrics || (posture?.issues?.length ?? 0) > 0)
  ), []);
  const normalizeReportContent = useCallback((value?: string | null) => (value ?? '').trim(), []);
  const shouldUseCachedReport = step === 'completed' || captureStatus === 'completed';

  const currentReport = postureData && hasReportPayload(postureData) ? postureData : null;
  const reportSource = currentReport ? 'current-assessment' : 'none';

  useEffect(() => {
    console.log('[Vision3Plugin] currentAssessment posture changed:', {
      hasReport: !!currentReport,
      view: currentReport?.view,
      hasMarkdown: !!currentReport?.markdownReport,
      hasAuxiliary: !!currentReport?.auxiliaryDiagnosis,
    });
    console.log('[Vision3Plugin] current view:', view);
  }, [currentReport, view]);

  const cachedDisplayResult = shouldUseCachedReport && currentReport?.metrics
    ? {
        metrics: currentReport.metrics,
        issues: currentReport.issues || [],
        timestamp: currentAssessment?.createdAt || Date.now(),
      }
    : null;

  // Once an assessment is completed, prefer the persisted snapshot so the data panel
  // no longer flickers with any residual live websocket updates.
  const displayResult = cachedDisplayResult ?? wsResult;

  const liveBasicReport = normalizeReportContent(auxiliaryDiagnosis);
  const cachedBasicReport = normalizeReportContent(currentReport?.auxiliaryDiagnosis);
  const liveExpandedReport = normalizeReportContent(markdownReport);
  const cachedExpandedReport = normalizeReportContent(currentReport?.markdownReport);
  const hasLiveExpandedReport = Boolean(liveExpandedReport && liveExpandedReport !== liveBasicReport);
  const hasLiveBasicReport = Boolean(liveBasicReport);
  const displayMarkdownReport = (() => {
    if (hasLiveExpandedReport) {
      return markdownReport;
    }

    if (shouldUseCachedReport && cachedExpandedReport && cachedExpandedReport !== cachedBasicReport) {
      return currentReport?.markdownReport || null;
    }

    return null;
  })();
  const displayAuxiliaryDiagnosis = shouldUseCachedReport
    ? currentReport?.auxiliaryDiagnosis || auxiliaryDiagnosis || null
    : auxiliaryDiagnosis || null;
  const completedMetricCount = displayResult
    ? Object.values(displayResult.metrics).filter((value) => typeof value === 'number' && Number.isFinite(value)).length
    : 0;
  const completedIssueCount = displayResult?.issues.length ?? 0;
  const currentViewLabel = view === 'front' ? '正面' : view === 'side' ? '侧面' : '背面';
  const isCompletedView = captureStatus === 'completed';

  useVision3AutoSave({
    step,
    wsResult,
    assessmentMode,
    view,
    markdownReport,
    auxiliaryDiagnosis,
    timeSeriesData,
  });

  useEffect(() => {
    if (captureStatus === 'analyzing' && document.fullscreenElement) {
      console.log('[Vision3Plugin] Recording complete, exiting fullscreen...');
      document.exitFullscreen();
    }
  }, [captureStatus]);

  const handleNavigateWorkspace = useCallback((panel: 'dashboard' | 'report', target: WorkspaceFocusTarget) => {
    setActivePanel(panel);
    setFocusTarget(target);
  }, []);

  useEffect(() => {
    if (hasLiveExpandedReport || hasLiveBasicReport) {
      console.log('Report received, switching to report panel');
      setActivePanel('report');
      setFocusTarget('report-basic');
      setCaptureStatus('completed');
    }
  }, [hasLiveExpandedReport, hasLiveBasicReport, setCaptureStatus]);

  useEffect(() => {
    if (captureStatus === 'completed') {
      console.log('[Vision3Plugin] Analysis completed, switching to report panel');
      setActivePanel('report');
      setFocusTarget((current) => (current === 'workspace-summary' ? 'report-basic' : current));
    }
  }, [captureStatus]);

  const handleResults = React.useCallback((results: Results) => {
    onResults(results);
  }, [onResults]);

  const cameraStage = (
    <Vision3CameraStage
      videoContainerRef={videoContainerRef}
      isFullscreen={isFullscreen}
      isCameraOn={isCameraOn}
      isMirrored={isMirrored}
      showHeadAxes={showHeadAxes}
      annotations={annotations}
      headAxes={showHeadAxes ? headAxes : null}
      onResults={handleResults}
      activeTab="posture"
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
      compact={isCompletedView}
    />
  );

  const analysisPanel = (
    <Vision3AnalysisPanel
      activePanel={activePanel}
      setActivePanel={setActivePanel}
      captureStatus={captureStatus}
      markdownReport={displayMarkdownReport}
      streamingReport={streamingReport}
      isStreamingReport={isStreamingReport}
      auxiliaryDiagnosis={displayAuxiliaryDiagnosis}
      activeTab="posture"
      result={displayResult}
      showHeadAxes={showHeadAxes}
      setShowHeadAxes={setShowHeadAxes}
      axesScale={axesScale}
      setAxesScale={setAxesScale}
      getShoulderStatus={getShoulderStatus}
      getHeadStatus={getHeadStatus}
      getHipStatus={getHipStatus}
      getSeverityLabel={getSeverityLabel}
      assessmentType={assessmentType}
      focusTarget={focusTarget}
      onNavigate={handleNavigateWorkspace}
    />
  );

  return (
    <Vision3ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('[Vision3Plugin] Error caught:', error, errorInfo);
      }}
    >
      <div className="rehab-page">
        <div className="rehab-page-inner relative flex h-full min-h-0 flex-col gap-4 overflow-hidden">
          <MetricsSidebar
            isVisible={step === 'completed' && activePanel === 'dashboard'}
            metrics={displayResult?.metrics}
            stability={wsResult?.stability}
          />

          <Vision3Header
            isEntryMode={isEntryMode}
            setIsEntryMode={setIsEntryMode}
            view={view}
            setView={setView}
          />

          <React.Suspense
            fallback={(
              <div className="flex flex-1 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-antey-primary border-t-transparent" />
              </div>
            )}
          >
            {isEntryMode ? (
              <Vision3EntryHub
                onSelectMode={(mode, nextView, nextAssessmentType) => {
                  setAssessmentMode(mode);
                  handleSelectMode(mode, nextView, nextAssessmentType);
                }}
              />
            ) : assessmentType === 'adams' ? (
              <AdamsWorkspace onBack={handleResetToEntry} />
            ) : isCompletedView ? (
              <Vision3Workspace
                currentViewLabel={currentViewLabel}
                assessmentType={assessmentType}
                assessmentMode={assessmentMode}
                completedIssueCount={completedIssueCount}
                completedMetricCount={completedMetricCount}
                displayAuxiliaryDiagnosis={displayAuxiliaryDiagnosis}
                displayMarkdownReport={displayMarkdownReport}
                activePanel={activePanel}
                handleNavigateWorkspace={handleNavigateWorkspace}
                handleResetToEntry={handleResetToEntry}
                cameraStage={cameraStage}
                analysisPanel={analysisPanel}
              />
            ) : (
              <div className="flex-1 min-h-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 grid grid-cols-12 grid-rows-6 gap-4 md:gap-6 lg:gap-8">
                <div className="col-span-12 row-span-6 transition-all duration-500 lg:col-span-8">
                  {cameraStage}
                </div>

                <div className="col-span-12 row-span-6 overflow-hidden transition-all duration-500 lg:col-span-4">
                  {analysisPanel}
                </div>
              </div>
            )}
          </React.Suspense>

          <canvas ref={reportCanvasRef} className="hidden" />
        </div>
      </div>
    </Vision3ErrorBoundary>
  );
};

export default Vision3Plugin;
