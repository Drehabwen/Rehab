import React, { useState, useRef, useEffect } from 'react';
import { Results } from '@mediapipe/holistic';
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
import { Vision3Dashboard } from './components/Vision3Dashboard';
import { useTimeSeriesCollector } from './hooks/useTimeSeriesCollector';
import { cn } from '@/lib/utils';

export const Vision3Plugin: React.FC<{
  onNavigate?: (plugin: 'vision3' | 'medvoice' | 'reports' | 'datacenter') => void;
}> = ({ onNavigate }) => {
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
    htmlReport,
    timeSeriesData
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

  useVision3AutoSave({
    step,
    wsResult,
    assessmentMode,
    view,
    htmlReport,
    timeSeriesData
  });

  // Posture States
  const [result, setResult] = useState<{ issues: PostureIssue[]; metrics: PostureMetrics } | null>(null);
  const reportCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // ROM States (from store)
  const { 
    isMeasuring, startMeasurement, stopMeasurement, resetMeasurement, activeMeasurements
  } = useMeasurementStore();

  const [isCollectingV2, setIsCollectingV2] = useState(false);
  const {
    progress: collectionProgress,
    collectFrame
  } = useTimeSeriesCollector({
    view,
    isCollecting: isCollectingV2,
    onCollectionComplete: (data) => {
      console.log("🔥 [Exploration V2] Collection Complete!", data);
      analyzeStepped([{
        view: data.view as 'front' | 'side' | 'back',
        timeSeriesLandmarks: data.timeSeriesLandmarks,
        width: data.width,
        height: data.height,
        timestamp: data.timestamp
      }]);

      alert(`采集完成！\n视角: ${data.view}\n帧数: ${data.timeSeriesLandmarks.length}\n已发送至后端分析`);
      setIsCollectingV2(false);
    }
  });

  // Sync WebSocket result to local state
  useEffect(() => {
    if (wsResult) {
      setResult({
        issues: wsResult.issues,
        metrics: wsResult.metrics
      });
    }
  }, [wsResult]);

  // Handle LLM Report Arrival
  useEffect(() => {
    if (htmlReport) {
      // Show confirmation dialog to view report
      if (confirm('✅ AI 体态评估报告已生成！\n是否立即前往报告中心查看详细分析？')) {
        if (onNavigate) {
          onNavigate('reports');
        } else {
          console.log("Report generated:", htmlReport.substring(0, 50) + "...");
        }
      }
    }
  }, [htmlReport, onNavigate]);

  // Wrapper for onResults to handle both standard analysis and collection
  const handleResults = React.useCallback((results: unknown, video: HTMLVideoElement) => {
    const typedResults = results as Results;
    // 1. Standard analysis
    onResults(typedResults);
    
    // 2. Time series collection
    if (isCollectingV2 && typedResults.poseLandmarks) {
        collectFrame(typedResults.poseLandmarks as any, video.videoWidth, video.videoHeight);
    }
  }, [onResults, isCollectingV2, collectFrame]);

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden relative">
      {/* DEBUG BUTTON */}
      <button 
        className="fixed bottom-4 right-4 z-[9999] bg-red-600 text-white px-4 py-2 rounded shadow-lg hover:bg-red-700 font-bold border-2 border-white"
        onClick={() => setIsCollectingV2(!isCollectingV2)}
      >
        {isCollectingV2 ? `Collecting... ${Math.round(collectionProgress * 100)}%` : "Start Collection V2"}
      </button>

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

      <div className="absolute top-4 right-20 z-[9999]">
        <button
          onClick={() => setIsCollectingV2(prev => !prev)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-bold shadow-xl transition-all border border-white/20 backdrop-blur-md",
            isCollectingV2 
              ? "bg-red-500 text-white animate-pulse border-red-400" 
              : "bg-black/60 text-white/80 hover:bg-black/80 hover:text-white"
          )}
        >
          {isCollectingV2 ? `Collecting... ${Math.round(collectionProgress)}%` : "🧪 Start V2 Capture"}
        </button>
      </div>

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
