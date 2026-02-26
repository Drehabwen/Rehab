import React, { useState, useRef, useEffect } from 'react';
import { Results } from '@mediapipe/holistic';
import { Loader2 } from 'lucide-react';
import { PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { PostureProcessor } from '@/lib/posture-processor';
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
  generateAuxiliaryReport
} from './vision3-utils';

import { Vision3EntryHub, AssessmentMode } from './components/Vision3EntryHub';
import { MetricsSidebar } from './components/MetricsSidebar';
import { Vision3Header } from './components/Vision3Header';
import { Vision3CameraStage } from './components/Vision3CameraStage';
import { Vision3Dashboard } from './components/Vision3Dashboard';
import { MarkdownReport } from '@/components/shared/MarkdownReport';

const mergeMetrics = (analyses: Array<ReturnType<typeof PostureProcessor.process>>): PostureMetrics => {
  const merged: PostureMetrics = {};
  const front = analyses.find(a => a.view === 'front');
  const back = analyses.find(a => a.view === 'back');
  const side = analyses.find(a => a.view === 'side');

  const shoulderAngles: number[] = [];
  if (front?.averages.shoulderAngle !== undefined) shoulderAngles.push(front.averages.shoulderAngle);
  if (back?.averages.shoulderAngle !== undefined) shoulderAngles.push(back.averages.shoulderAngle);
  if (shoulderAngles.length) {
    merged.shoulderAngle = shoulderAngles.reduce((a, b) => a + b, 0) / shoulderAngles.length;
  }

  const hipAngles: number[] = [];
  if (front?.averages.hipAngle !== undefined) hipAngles.push(front.averages.hipAngle);
  if (back?.averages.hipAngle !== undefined) hipAngles.push(back.averages.hipAngle);
  if (hipAngles.length) {
    merged.hipAngle = hipAngles.reduce((a, b) => a + b, 0) / hipAngles.length;
  }

  if (side?.averages.headForward !== undefined) merged.headForward = side.averages.headForward;
  if (front?.averages.headDeviation !== undefined) merged.headDeviation = front.averages.headDeviation;

  return merged;
};

export const Vision3Plugin: React.FC<{
  onNavigate?: (plugin: 'vision3' | 'medvoice' | 'reports' | 'datacenter') => void;
}> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'posture' | 'rom'>('posture');
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [assessmentMode, setAssessmentMode] = useState<AssessmentMode>('stepped');
  const [view, setView] = useState<'front' | 'back' | 'side'>('front');
  const [showHeadAxes, setShowHeadAxes] = useState(true);
  const [axesScale, setAxesScale] = useState(1);
  const [activePanel, setActivePanel] = useState<'dashboard' | 'report'>('dashboard');
  
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
    setStep
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
    timeSeriesData,
    simulateMockCapture
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
    analyzeStepped
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
    activeMeasurements,
    postureReports,
    savePostureReport
  } = useMeasurementStore();

  const [auxiliaryReport, setAuxiliaryReport] = useState<string | null>(null);
  const latestMarkdownReport = markdownReport || auxiliaryReport || postureReports[0]?.markdown || null;

  useVision3AutoSave({
    step,
    wsResult,
    assessmentMode,
    view,
    markdownReport,
    auxiliaryReport,
    timeSeriesData
  });
  useEffect(() => {
    if (wsResult?.metrics && !markdownReport) {
      const auxReport = generateAuxiliaryReport(wsResult.metrics);
      setAuxiliaryReport(auxReport);
    }
  }, [wsResult, markdownReport]);

  useEffect(() => {
    if (assessmentMode !== 'stepped') return;
    if (captureStatus !== 'analyzing') return;
    if (auxiliaryReport) return;
    const frames = Object.values(steppedResults);
    if (!frames.length) return;
    const analyses = Object.entries(steppedResults).map(([v, data]) => {
      const durationMs = Math.max(1, Math.round((data.timeSeriesLandmarks.length / 30) * 1000));
      return PostureProcessor.process(data.timeSeriesLandmarks, v as 'front' | 'side' | 'back', durationMs);
    });
    const mergedMetrics = mergeMetrics(analyses);
    const auxReport = generateAuxiliaryReport(mergedMetrics);
    setAuxiliaryReport(auxReport);
    setStep('completed');
    savePostureReport('stepped', '', auxReport, analyses[0]?.timeSeries);
  }, [assessmentMode, captureStatus, steppedResults, auxiliaryReport, setStep, savePostureReport]);

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
      setAuxiliaryReport(null);
      setActivePanel('report');
    }
  }, [markdownReport]);

  useEffect(() => {
    if (captureStatus === 'analyzing' || auxiliaryReport) {
      setActivePanel('report');
    }
  }, [captureStatus, auxiliaryReport]);

  const handleResults = React.useCallback((results: Results) => {
    onResults(results);
  }, [onResults]);

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
              onResults={handleResults}
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
              simulateMockCapture={simulateMockCapture}
            />

          {/* Right Panel: Assessment & Reports */}
          <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-4">
            {/* Panel Toggle Header */}
            <div className="flex p-1 bg-slate-900/60 rounded-xl border border-slate-800/50 backdrop-blur-sm self-start">
              <button
                onClick={() => setActivePanel('dashboard')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activePanel === 'dashboard' 
                    ? 'bg-blue-500/20 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${activePanel === 'dashboard' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                数据面板
              </button>
              <button
                onClick={() => setActivePanel('report')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activePanel === 'report' 
                    ? 'bg-purple-500/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full ${activePanel === 'report' ? 'bg-purple-400 animate-pulse' : 'bg-slate-600'}`} />
                AI 报告
                {captureStatus === 'analyzing' && <Loader2 className="w-3 h-3 animate-spin" />}
              </button>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              {activePanel === 'report' ? (
                <div className="h-full animate-in fade-in slide-in-from-right-4 duration-500">
                  <MarkdownReport 
                    content={latestMarkdownReport} 
                    loading={captureStatus === 'analyzing' && !latestMarkdownReport} 
                  />
                </div>
              ) : (
                <div className="h-full animate-in fade-in slide-in-from-left-4 duration-500">
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
            </div>
          </div>
        </div>
      )}
      </React.Suspense>
      
      {/* Hidden Report Canvas */}
      <canvas ref={reportCanvasRef} className="hidden" />
    </div>
  );
};

export default Vision3Plugin;
