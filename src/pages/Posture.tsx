import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';

import { usePostureWS, type PostureIssue, type PostureMetrics, type Landmark } from '@/hooks/usePostureWS';
import { AnalysisOverlay } from './posture/AnalysisOverlay';
import { PostureResultPanel } from './posture/PostureResultPanel';
import { PosturePDFTemplate } from './posture/PosturePDFTemplate';
import { usePostureCapture } from './posture/hooks/usePostureCapture';
import { useResultCanvas } from './posture/hooks/useResultCanvas';
import { PostureCameraView } from './posture/components/PostureCameraView';
import { PostureEmptyState } from './posture/components/PostureEmptyState';

type PostureResult = { issues: PostureIssue[]; metrics: PostureMetrics; image: string };

export default function Posture() {
  const navigate = useNavigate();
  const viewOptions = [
    { id: 'front', label: '正视图' },
    { id: 'side', label: '侧视图' },
    { id: 'back', label: '背视图' }
  ] as const;
  const [view, setView] = useState<'front' | 'back' | 'side'>('front');
  const [isCameraOn, setIsCameraOn] = useState(() => {
    const saved = localStorage.getItem('vision3_camera_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('vision3_camera_enabled', String(isCameraOn));
  }, [isCameraOn]);

  const [result, setResult] = useState<PostureResult | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);

  const { result: wsResult, htmlReport, analyze, analyzeBatch } = usePostureWS();

  const {
    captureStatus,
    setCaptureStatus,
    countdown,
    recordingProgress,
    isInPosition,
    showQualityWarning,
    onResults,
    startScanning,
    resetAnalysis: resetCapture,
    handleCapture
  } = usePostureCapture({
    view,
    analyze,
    analyzeBatch
  });

  const { reportCanvasRef, drawResultCanvas } = useResultCanvas({
    view,
    setResult
  });

  const resetAnalysis = () => {
    setResult(null);
    setLandmarks(null);
    setCapturedImage(null);
    resetCapture();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (captureStatus === 'analyzing') {
      setAnalysisProgress(0);
      interval = setInterval(() => {
        setAnalysisProgress(prev => {
          if (prev >= 92) return prev + 0.1;
          if (prev >= 70) return prev + 0.5;
          return prev + 1.5;
        });
      }, 100);
    } else if (captureStatus === 'completed') {
      setAnalysisProgress(100);
    } else {
      setAnalysisProgress(0);
    }
    return () => clearInterval(interval);
  }, [captureStatus]);

  useEffect(() => {
    if (wsResult && capturedImage && landmarks) {
      setResult({
        issues: wsResult.issues,
        metrics: wsResult.metrics,
        image: capturedImage
      });

      setTimeout(() => drawResultCanvas(
        capturedImage, 
        landmarks, 
        wsResult.issues, 
        wsResult.annotations || []
      ), 100);

      if (captureStatus !== 'analyzing' && captureStatus !== 'completed') {
        setCaptureStatus('idle');
      }
    }
  }, [wsResult, capturedImage, landmarks, drawResultCanvas, captureStatus, setCaptureStatus]);

  useEffect(() => {
    if (htmlReport) {
      setCaptureStatus('completed');

      setTimeout(() => {
        if (confirm('体态分析报告已生成，是否前往报告中心查看？')) {
          navigate('/report');
        }
        setCaptureStatus('idle');
      }, 1500);
    }
  }, [htmlReport, navigate, setCaptureStatus]);

  const exportPDF = async () => {
    if (!result) return;
    const element = document.getElementById('posture-report');
    if (!element) return;
    element.style.display = 'block';
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`posture-analysis-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('导出PDF失败，请重试');
    } finally {
      element.style.display = 'none';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-slate-900 mb-2">体态评估</h2>
          <p className="text-slate-500 text-lg">AI 智能分析您的站姿与脊柱健康</p>
        </div>

        <div className="flex p-1 bg-white/50 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm self-start md:self-auto">
          {viewOptions.map((v) => (
            <button
              key={v.id}
              onClick={() => { setView(v.id); resetAnalysis(); }}
              className={cn(
                "px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
                view === v.id 
                  ? "bg-white text-blue-600 shadow-md scale-[1.02]" 
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <PostureCameraView
          result={result}
          isCameraOn={isCameraOn}
          onCameraToggle={setIsCameraOn}
          onResults={onResults}
          isMirrored={view === 'front'}
          captureStatus={captureStatus}
          countdown={countdown}
          recordingProgress={recordingProgress}
          isInPosition={isInPosition}
          showQualityWarning={showQualityWarning}
          startScanning={startScanning}
          resetAnalysis={resetAnalysis}
        />

        <div className="lg:col-span-5 flex flex-col gap-6">
          {!result ? (
            <PostureEmptyState />
          ) : (
            <PostureResultPanel 
              result={result} 
              exportPDF={exportPDF} 
              resetAnalysis={resetAnalysis} 
            />
          )}
        </div>
      </div>

      <PosturePDFTemplate result={result} />
      
      <canvas ref={reportCanvasRef} className="hidden" />
    </div>
  );
}
