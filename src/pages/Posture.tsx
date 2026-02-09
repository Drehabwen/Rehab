import { useState, useRef, useCallback, useEffect } from 'react';
import { Results, POSE_CONNECTIONS } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera as CameraIcon, CheckCircle, AlertTriangle, User, Play, RefreshCw, FileDown, Video, VideoOff } from 'lucide-react';
import { usePostureWS, VisualAnnotation, PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import BaseWebcamView from '@/components/shared/BaseWebcamView';

export default function Posture() {
  const [view, setView] = useState<'front' | 'back' | 'side'>('front');
  const [isCameraOn, setIsCameraOn] = useState(() => {
    const saved = localStorage.getItem('vision3_camera_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    localStorage.setItem('vision3_camera_enabled', String(isCameraOn));
  }, [isCameraOn]);

  const [result, setResult] = useState<{ issues: PostureIssue[]; metrics: PostureMetrics; image: string } | null>(null);
  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const reportCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // WebSocket for posture analysis
  const { result: wsResult, analyze } = usePostureWS();

  // Handle analysis results from WebSocket
  useEffect(() => {
    if (wsResult && capturedImage && landmarks) {
      setResult({
        issues: wsResult.issues,
        metrics: wsResult.metrics,
        image: capturedImage,
        // @ts-ignore
        headPoseAxes: wsResult.metrics.head_axes
      });

      setTimeout(() => drawResultCanvas(
        capturedImage, 
        landmarks, 
        wsResult.issues, 
        wsResult.annotations || [], 
        // @ts-ignore
        wsResult.metrics.head_axes
      ), 100);

      setCaptureStatus('idle');
      setIsInPosition(false);
    }
  }, [wsResult, capturedImage, landmarks, view]);

  // Auto-capture states
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'scanning' | 'countdown'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [isInPosition, setIsInPosition] = useState(false);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // We need to keep track of latest landmarks for snapshot
  const landmarksBufferRef = useRef<any[][]>([]);

  // Define reference box (normalized coordinates 0-1)
  const BOX = {
    xMin: 0.25,
    xMax: 0.75,
    yMin: 0.1,
    yMax: 0.9
  };

  const checkUserPosition = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 33) return false;

    // Check visibility of key points (Nose, Shoulders, Hips, Ankles)
    const keyPointsIndices = [0, 11, 12, 23, 24, 27, 28];
    const visible = keyPointsIndices.every(idx => landmarks[idx].visibility > 0.6);
    if (!visible) return false;

    // Check bounds
    const nose = landmarks[0];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const inX = 
      nose.x > BOX.xMin && nose.x < BOX.xMax &&
      leftShoulder.x > BOX.xMin && rightShoulder.x < BOX.xMax;
      
    const inY = 
      nose.y > BOX.yMin && nose.y < 0.4 && // Head in upper section
      leftAnkle.y > 0.6 && leftAnkle.y < BOX.yMax; // Feet in lower section

    return inX && inY;
  };

  const drawResultCanvas = (
    imageSrc: string, 
    landmarks: any[], 
    issues: PostureIssue[], 
    annotations: VisualAnnotation[] = [],
    headPoseAxes?: any[]
  ) => {
      const img = new Image();
      img.src = imageSrc;
      img.onload = () => {
          const canvas = reportCanvasRef.current;
          if (!canvas) return;

          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          // Draw original image
          ctx.save();
          if (view === 'front') {
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
          }
          ctx.drawImage(img, 0, 0);
          ctx.restore();

          // Draw Skeleton
          drawConnectors(ctx, landmarks, POSE_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
          drawLandmarks(ctx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });

          // Draw Backend Annotations
          annotations.forEach(anno => {
              if (anno.type === 'line' && anno.points.length >= 2) {
                  ctx.beginPath();
                  ctx.strokeStyle = anno.color || '#3b82f6';
                  ctx.lineWidth = anno.lineWidth || 2;
                  
                  if (anno.dash) ctx.setLineDash(anno.dash);
                  else if (anno.dashed) ctx.setLineDash([5, 5]);
                  else ctx.setLineDash([]);
                  
                  ctx.moveTo(anno.points[0].x, anno.points[0].y);
                  ctx.lineTo(anno.points[1].x, anno.points[1].y);
                  ctx.stroke();
                  ctx.setLineDash([]);
                  
                  if (anno.label) {
                      ctx.fillStyle = anno.color || '#3b82f6';
                      ctx.font = 'bold 14px Arial';
                      ctx.fillText(anno.label, anno.points[1].x + 5, anno.points[1].y);
                  }
              } else if (anno.type === 'point' && anno.points.length >= 1) {
                  ctx.fillStyle = anno.color || 'red';
                  ctx.beginPath();
                  ctx.arc(anno.points[0].x, anno.points[0].y, 6, 0, 2 * Math.PI);
                  ctx.fill();
                  
                  if (anno.label) {
                      ctx.fillStyle = anno.color || 'red';
                      ctx.font = 'bold 14px Arial';
                      ctx.fillText(anno.label, anno.points[0].x + 8, anno.points[0].y);
                  }
              }
          });

          // Update result image with annotations
          setResult(prev => prev ? { ...prev, image: canvas.toDataURL() } : null);
      };
  };

  const handleCapture = useCallback((video: HTMLVideoElement) => {
    if (landmarksBufferRef.current.length === 0) return;
    
    // Create screenshot from video
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageSrc = canvas.toDataURL('image/jpeg');
    
    // Average landmarks from buffer for stability
    const buffer = landmarksBufferRef.current;
    if (buffer.length === 0) return;
    
    // Initialize with first frame
    const avgLandmarks = buffer[0].map(lm => ({ ...lm, x: 0, y: 0, z: 0, visibility: 0 }));
    
    // Sum up
    for (const frame of buffer) {
        frame.forEach((lm, idx) => {
            if (avgLandmarks[idx]) {
                avgLandmarks[idx].x += lm.x;
                avgLandmarks[idx].y += lm.y;
                avgLandmarks[idx].z += lm.z;
                avgLandmarks[idx].visibility += lm.visibility;
            }
        });
    }
    
    // Divide
    const count = buffer.length;
    let currentLandmarks = avgLandmarks.map(lm => ({
        x: lm.x / count,
        y: lm.y / count,
        z: lm.z / count,
        visibility: lm.visibility / count
    }));
    
    // Fix alignment for mirrored front view
    if (view === 'front') {
        currentLandmarks = currentLandmarks.map((lm: any) => ({
            ...lm,
            x: 1 - lm.x
        }));
    }
    
    // Send to WebSocket for analysis
    if (imageSrc) {
        setCapturedImage(imageSrc);
        setLandmarks(currentLandmarks);
        analyze(view, currentLandmarks, video.videoWidth, video.videoHeight);
    }
  }, [view, analyze]);

  const captureStatusRef = useRef(captureStatus);
  useEffect(() => {
    captureStatusRef.current = captureStatus;
  }, [captureStatus]);

  const onResults = useCallback((results: Results, video: HTMLVideoElement) => {
    if (results.poseLandmarks) {
      // Update buffer
      landmarksBufferRef.current.push(results.poseLandmarks);
      
      // Keep last 30 frames (~1 second)
      if (landmarksBufferRef.current.length > 30) {
          landmarksBufferRef.current.shift();
      }
      
      // Auto-capture logic
      const status = captureStatusRef.current;
      if (status === 'scanning' || status === 'countdown') {
        const inPos = checkUserPosition(results.poseLandmarks);
        setIsInPosition(inPos);

        if (status === 'scanning' && inPos) {
           setCaptureStatus('countdown');
           setCountdown(3);
           landmarksBufferRef.current = [];
        } else if (status === 'countdown' && !inPos) {
           setCaptureStatus('scanning');
           setCountdown(3);
        }
      }
    }
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (captureStatus === 'countdown') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            // We need a way to get the video element here or use a ref
            // For now, we'll rely on the next onResults call to trigger handleCapture if countdown is 0
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [captureStatus]);

  // Trigger capture when countdown hits 0
  useEffect(() => {
    if (captureStatus === 'countdown' && countdown === 0) {
        // Find the video element and capture
        const video = document.querySelector('video');
        if (video) handleCapture(video);
    }
  }, [countdown, captureStatus, handleCapture]);

  const startScanning = () => {
    setResult(null);
    setCaptureStatus('scanning');
    setCountdown(3);
  };

  const resetAnalysis = () => {
      setResult(null);
      setLandmarks(null);
      setCapturedImage(null);
      setCaptureStatus('idle');
  };

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
          {[
            { id: 'front', label: '正视图' },
            { id: 'side', label: '侧视图' },
            { id: 'back', label: '背视图' }
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => { setView(v.id as any); resetAnalysis(); }}
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
        {/* Camera/Image Area */}
        <div className="lg:col-span-7 bg-black rounded-[2.5rem] overflow-hidden shadow-2xl aspect-[4/3] relative group ring-1 ring-white/10">
          {!result ? (
            <BaseWebcamView
              isCameraOn={isCameraOn}
              onCameraToggle={setIsCameraOn}
              onResults={onResults}
              isMirrored={view === 'front'}
            >
              {/* Reference Box Overlay */}
              {isCameraOn && captureStatus !== 'idle' && (
                  <div className={cn(
                      "absolute border-2 border-dashed rounded-[2rem] transition-all duration-500",
                      isInPosition ? "border-green-400 bg-green-400/10 shadow-[0_0_50px_rgba(74,222,128,0.2)]" : "border-white/30",
                      captureStatus === 'countdown' ? "border-solid border-blue-400" : ""
                  )}
                  style={{
                      left: `${BOX.xMin * 100}%`,
                      top: `${BOX.yMin * 100}%`,
                      width: `${(BOX.xMax - BOX.xMin) * 100}%`,
                      height: `${(BOX.yMax - BOX.yMin) * 100}%`
                  }}>
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                          <p className="text-[10px] font-bold text-white uppercase tracking-widest">请站在虚线框内</p>
                      </div>
                  </div>
              )}

              {/* Countdown Overlay */}
              {captureStatus === 'countdown' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] z-30">
                      <div className="text-9xl font-black text-white drop-shadow-2xl animate-ping">
                          {countdown}
                      </div>
                  </div>
              )}

              {/* Status Indicator */}
              {isCameraOn && (
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4">
                  {captureStatus === 'idle' ? (
                    <button
                      onClick={startScanning}
                      className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center gap-3 cursor-pointer pointer-events-auto"
                    >
                      <CameraIcon className="h-5 w-5" />
                      开始评估
                    </button>
                  ) : (
                    <div className="px-6 py-3 bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center gap-3">
                      <div className={cn(
                        "h-3 w-3 rounded-full animate-pulse",
                        isInPosition ? "bg-green-500" : "bg-yellow-500"
                      )} />
                      <span className="text-sm font-bold text-white uppercase tracking-wider">
                        {isInPosition ? "准备就绪" : "正在寻找体态..."}
                      </span>
                      <button 
                        onClick={resetAnalysis}
                        className="ml-4 p-1.5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer pointer-events-auto"
                      >
                        <RefreshCw className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </BaseWebcamView>
          ) : (
            /* Result Image Preview */
            <div className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center p-4">
              <img 
                src={result.image} 
                className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl"
                alt="Posture Analysis Result"
              />
              <button 
                onClick={resetAnalysis}
                className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all border border-white/10 cursor-pointer"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        {/* Results Info Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {!result ? (
            <div className="flex-1 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6">
                <User className="h-10 w-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">等待评估</h3>
              <p className="text-slate-500 max-w-xs mx-auto leading-relaxed">
                点击“开始评估”并按照提示站立，AI 将自动分析您的体态数据。
              </p>
              
              <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">评估项</p>
                  <p className="text-xl font-bold text-slate-700">12+ 维度</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">精准度</p>
                  <p className="text-xl font-bold text-slate-700">医疗级</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Summary Stats */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">评估结论</h3>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest",
                    result.issues.length === 0 ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {result.issues.length === 0 ? "状况良好" : `发现 ${result.issues.length} 项异常`}
                  </div>
                </div>

                <div className="space-y-4">
                  {result.issues.length === 0 ? (
                    <div className="flex items-start gap-4 p-5 bg-green-50 rounded-3xl border border-green-100">
                      <CheckCircle className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-green-900">体态非常标准</p>
                        <p className="text-green-700 text-sm mt-1">未发现明显的姿态问题，请继续保持良好的生活习惯。</p>
                      </div>
                    </div>
                  ) : (
                    result.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-start gap-4 p-5 bg-amber-50 rounded-3xl border border-amber-100">
                        <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-amber-900">{issue.title}</p>
                          <p className="text-amber-700 text-sm mt-1">{issue.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-6">
                   <button 
                    onClick={exportPDF}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold transition-all shadow-lg active:scale-95"
                   >
                     <FileDown className="h-5 w-5" />
                     导出 PDF
                   </button>
                   <button 
                    onClick={resetAnalysis}
                    className="flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-2xl font-bold transition-all active:scale-95"
                   >
                     <RefreshCw className="h-5 w-5" />
                     重新评估
                   </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Report Template for PDF Export */}
      <div id="posture-report" className="hidden fixed left-0 top-0 w-[210mm] bg-white p-12 text-slate-900">
        <div className="flex justify-between items-start mb-12 border-b-4 border-slate-900 pb-8">
          <div>
            <h1 className="text-5xl font-black tracking-tighter mb-2">VISION<span className="text-blue-600">3</span></h1>
            <p className="text-xl font-bold text-slate-500 uppercase tracking-widest">AI POSTURE ANALYSIS REPORT</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400">REPORT ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
            <p className="text-sm font-bold text-slate-400">DATE: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-12">
          <div className="space-y-6">
            <h3 className="text-2xl font-black border-l-4 border-blue-600 pl-4">评估影像</h3>
            <div className="aspect-[4/3] bg-slate-100 rounded-3xl overflow-hidden border-2 border-slate-200 shadow-inner">
              {result && <img src={result.image} className="w-full h-full object-cover" />}
            </div>
          </div>
          
          <div className="space-y-6">
            <h3 className="text-2xl font-black border-l-4 border-blue-600 pl-4">关键指标</h3>
            <div className="grid grid-cols-1 gap-4">
              {result && Object.entries(result.metrics).map(([key, value]: [string, any]) => {
                if (typeof value !== 'number') return null;
                return (
                  <div key={key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-xs">{key.replace(/_/g, ' ')}</span>
                    <span className="text-2xl font-black text-slate-900">{value.toFixed(1)}°</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          <h3 className="text-2xl font-black border-l-4 border-blue-600 pl-4">评估建议</h3>
          <div className="grid grid-cols-1 gap-4">
            {result?.issues.map((issue, idx) => (
              <div key={idx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <p className="text-lg font-black text-slate-900 mb-1">{issue.title}</p>
                <p className="text-slate-600">{issue.description}</p>
              </div>
            ))}
            {result?.issues.length === 0 && (
              <div className="p-8 bg-green-50 rounded-3xl border border-green-100 text-center">
                <p className="text-xl font-bold text-green-900">恭喜！未发现任何体态异常。</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-200 text-center">
          <p className="text-xs font-bold text-slate-400">本报告由 Vision3 AI 视觉引擎自动生成。仅供参考，不作为医疗诊断依据。</p>
        </div>
      </div>
      
      {/* Hidden canvas for result rendering */}
      <canvas ref={reportCanvasRef} className="hidden" />
    </div>
  );
}