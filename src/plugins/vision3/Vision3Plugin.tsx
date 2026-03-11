import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Results } from '@/lib/mediapipe-utils';
import { Activity, AlertTriangle, ChevronDown, FileText, RefreshCw } from 'lucide-react';
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
  getSeverityLabel,
} from './vision3-utils';
import { Vision3EntryHub, AssessmentMode } from './components/Vision3EntryHub';
import { MetricsSidebar } from './components/MetricsSidebar';
import { Vision3Header } from './components/Vision3Header';
import { Vision3CameraStage } from './components/Vision3CameraStage';
import { Vision3AnalysisPanel } from './components/Vision3AnalysisPanel';
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
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false);

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
    toggleFullscreen,
    isFullscreen,
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
    postureReports,
  } = useMeasurementStore();

  const hasReportPayload = useCallback((report?: (typeof postureReports)[number] | null) => (
    Boolean(report?.markdown || report?.auxiliaryDiagnosis || report?.metrics || (report?.issues?.length ?? 0) > 0)
  ), []);
  const normalizeReportContent = useCallback((value?: string | null) => (value ?? '').trim(), []);
  const shouldUseCachedReport = step === 'completed' || captureStatus === 'completed';
  const currentViewReport = postureReports.find((report) => report.view === view && hasReportPayload(report));
  const fallbackReport = postureReports.find((report) => hasReportPayload(report)) ?? postureReports[0] ?? null;
  const currentReport = currentViewReport ?? fallbackReport;
  const reportSource = currentViewReport ? 'current-view' : currentReport ? 'latest-available' : 'none';

  useEffect(() => {
    console.log('[Vision3Plugin] postureReports changed:', {
      count: postureReports.length,
      reports: postureReports.map((report) => ({
        view: report.view,
        date: report.date,
        hasMarkdown: !!report.markdown,
        hasAuxiliary: !!report.auxiliaryDiagnosis,
      })),
    });
    console.log(
      '[Vision3Plugin] currentReport:',
      currentReport
        ? {
            view: currentReport.view,
            source: reportSource,
            hasMarkdown: !!currentReport.markdown,
            markdownLength: currentReport.markdown?.length,
            hasAuxiliary: !!currentReport.auxiliaryDiagnosis,
            auxiliaryDiagnosisLength: currentReport.auxiliaryDiagnosis?.length,
          }
        : 'null',
    );
    console.log('[Vision3Plugin] current view:', view);
  }, [postureReports, currentReport, reportSource, view]);

  const displayResult = wsResult ?? (shouldUseCachedReport && currentReport?.metrics
    ? {
        metrics: currentReport.metrics,
        issues: currentReport.issues || [],
        timestamp: currentReport.date,
      }
    : null);

  const liveBasicReport = normalizeReportContent(auxiliaryDiagnosis);
  const cachedBasicReport = normalizeReportContent(currentReport?.auxiliaryDiagnosis);
  const liveExpandedReport = normalizeReportContent(markdownReport);
  const cachedExpandedReport = normalizeReportContent(currentReport?.markdown);
  const hasLiveExpandedReport = Boolean(liveExpandedReport && liveExpandedReport !== liveBasicReport);
  const hasLiveBasicReport = Boolean(liveBasicReport);
  const displayMarkdownReport = (() => {
    if (hasLiveExpandedReport) {
      return markdownReport;
    }

    if (shouldUseCachedReport && cachedExpandedReport && cachedExpandedReport !== cachedBasicReport) {
      return currentReport?.markdown || null;
    }

    return null;
  })();
  const displayAuxiliaryDiagnosis = auxiliaryDiagnosis || (shouldUseCachedReport ? currentReport?.auxiliaryDiagnosis || null : null);
  const completedMetricCount = displayResult
    ? Object.values(displayResult.metrics).filter((value) => typeof value === 'number' && Number.isFinite(value)).length
    : 0;
  const completedIssueCount = displayResult?.issues.length ?? 0;
  const currentViewLabel = view === 'front' ? '\u6b63\u9762' : view === 'side' ? '\u4fa7\u9762' : '\u80cc\u9762';
  const isCompletedView = captureStatus === 'completed';

  useEffect(() => {
    console.log('[Vision3Plugin] displayMarkdownReport or displayAuxiliaryDiagnosis changed:', {
      hasDisplayMarkdown: !!displayMarkdownReport,
      displayMarkdownLength: displayMarkdownReport?.length,
      hasDisplayAuxiliary: !!displayAuxiliaryDiagnosis,
      displayAuxiliaryLength: displayAuxiliaryDiagnosis?.length,
      source: currentReport?.auxiliaryDiagnosis ? 'currentReport' : auxiliaryDiagnosis ? 'auxiliaryDiagnosis' : 'none',
    });
  }, [displayMarkdownReport, displayAuxiliaryDiagnosis, currentReport?.auxiliaryDiagnosis, auxiliaryDiagnosis]);

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
    console.log('[Vision3Plugin] display report state changed:', {
      markdownReport: displayMarkdownReport ? 'exists' : 'null',
      auxiliaryDiagnosis: displayAuxiliaryDiagnosis ? 'exists' : 'null',
      source: reportSource,
    });
    if (hasLiveExpandedReport || hasLiveBasicReport) {
      console.log('Report received, switching to report panel');
      setActivePanel('report');
      setFocusTarget(hasLiveExpandedReport ? 'report-deep' : 'report-basic');
      setCaptureStatus('completed');
    }
  }, [hasLiveExpandedReport, hasLiveBasicReport, setActivePanel, setCaptureStatus]);

  useEffect(() => {
    console.log('[Vision3Plugin] captureStatus changed:', captureStatus);
    if (captureStatus === 'completed') {
      console.log('[Vision3Plugin] Analysis completed, switching to report panel');
      setActivePanel('report');
      setFocusTarget((current) => (current === 'workspace-summary' ? 'report-basic' : current));
      setIsContextPanelOpen(false);
    }
  }, [captureStatus, setActivePanel]);

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
            ) : (
              <div
                className={`flex-1 min-h-0 overflow-hidden ${
                  isCompletedView ? 'p-1 sm:p-2' : 'animate-in fade-in slide-in-from-bottom-4 duration-700 grid grid-cols-12 grid-rows-6 gap-4 md:gap-6 lg:gap-8'
                }`}
              >
                {isCompletedView ? (
                  <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[2rem] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.06),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-3 shadow-[0_24px_64px_rgba(15,23,42,0.07)] sm:p-4">
                    <div className="rounded-[1.5rem] border border-white/70 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-sm sm:px-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Posture Workspace</p>
                          <h2 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">{'\u4f53\u6001\u8bc4\u4f30\u5de5\u4f5c\u53f0'}</h2>
                          <p className="mt-1 max-w-3xl text-sm text-slate-500">
                            {displayMarkdownReport
                              ? '\u5f53\u524d\u5df2\u8fdb\u5165\u8bc4\u4f30\u7ed3\u679c\u5de5\u4f5c\u53f0\uff0c\u53ef\u76f4\u63a5\u67e5\u770b\u672c\u6b21\u4f53\u6001\u57fa\u7840\u62a5\u544a\u4e0e\u5df2\u540c\u6b65\u7684\u62a5\u544a\u5185\u5bb9\u3002'
                              : displayAuxiliaryDiagnosis
                                ? '\u57fa\u7840\u62a5\u544a\u5df2\u5230\u4f4d\uff0c\u53ef\u76f4\u63a5\u5728\u53f3\u4fa7\u9605\u8bfb\u672c\u6b21\u4f53\u6001\u7ed3\u8bba\uff1b\u7efc\u5408 LLM \u62a5\u544a\u5c06\u5728\u5168\u5c40\u62a5\u544a\u4e2d\u5fc3\u7edf\u4e00\u751f\u6210\u3002'
                                : '\u62cd\u6444\u4e0e\u5206\u6790\u5df2\u7ed3\u675f\uff0c\u53f3\u4fa7\u4f1a\u4f18\u5148\u627f\u63a5\u672c\u6b21\u4f53\u6001\u57fa\u7840\u62a5\u544a\u4e0e\u6570\u636e\u8bc1\u636e\u3002'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                            {currentViewLabel}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
                            {assessmentType === 'quick' ? '\u5feb\u901f\u8bc4\u4f30' : '\u6807\u51c6\u8bc4\u4f30'}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${
                              completedIssueCount > 0
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {completedIssueCount > 0 ? `\u98ce\u9669 ${completedIssueCount}` : '\u672a\u89c1\u663e\u8457\u5f02\u5e38'}
                          </span>
                          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                            {`\u6307\u6807 ${completedMetricCount}`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 xl:hidden"
                            onClick={() => setIsContextPanelOpen((current) => !current)}
                          >
                            <ChevronDown size={14} className={`mr-2 inline-flex transition-transform ${isContextPanelOpen ? 'rotate-180' : ''}`} />
                            {isContextPanelOpen ? '\u6536\u8d77\u62cd\u6444\u6458\u8981' : '\u67e5\u770b\u62cd\u6444\u6458\u8981'}
                          </button>
                          <button
                            type="button"
                            className={`h-9 rounded-xl border px-3 text-sm font-medium transition-colors ${
                              activePanel === 'report'
                                ? 'border-violet-200 bg-violet-50 text-violet-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                            onClick={() => handleNavigateWorkspace('report', displayMarkdownReport ? 'report-deep' : 'report-basic')}
                          >
                            <FileText size={14} className="mr-2 inline-flex" />
                            {`\u8bc4\u4f30\u62a5\u544a`}
                          </button>
                          <button
                            type="button"
                            className={`h-9 rounded-xl border px-3 text-sm font-medium transition-colors ${
                              activePanel === 'dashboard'
                                ? 'border-blue-200 bg-blue-50 text-blue-700 shadow-sm'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                            onClick={() => handleNavigateWorkspace('dashboard', 'data-overview')}
                          >
                            <Activity size={14} className="mr-2 inline-flex" />
                            {`\u6570\u636e\u4e2d\u5fc3`}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex min-h-0 flex-col gap-4 xl:flex-row xl:items-stretch xl:gap-4">
                      <div className={`order-2 w-full flex-shrink-0 flex-col gap-3 xl:order-1 xl:flex xl:w-[min(360px,29%)] xl:min-w-[300px] ${
                        isContextPanelOpen ? 'flex' : 'hidden xl:flex'
                      }`}>
                        {cameraStage}

                        <section className="bento-card space-y-3 border border-slate-200/80 bg-white/94 p-4 shadow-sm">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Session Snapshot</p>
                              <h3 className="mt-1 text-base font-semibold text-slate-900">{'\u672c\u6b21\u8bc4\u4f30\u6458\u8981'}</h3>
                              <p className="mt-1 text-sm text-slate-500">{'\u538b\u7f29\u4fdd\u7559\u672c\u6b21\u89c6\u56fe\u3001\u98ce\u9669\u548c\u6307\u6807\u6458\u8981\uff0c\u51cf\u5c11\u53f3\u4fa7\u9605\u8bfb\u65f6\u7684\u89c6\u89c9\u6253\u6270\u3002'}</p>
                            </div>
                            <button
                              type="button"
                              className="btn-secondary h-9 self-start px-3"
                              onClick={handleResetToEntry}
                            >
                              <RefreshCw size={14} />
                              {'\u91cd\u65b0\u8bc4\u4f30'}
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="rounded-20 border border-slate-200 bg-slate-50 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs text-slate-500">{'\u89c6\u56fe\u4e0e\u6a21\u5f0f'}</p>
                                  <p className="mt-2 text-base font-semibold text-slate-900">
                                    {`${currentViewLabel} · ${assessmentType === 'quick' ? '\u5feb\u901f\u8bc4\u4f30' : '\u6807\u51c6\u8bc4\u4f30'}`}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-500">{assessmentMode === 'stepped' ? '\u5206\u6b65\u62cd\u6444' : '\u5b9e\u65f6\u5206\u6790'}</p>
                                </div>
                                <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
                                  {currentViewLabel}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="rounded-20 border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-slate-500">{'\u98ce\u9669\u9879'}</p>
                                  <AlertTriangle size={14} className={completedIssueCount > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">{completedIssueCount}</p>
                                <p className="mt-1 text-xs text-slate-500">{completedIssueCount > 0 ? '\u5df2\u53ef\u5728\u53f3\u4fa7\u7ed3\u8bba\u533a\u67e5\u770b' : '\u672a\u89c1\u663e\u8457\u5f02\u5e38'}</p>
                              </div>

                              <div className="rounded-20 border border-slate-200 bg-white p-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-slate-500">{'\u53ef\u7528\u6307\u6807'}</p>
                                  <Activity size={14} className="text-blue-600" />
                                </div>
                                <p className="mt-2 text-2xl font-semibold text-slate-900">{completedMetricCount}</p>
                                <p className="mt-1 text-xs text-slate-500">{'\u5df2\u8fdb\u5165\u6570\u636e\u8bc1\u636e\u533a'}</p>
                              </div>
                            </div>

                            <div className="rounded-20 border border-slate-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.82),rgba(255,255,255,1))] p-4">
                              <p className="text-sm font-semibold text-slate-900">{'\u5f53\u524d\u9605\u8bfb\u6307\u5f15'}</p>
                              <p className="mt-1 text-xs leading-6 text-slate-600">
                                {displayAuxiliaryDiagnosis
                                  ? '\u57fa\u7840\u62a5\u544a\u5df2\u5230\u4f4d\uff0c\u53ef\u5728\u53f3\u4fa7\u76f4\u63a5\u9605\u8bfb\u5f53\u524d\u4f53\u6001\u7ed3\u8bba\u3002'
                                  : '\u62a5\u544a\u533a\u6b63\u5728\u627f\u63a5\u672c\u6b21\u4f53\u6001\u7ed3\u679c\uff0c\u6570\u636e\u8bc1\u636e\u53ef\u968f\u65f6\u5bf9\u7167\u67e5\u770b\u3002'}
                              </p>
                            </div>
                          </div>
                        </section>
                      </div>

                      <div className="order-1 min-h-0 w-full overflow-hidden xl:order-2 xl:flex-1">
                        {analysisPanel}
                      </div>
                    </div>
                  </section>
                ) : (
                  <>
                    <div className="col-span-12 row-span-6 transition-all duration-500 lg:col-span-8">
                      {cameraStage}
                    </div>

                    <div className="col-span-12 row-span-6 overflow-hidden transition-all duration-500 lg:col-span-4">
                      {analysisPanel}
                    </div>
                  </>
                )}
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
