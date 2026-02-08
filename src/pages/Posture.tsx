import { useState, useRef, useCallback, useEffect } from 'react';
import { Holistic, Results, POSE_CONNECTIONS, FACEMESH_TESSELATION } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { Camera as CameraIcon, CheckCircle, AlertTriangle, User, Play, RefreshCw, FileDown, Video, VideoOff } from 'lucide-react';
import { usePostureWS, VisualAnnotation, PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useCameraStream } from '@/hooks/useCameraStream';

export default function Posture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holisticRef = useRef<Holistic | null>(null);
  const [view, setView] = useState<'front' | 'back' | 'side'>('front');
  const [isCameraOn, setIsCameraOn] = useState(() => {
    const saved = localStorage.getItem('vision3_camera_enabled');
    return saved !== null ? saved === 'true' : true;
  });

  const { stream, isLoading, error: cameraError } = useCameraStream(isCameraOn);

  useEffect(() => {
    localStorage.setItem('vision3_camera_enabled', String(isCameraOn));
  }, [isCameraOn]);

  // Sync video source with our shared stream
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        console.log("[Posture] Syncing shared stream to video element");
        videoRef.current.srcObject = stream;
        
        // Ensure video plays after stream is set
        videoRef.current.play().catch(err => {
          console.error("[Posture] Failed to play synced video:", err);
        });
      }
    }
  }, [stream]);

  const [result, setResult] = useState<{ issues: PostureIssue[]; metrics: PostureMetrics; image: string } | null>(null);
  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  // WebSocket for posture analysis
  const { result: wsResult, analyze } = usePostureWS();

  // Handle analysis results from WebSocket
  useEffect(() => {
    if (wsResult && capturedImage && landmarks && videoRef.current) {
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
  const latestLandmarksRef = useRef<any[] | null>(null);
  // Buffer for smoothing landmarks over time
  const landmarksBufferRef = useRef<any[][]>([]);
  const faceLandmarksBufferRef = useRef<any[][]>([]);

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
          const canvas = canvasRef.current;
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

          // Draw Backend Annotations (Reference lines, issues, etc.)
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

                  // Draw Label if exists
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

          // Draw Head Pose Axes (if available)
          if (headPoseAxes && headPoseAxes.length === 4) {
              const axes = headPoseAxes;
              const origin = axes[0];
              const xAxis = axes[1];
              const yAxis = axes[2];
              const zAxis = axes[3];

              ctx.lineWidth = 3;

              // X-Axis (Red) - Right
              ctx.beginPath();
              ctx.strokeStyle = 'red';
              ctx.moveTo(origin.x, origin.y);
              ctx.lineTo(xAxis.x, xAxis.y);
              ctx.stroke();

              // Y-Axis (Green) - Down
              ctx.beginPath();
              ctx.strokeStyle = 'green';
              ctx.moveTo(origin.x, origin.y);
              ctx.lineTo(yAxis.x, yAxis.y);
              ctx.stroke();

              // Z-Axis (Blue) - Forward
              ctx.beginPath();
              ctx.strokeStyle = 'blue';
              ctx.moveTo(origin.x, origin.y);
              ctx.lineTo(zAxis.x, zAxis.y);
              ctx.stroke();
          }

          // Draw Reference Box
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 2;
          ctx.setLineDash([10, 10]);
          ctx.strokeRect(
              BOX.xMin * canvas.width,
              BOX.yMin * canvas.height,
              (BOX.xMax - BOX.xMin) * canvas.width,
              (BOX.yMax - BOX.yMin) * canvas.height
          );
          ctx.setLineDash([]);
          
          // Update result image with annotations
          setResult(prev => prev ? { ...prev, image: canvas.toDataURL() } : null);
      };
  };

  const handleCapture = useCallback(() => {
    if (!videoRef.current || landmarksBufferRef.current.length === 0) return;
    
    // Create screenshot from video
    const video = videoRef.current;
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
    const numLandmarks = buffer[0].length;
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
    if (video && imageSrc) {
        setCapturedImage(imageSrc);
        setLandmarks(currentLandmarks);
        
        // Use the new WebSocket hook for analysis
        analyze(view, currentLandmarks, video.videoWidth, video.videoHeight);
        
        // Note: The result will be handled by the useEffect watching wsResult
    }
  }, [view, analyze]);

  const exportPDF = async () => {
    if (!result) return;
    const element = document.getElementById('posture-report');
    if (!element) return;

    // Temporarily show the element
    element.style.display = 'block';

    try {
      const canvas = await html2canvas(element, { 
        scale: 2,
        useCORS: true,
        logging: false
      });
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

  const onResults = useCallback((results: Results) => {
    if (results.poseLandmarks) {
      latestLandmarksRef.current = results.poseLandmarks;
      
      // Update buffer
      landmarksBufferRef.current.push(results.poseLandmarks);
      if (results.faceLandmarks) {
          faceLandmarksBufferRef.current.push(results.faceLandmarks);
      }
      
      // Keep last 30 frames (~1 second)
      if (landmarksBufferRef.current.length > 30) {
          landmarksBufferRef.current.shift();
      }
      if (faceLandmarksBufferRef.current.length > 30) {
          faceLandmarksBufferRef.current.shift();
      }
      
      // Auto-capture logic
      if (captureStatus === 'scanning' || captureStatus === 'countdown') {
        const inPos = checkUserPosition(results.poseLandmarks);
        setIsInPosition(inPos);

        if (captureStatus === 'scanning' && inPos) {
           setCaptureStatus('countdown');
           setCountdown(3);
           // Clear buffer when starting countdown to ensure clean data for capture
           landmarksBufferRef.current = [];
           faceLandmarksBufferRef.current = [];
        } else if (captureStatus === 'countdown' && !inPos) {
           // User left position, reset
           setCaptureStatus('scanning');
           setCountdown(3);
        }
      }
    }
  }, [captureStatus]);

  // Countdown timer effect
  useEffect(() => {
    if (captureStatus === 'countdown') {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            handleCapture();
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
  }, [captureStatus, handleCapture]);

  useEffect(() => {
    console.log("Initializing Holistic model...");
    const holistic = new Holistic({locateFile: (file) => {
      const url = `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
      console.log(`Loading Mediapipe file: ${url}`);
      return url;
    }});

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: true,
      refineFaceLandmarks: true,
      minDetectionConfidence: 0.75,
      minTrackingConfidence: 0.75
    });

    holistic.onResults((results) => {
      if (results.poseLandmarks) {
        // console.log("Landmarks detected");
      }
      onResults(results);
    });

    holisticRef.current = holistic;
    console.log("Holistic model initialized");
    
    return () => {
        holistic.close();
    };
  }, [onResults]);

  useEffect(() => {
    if (!isCameraOn) {
      console.log("Camera is turned off");
      return;
    }

    console.log("Starting frame processing loop...");
    let requestRef: number;
    
    const processFrame = async () => {
      if (videoRef.current && holisticRef.current) {
        const video = videoRef.current;
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA
          try {
            await holisticRef.current.send({ image: video });
          } catch (err) {
            console.error("Error sending frame to Holistic:", err);
          }
        }
      }
      requestRef = requestAnimationFrame(processFrame);
    };

    requestRef = requestAnimationFrame(processFrame);

    return () => {
        console.log("Stopping frame processing loop...");
        cancelAnimationFrame(requestRef);
    };
  }, [isCameraOn]);

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
            <>
              {isCameraOn ? (
                <div className="absolute inset-0 w-full h-full">
                  {isLoading && !stream && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-950 z-30">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                    </div>
                  )}
                  {cameraError && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white z-30 p-6 text-center">
                      <VideoOff className="h-12 w-12 text-red-500 mb-4" />
                      <h3 className="text-xl font-bold mb-2">摄像头启动失败</h3>
                      <p className="text-gray-400 max-w-xs mb-6">
                        {cameraError.message.includes("NotReadableError") || cameraError.message.includes("Device in use") 
                          ? "摄像头被占用。请确保其他应用已关闭摄像头。" 
                          : "无法访问摄像头，请检查权限设置。"}
                      </p>
                      <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                      >
                        刷新页面
                      </button>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    className={cn(
                      "absolute inset-0 w-full h-full object-contain",
                      view === 'front' && "scale-x-[-1]"
                    )}
                    autoPlay
                    playsInline
                    muted
                  />
                </div>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950 text-white">
                    <div className="bg-white/5 p-6 rounded-full mb-6">
                      <VideoOff className="h-12 w-12 opacity-30" />
                    </div>
                    <p className="text-gray-400 text-lg font-medium">摄像头已关闭</p>
                    <button 
                      onClick={() => setIsCameraOn(true)}
                      className="mt-6 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20"
                    >
                      开启摄像头
                    </button>
                </div>
              )}
              
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
                      {/* Status Text inside Box */}
                      <div className="absolute inset-0 flex items-center justify-center">
                          {captureStatus === 'countdown' ? (
                              <span className="text-9xl font-black text-white drop-shadow-2xl animate-bounce">
                                  {countdown}
                              </span>
                          ) : (
                              !isInPosition && (
                                <div className="text-center p-4">
                                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20">
                                      <User className="h-12 w-12 text-white mx-auto mb-3 opacity-80" />
                                      <p className="text-white font-bold text-lg">请站入框内</p>
                                    </div>
                                </div>
                              )
                          )}
                      </div>
                  </div>
              )}

              {/* Controls Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex justify-center">
                {isCameraOn && (captureStatus === 'idle' ? (
                    <button
                    onClick={startScanning}
                    className="flex items-center px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 group"
                    >
                    <div className="bg-white/20 p-1.5 rounded-lg mr-3 group-hover:scale-110 transition-transform">
                      <Play className="h-5 w-5 fill-current" />
                    </div>
                    开始测量
                    </button>
                ) : (
                    <button
                    onClick={() => setCaptureStatus('idle')}
                    className="flex items-center px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-xl border border-white/20 transition-all font-bold"
                    >
                    取消
                    </button>
                ))}
              </div>

              <button
                  onClick={() => setIsCameraOn(!isCameraOn)}
                  className="absolute top-6 right-6 p-3 rounded-2xl bg-black/40 text-white hover:bg-black/60 transition-all backdrop-blur-xl border border-white/10 pointer-events-auto z-50 shadow-xl"
                  title={isCameraOn ? "关闭摄像头" : "打开摄像头"}
              >
                  {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </button>
            </>
          ) : (
            <div className="relative w-full h-full">
                <img src={result.image} alt="Analysis" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20" />
                <button
                    onClick={resetAnalysis}
                    className="absolute top-6 right-6 flex items-center bg-white/90 backdrop-blur-xl px-6 py-3 rounded-2xl text-sm font-bold text-gray-900 hover:bg-white shadow-2xl transition-all hover:scale-105 active:scale-95"
                >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新拍摄
                </button>
            </div>
          )}
        </div>

        {/* Results Area */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex-1">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-bold text-gray-900">评估分析</h3>
              {result && (
                <button
                  onClick={exportPDF}
                  className="flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-xl text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-100"
                >
                  <FileDown className="h-4 w-4 mr-1.5" />
                  导出报告
                </button>
              )}
            </div>
            
            {!result ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-gray-400 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 p-8">
                <div className="bg-white p-4 rounded-2xl shadow-sm mb-6">
                  <CameraIcon className="h-10 w-10 text-gray-300" />
                </div>
                <p className="text-gray-500 font-bold text-center leading-relaxed">
                  点击“开始测量”并站在指示框内<br/>系统将为您进行全方位的体态扫描
                </p>
              </div>
          ) : (
            <div className="space-y-4">
              {result.issues.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-green-50/50 rounded-3xl text-green-800 border border-green-100 text-center">
                  <div className="bg-white p-3 rounded-2xl shadow-sm mb-4">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="font-bold text-lg">未检测到明显体态问题</p>
                  <p className="text-sm text-green-600 mt-2">您的体态保持良好，请继续保持健康的生活习惯！</p>
                </div>
              ) : (
                result.issues.map((issue, index) => (
                  <div key={index} className={cn(
                    "p-6 rounded-3xl border transition-all hover:scale-[1.02] duration-300",
                    issue.severity === 'severe' ? "bg-red-50/50 border-red-100 shadow-sm" :
                    issue.severity === 'moderate' ? "bg-orange-50/50 border-orange-100 shadow-sm" :
                    "bg-yellow-50/50 border-yellow-100 shadow-sm"
                  )}>
                    <div className="flex items-start">
                      <div className={cn(
                        "p-2.5 rounded-xl mr-4",
                        issue.severity === 'severe' ? "bg-red-100 text-red-600" :
                        issue.severity === 'moderate' ? "bg-orange-100 text-orange-600" :
                        "bg-yellow-100 text-yellow-600"
                      )}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-bold text-gray-900">{issue.title}</h4>
                          <span className={cn(
                            "px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider",
                            issue.severity === 'severe' ? "bg-red-200 text-red-800" :
                            issue.severity === 'moderate' ? "bg-orange-200 text-orange-800" :
                            "bg-yellow-200 text-yellow-800"
                          )}>
                            {issue.severity === 'severe' ? '严重' : issue.severity === 'moderate' ? '中度' : '轻微'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-4">{issue.description}</p>
                        <div className="flex items-start gap-2 bg-white/60 p-3 rounded-2xl border border-white/40">
                          <span className="text-xs font-black text-blue-600 uppercase mt-0.5">建议</span>
                          <p className="text-sm font-medium text-gray-700">{issue.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
      
      {/* Hidden Canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden Report Template for PDF Export */}
      {result && (
        <div 
          id="posture-report" 
          className="fixed left-[-9999px] top-0 bg-white p-8"
          style={{ width: '210mm', minHeight: '297mm' }}
        >
          {/* Header */}
          <div className="text-center border-b pb-6 mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">体态评估报告</h1>
            <p className="text-gray-500">评估日期: {new Date().toLocaleDateString()}</p>
          </div>

          {/* Content Grid */}
          <div className="space-y-8">
            {/* 1. Image Snapshot */}
            <div className="flex justify-center bg-black rounded-lg overflow-hidden h-[300px]">
               <img src={result.image} alt="Analysis Snapshot" className="h-full object-contain" />
            </div>

            {/* 2. Analysis Summary */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-blue-600 pl-3">评估总结</h2>
              {result.issues.length === 0 ? (
                <div className="p-4 bg-green-50 text-green-800 rounded">
                   恭喜！您的体态保持良好，各项指标均在正常范围内。
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {result.issues.map((issue, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded border border-gray-200">
                       <div className="flex items-center mb-2">
                         <span className={cn(
                           "px-2 py-0.5 text-xs font-bold rounded uppercase mr-2",
                           issue.severity === 'severe' ? "bg-red-100 text-red-800" :
                           issue.severity === 'moderate' ? "bg-orange-100 text-orange-800" :
                           "bg-yellow-100 text-yellow-800"
                         )}>
                           {issue.severity === 'severe' ? '严重' : issue.severity === 'moderate' ? '中度' : '轻微'}
                         </span>
                         <h3 className="font-bold text-gray-900">{issue.title}</h3>
                       </div>
                       <p className="text-gray-600 text-sm mb-2">{issue.description}</p>
                       <p className="text-blue-700 text-sm font-medium">建议: {issue.recommendation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Data Visualization (Trend/Standard Chart) */}
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-blue-600 pl-3">数据指标分析</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      view === 'side' ? [
                        { name: '头前倾指数', value: result.metrics.headForward || 0, max: 0.25, label: '正常 < 0.25' },
                        { name: '圆肩指数', value: result.metrics.shoulderRounded || 0, max: 0.15, label: '正常 < 0.15' }
                      ] : [
                        { name: '肩部倾斜', value: Math.abs(result.metrics.shoulderAngle || 0), max: 3, label: '正常 < 3°' },
                        { name: '骨盆倾斜', value: Math.abs(result.metrics.hipAngle || 0), max: 3, label: '正常 < 3°' },
                        { name: '中线偏移', value: (result.metrics.headDeviation || 0) * 100, max: 10, label: '正常 < 10%' }
                      ]
                    }
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip 
                      cursor={{fill: 'transparent'}}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-2 border shadow text-sm">
                              <p>{data.name}: {data.value.toFixed(2)}</p>
                              <p className="text-gray-500">{data.label}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="value" name="测量值" fill="#3b82f6" barSize={20} isAnimationActive={false}>
                      {
                        (view === 'side' ? [
                            { value: result.metrics.headForward || 0, max: 0.25 },
                            { value: result.metrics.shoulderRounded || 0, max: 0.15 },
                            { value: Math.abs(result.metrics.headPitch || 0), max: 15 }
                          ] : [
                            { value: Math.abs(result.metrics.shoulderAngle || 0), max: 3 },
                            { value: Math.abs(result.metrics.hipAngle || 0), max: 3 },
                            { value: (result.metrics.headDeviation || 0) * 100, max: 10 },
                            { value: Math.abs(result.metrics.headYaw || 0), max: 15 },
                            { value: Math.abs(result.metrics.headRoll || 0), max: 10 }
                          ]).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.value > entry.max ? '#ef4444' : '#22c55e'} />
                        ))
                      }
                    </Bar>
                    <Bar dataKey="max" name="参考上限" fill="#9ca3af" barSize={20} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-400 mt-2 text-center">* 绿色表示正常范围，红色表示超出参考标准</p>
            </div>
            
            {/* Footer */}
            <div className="border-t pt-4 mt-8 text-center text-sm text-gray-400">
               <p>Vision3 AI Posture Analysis System</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}