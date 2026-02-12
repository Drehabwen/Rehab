import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Results, POSE_CONNECTIONS } from '@mediapipe/holistic';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';
import { 
  Camera as CameraIcon, 
  CheckCircle, 
  AlertTriangle, 
  Play, 
  RefreshCw, 
  FileDown, 
  Video, 
  VideoOff,
  ChevronRight,
  Maximize2,
  Activity,
  History,
  Settings2,
  TrendingUp,
  FileText,
  Square,
  RotateCcw,
  Save,
  ArrowRight,
  Scan,
  Zap,
  Dna
} from 'lucide-react';
import { usePostureWS, VisualAnnotation, PostureIssue, PostureMetrics } from '@/hooks/usePostureWS';
import { cn } from '@/lib/utils';
import BaseWebcamView from '@/components/shared/BaseWebcamView';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import MeasurementChart from '@/components/MeasurementChart';
import JointSelector from '@/components/JointSelector';

const jointNameMap: Record<string, string> = {
  cervical: '颈椎',
  shoulder: '肩关节',
  thoracolumbar: '胸腰椎',
  elbow: '肘关节',
  wrist: '腕关节',
  hip: '髋关节',
  knee: '膝关节',
  ankle: '踝关节',
};

export const Vision3Plugin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'posture' | 'rom'>('posture');
  const [isEntryMode, setIsEntryMode] = useState(true);
  const [view, setView] = useState<'front' | 'back' | 'side'>('front');
  const [isCameraOn, setIsCameraOn] = useState(true);
  
  // Posture States
  const [result, setResult] = useState<{ issues: PostureIssue[]; metrics: PostureMetrics; image: string } | null>(null);
  const [landmarks, setLandmarks] = useState<any[] | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const reportCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // ROM States (from store)
  const { 
    isMeasuring, startMeasurement, stopMeasurement, resetMeasurement, saveMeasurement, activeMeasurements
  } = useMeasurementStore();

  const { result: wsResult, analyze } = usePostureWS();

  // Auto-capture states
  const [captureStatus, setCaptureStatus] = useState<'idle' | 'scanning' | 'countdown'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [isInPosition, setIsInPosition] = useState(false);
  const landmarksBufferRef = useRef<any[][]>([]);

  // Reference box
  const BOX = { xMin: 0.25, xMax: 0.75, yMin: 0.1, yMax: 0.9 };

  const checkUserPosition = (landmarks: any[]) => {
    if (!landmarks || landmarks.length < 33) return false;
    const keyPointsIndices = [0, 11, 12, 23, 24, 27, 28];
    const visible = keyPointsIndices.every(idx => landmarks[idx].visibility > 0.6);
    if (!visible) return false;

    const nose = landmarks[0];
    const leftAnkle = landmarks[27];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];

    const inX = nose.x > BOX.xMin && nose.x < BOX.xMax && leftShoulder.x > BOX.xMin && rightShoulder.x < BOX.xMax;
    const inY = nose.y > BOX.yMin && nose.y < 0.4 && leftAnkle.y > 0.6 && leftAnkle.y < BOX.yMax;

    return inX && inY;
  };

  const onResults = useCallback((results: Results, video: HTMLVideoElement) => {
    if (results.poseLandmarks) {
      landmarksBufferRef.current.push(results.poseLandmarks);
      if (landmarksBufferRef.current.length > 30) landmarksBufferRef.current.shift();
      
      if (activeTab === 'posture' && !isEntryMode && (captureStatus === 'scanning' || captureStatus === 'countdown')) {
        const inPos = checkUserPosition(results.poseLandmarks);
        setIsInPosition(inPos);
        if (captureStatus === 'scanning' && inPos) {
          setCaptureStatus('countdown');
          setCountdown(3);
        }
      }
    }
  }, [captureStatus, activeTab, isEntryMode]);

  const getShoulderStatus = (angle: number) => {
    const absAngle = Math.abs(angle);
    if (absAngle < 1.5) return { text: '姿态端正', color: 'text-emerald-500', bgColor: 'bg-emerald-50' };
    if (absAngle < 3.5) return { text: '轻微高低肩', color: 'text-amber-500', bgColor: 'bg-amber-50' };
    return { text: '显著高低肩', color: 'text-rose-500', bgColor: 'bg-rose-50' };
  };

  const getHeadStatus = (angle: number) => {
    if (angle < 12) return { text: '理想体态', color: 'text-emerald-500', bgColor: 'bg-emerald-50' };
    if (angle < 22) return { text: '轻度前倾', color: 'text-amber-500', bgColor: 'bg-amber-50' };
    return { text: '严重前倾', color: 'text-rose-500', bgColor: 'bg-rose-50' };
  };

  const getHipStatus = (angle: number) => {
    const absAngle = Math.abs(angle);
    if (absAngle < 2.5) return { text: '结构稳定', color: 'text-emerald-500', bgColor: 'bg-emerald-50' };
    if (absAngle < 5) return { text: '轻微倾斜', color: 'text-amber-500', bgColor: 'bg-amber-50' };
    return { text: '骨盆失衡', color: 'text-rose-500', bgColor: 'bg-rose-50' };
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'severe': return '严重';
      case 'moderate': return '中度';
      case 'mild': return '轻微';
      default: return '观察';
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500 overflow-hidden">
      {/* Bento Header: Mode Switcher */}
      <div className="flex items-center justify-between bg-white/40 backdrop-blur-xl p-3 rounded-[2rem] border border-white/60 shadow-sm">
        <div className="flex items-center gap-4">
          {isEntryMode ? (
            <div className="flex p-1.5 bg-slate-100/50 rounded-2xl">
              <button 
                onClick={() => { setActiveTab('posture'); setIsEntryMode(true); }}
                className={cn(
                  "px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3",
                  activeTab === 'posture' 
                    ? "bg-white text-antey-primary shadow-lg shadow-antey-primary/5 ring-1 ring-slate-200" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                )}
              >
                <Activity size={16} className={cn("transition-transform duration-500", activeTab === 'posture' && "scale-110")} />
                体态评估
              </button>
              <button 
                onClick={() => setActiveTab('rom')}
                className={cn(
                  "px-8 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3",
                  activeTab === 'rom' 
                    ? "bg-white text-antey-accent shadow-lg shadow-antey-accent/5 ring-1 ring-slate-200" 
                    : "text-slate-400 hover:text-slate-600 hover:bg-white/50"
                )}
              >
                <TrendingUp size={16} className={cn("transition-transform duration-500", activeTab === 'rom' && "scale-110")} />
                关节测量
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsEntryMode(true)}
                className="group flex items-center gap-3 px-6 py-3 bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-all duration-300"
              >
                <RotateCcw size={16} className="text-antey-primary group-hover:rotate-[-45deg] transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-widest">返回中心概览</span>
              </button>
              
              <div className="w-px h-8 bg-slate-200 mx-2" />
              
              <div className="flex p-1.5 bg-slate-100/50 rounded-2xl">
                {(['front', 'side', 'back'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={cn(
                      "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-2",
                      view === v 
                        ? "bg-white text-antey-primary shadow-md ring-1 ring-slate-200" 
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    <div className={cn("w-1.5 h-1.5 rounded-full", view === v ? "bg-antey-primary" : "bg-slate-300")} />
                    {v === 'front' ? '正面视角' : v === 'side' ? '侧面视角' : '背面视角'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-6 px-6">
          <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            系统就绪
            <span className="w-px h-4 bg-slate-200 mx-2" />
            <History size={14} className="text-slate-300" />
            2026.02.09
          </div>
          <button className="p-2.5 text-slate-400 hover:bg-white hover:text-antey-primary hover:shadow-sm rounded-xl transition-all duration-300">
            <Settings2 size={18} />
          </button>
        </div>
      </div>

      {/* Conditional Rendering: Entry Hub vs Active Mode */}
      {activeTab === 'posture' && isEntryMode ? (
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 grid-rows-2 gap-8 animate-in fade-in zoom-in-95 duration-700">
          {[
            { id: 'front', title: '正面体态扫描', desc: '评估 O/X 型腿、高低肩、骨盆侧倾', icon: Scan, color: 'from-blue-500 to-cyan-400', tag: '基础评估' },
            { id: 'side', title: '侧面体态分析', desc: '诊断圆肩驼背、头颈前倾、骨盆前倾', icon: Activity, color: 'from-emerald-500 to-teal-400', tag: '关键指标' },
            { id: 'back', title: '背面平衡测试', desc: '监测脊柱侧弯风险、足跟轴线', icon: History, color: 'from-purple-500 to-indigo-400', tag: '结构对称' },
            { id: 'squat', title: '深蹲功能检测', desc: '评估下肢稳定性与关节联动', icon: Zap, color: 'from-orange-500 to-amber-400', tag: '动态进阶', disabled: true },
            { id: 'scoliosis', title: '脊柱侧弯筛查', desc: '深度 3D 脊柱曲率建模与评估', icon: Dna, color: 'from-rose-500 to-pink-400', tag: '专项检测', disabled: true },
            { id: 'custom', title: '自定义评估', desc: '灵活配置您的个性化检测流程', icon: Settings2, color: 'from-slate-500 to-slate-400', tag: '实验室', disabled: true },
          ].map((card) => (
            <button
              key={card.id}
              disabled={card.disabled}
              onClick={() => {
                if (card.id === 'front' || card.id === 'side' || card.id === 'back') {
                  setView(card.id as any);
                  setIsEntryMode(false);
                }
              }}
              className={cn(
                "group relative bento-card p-10 flex flex-col items-start text-left transition-all duration-500 hover:translate-y-[-8px]",
                card.disabled ? "opacity-60 grayscale cursor-not-allowed" : "hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] hover:ring-2 hover:ring-antey-primary/20"
              )}
            >
              <div className={cn("w-16 h-16 rounded-[1.5rem] flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500 bg-gradient-to-br text-white", card.color)}>
                <card.icon size={32} />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{card.tag}</span>
                  {card.disabled && <span className="px-2 py-0.5 bg-slate-100 text-[8px] font-black text-slate-500 rounded-md uppercase tracking-widest">即将上线</span>}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{card.title}</h3>
                <p className="text-[13px] font-medium text-slate-500 leading-relaxed max-w-[240px]">
                  {card.desc}
                </p>
              </div>

              <div className="mt-8 flex items-center gap-2 text-antey-primary font-black text-[11px] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0">
                立即启动评估
                <ArrowRight size={16} />
              </div>

              {/* Background Accent */}
              <div className={cn("absolute top-0 right-0 w-32 h-32 bg-gradient-to-br opacity-[0.03] rounded-bl-[100%] transition-all group-hover:opacity-[0.08]", card.color)} />
            </button>
          ))}
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 grid-rows-6 gap-8 min-h-0 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Main Camera Stage: Large Bento Card */}
        <div className="col-span-12 lg:col-span-8 row-span-4 lg:row-span-6 bento-card glow-border !rounded-[3.5rem] group bg-black overflow-hidden relative">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ 
            backgroundImage: 'radial-gradient(circle, #0d948a 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }} />
          
          <BaseWebcamView 
            onResults={onResults} 
            isCameraOn={isCameraOn}
            className="w-full h-full object-cover opacity-90 transition-opacity duration-1000"
          />
          
          {/* AI Scanning Effect */}
          {isCameraOn && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-antey-primary to-transparent opacity-80 animate-scan shadow-[0_0_20px_rgba(13,148,136,0.8)]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(13,148,136,0.1)_0%,transparent_70%)] animate-pulse-subtle" />
              
              {/* Corner Accents */}
              <div className="absolute top-10 left-10 w-12 h-12 border-t-2 border-l-2 border-antey-primary/40 rounded-tl-2xl" />
              <div className="absolute top-10 right-10 w-12 h-12 border-t-2 border-r-2 border-antey-primary/40 rounded-tr-2xl" />
              <div className="absolute bottom-10 left-10 w-12 h-12 border-b-2 border-l-2 border-antey-primary/40 rounded-bl-2xl" />
              <div className="absolute bottom-10 right-10 w-12 h-12 border-b-2 border-r-2 border-antey-primary/40 rounded-br-2xl" />
            </div>
          )}
          
          {/* Bento Overlay: Status Indicator */}
          <div className="absolute top-10 left-10 flex items-center gap-4">
            <div className="px-6 py-3 bg-black/40 backdrop-blur-3xl rounded-2xl border border-white/10 flex items-center gap-4 shadow-2xl">
              <div className="relative">
                <div className={cn("w-2 h-2 rounded-full", isCameraOn ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]" : "bg-rose-500")} />
                {isCameraOn && <div className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-40" />}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.3em] leading-none mb-1">
                  Engine Status
                </span>
                <span className="text-[11px] font-black text-white uppercase tracking-[0.2em] leading-none">
                  {activeTab === 'posture' ? 'Posture AI Core' : 'Joint ROM Engine'} v3.2
                </span>
              </div>
            </div>
          </div>

          {/* Floating Controls: Joint Info (ROM only) */}
          <div className="absolute top-10 right-10 flex flex-col gap-4 z-20">
            {activeTab === 'rom' && activeMeasurements.map((m, idx) => (
              <div key={m.id} className="bg-black/40 backdrop-blur-3xl rounded-3xl border border-white/10 p-6 flex flex-col gap-4 shadow-2xl min-w-[240px] animate-in slide-in-from-right duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: m.color }}>
                    <Activity size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1.5">正在测量</div>
                    <div className="text-sm font-black text-white uppercase tracking-widest leading-none">
                      {jointNameMap[m.joint] || m.joint} {m.side ? (m.side === 'left' ? '(左)' : '(右)') : ''}
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline justify-between gap-4 mt-2">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">实时角度</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-5xl font-black text-white tracking-tighter tabular-nums">
                        {m.currentAngle.toFixed(1)}
                      </span>
                      <span className="text-sm font-black text-white/40 uppercase">deg</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">峰值</span>
                    <span className="text-xl font-black text-antey-accent">
                      {m.maxAngle === -Infinity ? '0.0' : m.maxAngle.toFixed(1)}°
                    </span>
                  </div>
                </div>

                {/* Mini Sparkline indicator */}
                {isMeasuring && m.data.length > 1 && (
                  <div className="h-10 flex items-end gap-1 px-1">
                    {m.data.slice(-20).map((p, i) => {
                      const height = Math.max(4, (p.angle / 180) * 40);
                      return (
                        <div 
                          key={i} 
                          className="flex-1 rounded-full opacity-60 transition-all duration-300"
                          style={{ 
                            height: `${height}px`, 
                            backgroundColor: m.color,
                            opacity: 0.3 + (i / 20) * 0.7
                          }} 
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Analysis Overlays */}
          {activeTab === 'posture' && captureStatus !== 'idle' && (
            <div className="absolute inset-0 pointer-events-none">
              <div className={cn(
                "absolute inset-10 border-[1px] transition-all duration-700 rounded-[2.5rem]",
                isInPosition ? "border-antey-primary/60 bg-antey-primary/5" : "border-rose-500/40 bg-rose-500/5"
              )} />
              {captureStatus === 'countdown' && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-xl">
                  <div className="relative">
                    <span className="text-[12rem] font-black text-white leading-none tracking-tighter animate-pulse drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                      {countdown}
                    </span>
                    <div className="absolute -inset-16 border border-white/10 rounded-full animate-spin-slow" />
                    <div className="absolute -inset-24 border border-white/5 rounded-full animate-reverse-spin-slow" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Floating Controls: Ultra Premium Glassmorphism */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-8 p-5 bg-white/5 backdrop-blur-3xl rounded-[2.5rem] border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-700 translate-y-8 group-hover:translate-y-0 shadow-[0_40px_100px_rgba(0,0,0,0.5)] ring-1 ring-white/10">
            <button 
              onClick={() => setIsCameraOn(!isCameraOn)}
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500",
                isCameraOn ? "bg-white/10 text-white hover:bg-white/20 hover:scale-110" : "bg-rose-500 text-white shadow-2xl shadow-rose-500/40 hover:scale-110"
              )}
            >
              {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
            
            <div className="w-px h-12 bg-white/10" />
            
            {activeTab === 'posture' ? (
              <>
                <button 
                  onClick={() => setCaptureStatus('scanning')}
                  disabled={captureStatus !== 'idle'}
                  className="px-12 py-4 bg-gradient-to-br from-antey-primary to-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-antey-primary/40 hover:scale-105 hover:shadow-antey-primary/60 active:scale-95 transition-all duration-500 disabled:opacity-30 disabled:scale-100"
                >
                  启动 AI 智能识别
                </button>
              </>
            ) : (
              <div className="flex items-center gap-6">
                {!isMeasuring ? (
                  <button 
                    onClick={startMeasurement}
                    className="px-12 py-4 bg-antey-accent text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl shadow-antey-accent/40 hover:scale-105 hover:shadow-antey-accent/60 transition-all duration-500"
                  >
                    启动实时追踪测量
                  </button>
                ) : (
                  <button 
                    onClick={stopMeasurement}
                    className="px-12 py-4 bg-rose-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] animate-pulse shadow-2xl shadow-rose-500/40 hover:scale-105 transition-all duration-500"
                  >
                    停止当前追踪
                  </button>
                )}
                <button 
                  onClick={resetMeasurement}
                  className="w-14 h-14 bg-white/5 text-white rounded-2xl flex items-center justify-center hover:bg-white/10 hover:scale-110 transition-all duration-500 ring-1 ring-white/10"
                >
                  <RotateCcw size={22} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Enhanced Data Dashboard */}
        <div className="col-span-12 lg:col-span-4 row-span-2 lg:row-span-6 flex flex-col gap-4 overflow-hidden pr-2">
          
          {activeTab === 'rom' && (
            <div className="bento-card p-4 bg-white/60 backdrop-blur-md border border-white/40 shadow-lg animate-in slide-in-from-right-4 duration-500">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Settings2 size={12} />
                  关节配置
                </h3>
                <div className="px-2 py-0.5 bg-antey-accent/10 rounded-lg">
                  <span className="text-[8px] font-black text-antey-accent uppercase tracking-widest">ROM</span>
                </div>
              </div>
              <div className="scale-95 origin-top">
                <JointSelector />
              </div>
            </div>
          )}

          {/* Posture Dashboard / ROM Chart Card */}
          <div className="bento-card p-8 flex-1 flex flex-col overflow-hidden bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="p-2 bg-antey-primary/10 rounded-lg">
                  <Activity size={18} className="text-antey-primary" />
                </div>
                {activeTab === 'posture' ? '体态评估深度分析' : '关节活动度报告'}
              </h3>
              {activeTab === 'posture' && result && (
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">健康指数</span>
                  <div className={cn(
                    "text-2xl font-black",
                    (100 - result.issues.length * 15) > 80 ? "text-emerald-500" : 
                    (100 - result.issues.length * 15) > 60 ? "text-amber-500" : "text-rose-500"
                  )}>
                    {Math.max(0, 100 - result.issues.length * 15)}
                  </div>
                </div>
              )}
            </div>
            
            {activeTab === 'posture' ? (
              <div className="flex-1 flex flex-col min-h-0">
                {!result ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="w-48 h-48 rounded-full bg-slate-50/50 flex items-center justify-center mb-10 relative">
                      <div className="absolute inset-0 border-[3px] border-slate-100 border-t-antey-primary rounded-full animate-spin duration-[3000ms]" />
                      <div className="absolute inset-4 border border-dashed border-slate-200 rounded-full animate-reverse-spin-slow" />
                      <div className="absolute inset-8 bg-white rounded-full shadow-inner flex items-center justify-center">
                        <Activity size={48} className="text-antey-primary animate-pulse" />
                      </div>
                      
                      {/* Floating Particles */}
                      <div className="absolute -top-2 left-1/2 w-2 h-2 bg-antey-primary rounded-full animate-ping" />
                      <div className="absolute top-1/2 -right-2 w-2 h-2 bg-antey-accent rounded-full animate-ping delay-300" />
                    </div>
                    <h4 className="text-lg font-black text-slate-900 uppercase tracking-[0.3em] mb-4">AI 核心诊断引擎</h4>
                    <div className="flex items-center gap-3 justify-center mb-6">
                      <div className="px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                          视觉算法就绪
                        </span>
                      </div>
                      <div className="px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                        <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" />
                          深度学习加载中
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400 font-bold max-w-[280px] leading-relaxed">
                      请确保受测者全身处于镜头范围内，系统将自动识别 <span className="text-antey-primary">33个</span> 关键骨骼位点并进行实时体态建模
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col gap-8 overflow-hidden">
                    {/* Primary Metrics: Visual Gauges */}
                    <div className="space-y-6">
                      {/* Shoulder Balance Bar */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">肩膀平衡度</span>
                            <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", getShoulderStatus(result.metrics.shoulderAngle || 0).color.replace('text', 'bg'))} />
                              <span className={cn("text-[11px] font-black uppercase tracking-widest", getShoulderStatus(result.metrics.shoulderAngle || 0).color)}>
                                {getShoulderStatus(result.metrics.shoulderAngle || 0).text}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-xl font-black text-slate-900">{result.metrics.shoulderAngle?.toFixed(1) || '0.0'}°</span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Deviated Angle</span>
                          </div>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full relative overflow-hidden ring-4 ring-slate-50">
                          <div 
                            className={cn(
                              "absolute top-0 bottom-0 transition-all duration-1000 rounded-full",
                              Math.abs(result.metrics.shoulderAngle || 0) < 1.5 ? "bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]" : 
                              Math.abs(result.metrics.shoulderAngle || 0) < 3.5 ? "bg-amber-400" : "bg-rose-400"
                            )}
                            style={{ 
                              left: '50%', 
                              width: `${Math.min(50, Math.abs(result.metrics.shoulderAngle || 0) * 8)}%`,
                              transform: (result.metrics.shoulderAngle || 0) > 0 ? 'none' : 'scaleX(-1)',
                              transformOrigin: 'left'
                            }}
                          />
                          <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-300 z-10" />
                        </div>
                      </div>

                      {/* Head Forwardness Gauge */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-slate-50/80 rounded-[2.5rem] border border-slate-100 group hover:border-antey-primary/30 hover:bg-white hover:shadow-xl transition-all duration-500">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">头颈前倾</div>
                          <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-3xl font-black text-slate-800">{result.metrics.headForward?.toFixed(1) || '0.0'}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">deg</span>
                          </div>
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500",
                            getHeadStatus(result.metrics.headForward || 0).bgColor,
                            getHeadStatus(result.metrics.headForward || 0).color.replace('text', 'border').replace('500', '200')
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", getHeadStatus(result.metrics.headForward || 0).color.replace('text', 'bg'))} />
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", getHeadStatus(result.metrics.headForward || 0).color)}>
                              {getHeadStatus(result.metrics.headForward || 0).text}
                            </span>
                          </div>
                        </div>
                        <div className="p-6 bg-slate-50/80 rounded-[2.5rem] border border-slate-100 group hover:border-antey-primary/30 hover:bg-white hover:shadow-xl transition-all duration-500">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">骨盆倾斜</div>
                          <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-3xl font-black text-slate-800">{result.metrics.hipAngle?.toFixed(1) || '0.0'}</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">deg</span>
                          </div>
                          <div className={cn(
                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-500",
                            getHipStatus(result.metrics.hipAngle || 0).bgColor,
                            getHipStatus(result.metrics.hipAngle || 0).color.replace('text', 'border').replace('500', '200')
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", getHipStatus(result.metrics.hipAngle || 0).color.replace('text', 'bg'))} />
                            <span className={cn("text-[10px] font-black uppercase tracking-widest", getHipStatus(result.metrics.hipAngle || 0).color)}>
                              {getHipStatus(result.metrics.hipAngle || 0).text}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Detailed Issues List */}
                    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur-md py-2 z-10">
                        <div className="w-1.5 h-1.5 rounded-full bg-antey-primary animate-pulse" />
                        异常风险预警 ({result.issues.length})
                      </div>
                      {result.issues.map((issue, idx) => (
                        <div key={idx} className="p-6 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:border-antey-primary/30 transition-all group animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                          <div className="flex items-start gap-5">
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0 transition-transform group-hover:scale-110 duration-500",
                              issue.severity === 'severe' ? "bg-rose-50 text-rose-500" : 
                              issue.severity === 'moderate' ? "bg-amber-50 text-amber-500" : "bg-blue-50 text-blue-500"
                            )}>
                              <AlertTriangle size={28} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-black text-slate-900 uppercase tracking-widest">{issue.title || issue.type}</span>
                                <span className={cn(
                                  "text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-[0.2em]",
                                  issue.severity === 'severe' ? "bg-rose-100 text-rose-600" : 
                                  issue.severity === 'moderate' ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600"
                                )}>
                                  {getSeverityLabel(issue.severity)}
                                </span>
                              </div>
                              <p className="text-[11px] font-medium text-slate-500 leading-relaxed mb-4">
                                {issue.description}
                              </p>
                              <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 group-hover:bg-white transition-colors">
                                <div className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
                                  <Activity size={10} className="text-antey-primary" />
                                  康复建议
                                </div>
                                <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{issue.recommendation}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button className="py-4 rounded-2xl bg-white border border-slate-200 text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                        <History size={14} />
                        对比历史
                      </button>
                      <button className="py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 hover:bg-antey-primary hover:shadow-antey-primary/30 transition-all group flex items-center justify-center gap-2">
                        <span>生成 PDF 报告</span>
                        <TrendingUp size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex-1 min-h-[420px] bg-slate-50/30 rounded-[2.5rem] border border-slate-100/50 p-6 mb-8 relative group/chart">
                  <div className="absolute top-6 right-6 z-10 opacity-0 group-hover/chart:opacity-100 transition-opacity">
                    <button className="p-2 bg-white/80 backdrop-blur-md rounded-xl border border-slate-200 shadow-sm text-slate-400 hover:text-antey-accent hover:border-antey-accent/30 transition-all">
                      <Maximize2 size={16} />
                    </button>
                  </div>
                  <MeasurementChart />
                </div>
                
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="p-8 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-xl group hover:border-antey-accent/30 hover:shadow-2xl transition-all duration-500">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-500 shadow-sm">
                        <Maximize2 size={18} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">本次最大角度</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums">
                        {activeMeasurements[0]?.maxAngle !== -Infinity ? activeMeasurements[0]?.maxAngle.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">deg</span>
                    </div>
                  </div>
                  
                  <div className="p-8 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-xl group hover:border-antey-accent/30 hover:shadow-2xl transition-all duration-500 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6">
                      <div className={cn(
                        "text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest",
                        (activeMeasurements[0]?.maxAngle || 0) >= 140 ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600"
                      )}>
                        {((activeMeasurements[0]?.maxAngle || 0) / 150 * 100).toFixed(0)}% 达标
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-50 rounded-2xl text-blue-500 shadow-sm">
                        <CheckCircle size={18} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">临床参考值</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black text-antey-accent tracking-tighter tabular-nums">150.0</span>
                      <span className="text-sm font-black text-slate-400 uppercase tracking-widest">deg</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto space-y-4">
                  {!isMeasuring ? (
                    <button 
                      onClick={startMeasurement}
                      className="w-full py-5 rounded-[2rem] bg-antey-accent text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-antey-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                    >
                      <Play size={18} fill="currentColor" />
                      开始动态测量
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={stopMeasurement}
                        className="py-5 rounded-[2rem] bg-rose-500 text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-rose-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                      >
                        <Square size={18} fill="currentColor" />
                        停止测量
                      </button>
                      <button 
                        onClick={resetMeasurement}
                        className="py-5 rounded-[2rem] bg-slate-100 text-slate-900 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-200 transition-all flex items-center justify-center gap-3"
                      >
                        <RotateCcw size={18} />
                        重置
                      </button>
                    </div>
                  )}
                  
                  <button 
                    disabled={activeMeasurements[0]?.data.length === 0}
                    onClick={saveMeasurement}
                    className="w-full py-5 rounded-[2rem] border-2 border-slate-100 text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                  >
                    <Save size={18} />
                    保存本次测量数据
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
      
      {/* Hidden Report Canvas */}
      <canvas ref={reportCanvasRef} className="hidden" />
    </div>
  );
};

export default Vision3Plugin;
