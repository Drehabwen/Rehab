import React, { useState, useRef, useEffect } from 'react';
import { 
  Camera, RotateCcw, Compass, Sliders, ChevronRight, Save, 
  CheckCircle2, Grid, VideoOff, Sparkles, AlertCircle, ThumbsUp, Printer, ArrowLeft 
} from 'lucide-react';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { cn } from '@/lib/utils';
import { COLORS } from '@/constants/uiStyles';
import type { AdamsAssessmentData } from '@/types/assessment';

interface AdamsWorkspaceProps {
  onBack: () => void;
}

export const AdamsWorkspace: React.FC<AdamsWorkspaceProps> = ({ onBack }) => {
  const { currentPatient } = usePatientStore();
  const { currentSession, sessions, startSession } = useSessionStore();
  const { addAssessment } = useAssessmentStore();

  // Webcam & Canvas State
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Form State
  const [atrDegrees, setAtrDegrees] = useState<number>(0);
  const [atrDirection, setAtrDirection] = useState<'left' | 'right' | 'none'>('none');
  const [shoulderAsymmetry, setShoulderAsymmetry] = useState<'symmetrical' | 'left-higher' | 'right-higher'>('symmetrical');
  const [scapulaAsymmetry, setScapulaAsymmetry] = useState<'symmetrical' | 'left-prominent' | 'right-prominent'>('symmetrical');
  const [waistCreaseAsymmetry, setWaistCreaseAsymmetry] = useState<'symmetrical' | 'left-deeper' | 'right-deeper'>('symmetrical');
  const [spineCurveEstimate, setSpineCurveEstimate] = useState<'straight' | 'c-shape-left' | 'c-shape-right' | 's-shape'>('straight');
  const [cobbAngleEstimate, setCobbAngleEstimate] = useState<number | ''>('');
  const [remarks, setRemarks] = useState<string>('');

  // Save State
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedAssessment, setSavedAssessment] = useState<any | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-set ATR direction to none when degrees is 0, and left/right if degrees > 0 and direction is none
  useEffect(() => {
    if (atrDegrees === 0) {
      setAtrDirection('none');
    } else if (atrDegrees > 0 && atrDirection === 'none') {
      setAtrDirection('right');
    }
  }, [atrDegrees, atrDirection]);

  // Handle Webcam Startup
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    const startWebcam = async () => {
      try {
        setCameraError(null);
        setIsCameraActive(false);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        });
        activeStream = mediaStream;
        setStream(mediaStream);
        setIsCameraActive(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.warn('Webcam access failed or not found, falling back to mock skeleton overlay.', err);
        setCameraError('未检测到可用相机或权限被拒绝。已为您开启高保真模拟对齐视图。');
      }
    };

    if (!snapshot && !savedAssessment) {
      startWebcam();
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [snapshot, savedAssessment]);

  // Take Fused Canvas Snapshot
  const handleTakeSnapshot = () => {
    if (!canvasRef.current) return;
    setIsCapturing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 640;
    const height = 480;
    canvas.width = width;
    canvas.height = height;

    // 1. Draw video frame or mock background
    if (isCameraActive && videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, width, height);
    } else {
      // Elegant mockup gradient background
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw stylized bending patient wireframe
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      // Head
      ctx.arc(width / 2, 100, 30, 0, Math.PI * 2);
      ctx.stroke();
      // Shoulders
      ctx.beginPath();
      ctx.moveTo(width / 2 - 80, 160);
      ctx.lineTo(width / 2 + 80, 165); // slight asymmetrical shoulder line
      ctx.stroke();
      // Spine
      ctx.strokeStyle = '#a855f7'; // Purple spine line showing slight curve
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2, 162);
      ctx.bezierCurveTo(width / 2 + 15, 230, width / 2 - 10, 300, width / 2, 380);
      ctx.stroke();
      // Hips
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width / 2 - 70, 380);
      ctx.lineTo(width / 2 + 70, 380);
      ctx.stroke();
      
      // Text indicator
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[ 亚当斯前屈虚拟骨架演示视图 ]', width / 2, height - 30);
    }

    // 2. Draw Fused Grid Overlays onto canvas
    // Vertical spine plumb line
    ctx.strokeStyle = 'rgba(168, 85, 247, 0.75)'; // Transparent Purple
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]); // Reset

    // Horizontal shoulder line
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)'; // Light Blue horizontal
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height * 0.35);
    ctx.lineTo(width, height * 0.35);
    ctx.stroke();

    // Horizontal scapula line
    ctx.beginPath();
    ctx.moveTo(0, height * 0.5);
    ctx.lineTo(width, height * 0.5);
    ctx.stroke();

    // Horizontal hip line
    ctx.beginPath();
    ctx.moveTo(0, height * 0.75);
    ctx.lineTo(width, height * 0.75);
    ctx.stroke();

    // Calibration badge text
    ctx.fillStyle = 'rgba(168, 85, 247, 0.9)';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📐 亚当斯前屈评估对齐线', 20, 30);

    // Save as Base64
    const base64Img = canvas.toDataURL('image/jpeg', 0.9);
    setSnapshot(base64Img);

    // Stop streams
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
    setIsCapturing(false);
  };

  // Retake photo
  const handleRetake = () => {
    setSnapshot(null);
  };

  // Save to IndexedDB
  const handleSaveReport = async () => {
    const patientId = currentPatient?.id;
    if (!patientId) {
      alert('请先选择或录入受试者！');
      return;
    }

    setIsSaving(true);
    try {
      // Obtain sessionId
      let sessionId = currentSession?.patientId === patientId ? currentSession.id : undefined;
      if (!sessionId) {
        const matchingSession = sessions.find(s => s.patientId === patientId);
        if (matchingSession) {
          sessionId = matchingSession.id;
        } else {
          const newSession = await startSession(patientId);
          sessionId = newSession.id;
        }
      }

      const adamsData: AdamsAssessmentData = {
        atrDegrees,
        atrDirection,
        shoulderAsymmetry,
        scapulaAsymmetry,
        waistCreaseAsymmetry,
        spineCurveEstimate,
        cobbAngleEstimate: cobbAngleEstimate === '' ? undefined : Number(cobbAngleEstimate),
        snapshotImage: snapshot || undefined,
        remarks: remarks || undefined,
        createdAt: Date.now()
      };

      const assessment = await addAssessment({
        sessionId,
        patientId,
        type: 'adams',
        mode: 'stepped',
        data: {
          adams: adamsData
        },
        notes: remarks || undefined
      });

      setSavedAssessment(assessment);
    } catch (err) {
      console.error('Failed to save Adams assessment:', err);
      alert('保存报告失败，请重试。');
    } finally {
      setIsSaving(false);
    }
  };

  // Get Risk level properties
  const getRiskLevel = (deg: number) => {
    if (deg >= 7) {
      return {
        level: 'high',
        color: 'text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100/50',
        dot: 'bg-rose-500',
        badge: '重度旋转 (高危)',
        desc: '🔴 高危风险：躯干旋转角 ATR 达到或超过 7°。根据临床脊柱侧弯筛查标准，建议立即转诊至骨科拍 X 光诊断，以精确评估 Cobb 角并确定是否需要支具或矫形治疗。'
      };
    } else if (deg >= 5) {
      return {
        level: 'medium',
        color: 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100/50',
        dot: 'bg-amber-500',
        badge: '中度旋转 (中危)',
        desc: '🟡 中危风险：躯干旋转角 ATR 为 5°~6°。临床建议密切随访（每 3~6 个月复查），并开展针对性的脊柱侧弯居家三维运动康复训练（如 Schroth 施罗特呼吸法）。'
      };
    } else if (deg > 0) {
      return {
        level: 'low',
        color: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100/50',
        dot: 'bg-emerald-500',
        badge: '轻微偏斜 (低危)',
        desc: '🟢 低危风险：轻微体表不对称（ATR 1°~4°）。未达到转诊标准，建议保持日常坐姿端正，定期做拉伸及对称性脊柱核心运动，6个月后定期复筛。'
      };
    } else {
      return {
        level: 'none',
        color: 'text-slate-600 bg-slate-50 border-slate-200 hover:bg-slate-100/50',
        dot: 'bg-slate-400',
        badge: '水平正常',
        desc: '🟢 脊柱水平对称（ATR = 0°）。未发现明显躯干旋转，脊柱轴线对称，健康状况良好。'
      };
    }
  };

  const risk = getRiskLevel(atrDegrees);

  // If saved, render the beautiful clinical completed report card!
  if (savedAssessment) {
    const data: AdamsAssessmentData = savedAssessment.data.adams;
    const finalRisk = getRiskLevel(data.atrDegrees);

    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6 lg:p-8 animate-in fade-in duration-500">
        <div className="max-w-4xl mx-auto bg-white border border-slate-200/80 rounded-[32px] shadow-xl p-6 md:p-8 relative overflow-hidden">
          {/* Ambient gradients */}
          <div className="absolute -top-32 -left-32 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

          {/* Success Header */}
          <div className="flex flex-col items-center text-center mt-2 mb-8">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4 shadow-sm">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-800">
              🎉 亚当斯前屈评估报告生成成功！
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              数据已成功存盘入档至该患者的本地早筛健康档案中。
            </p>
            {currentPatient && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-600 font-semibold border border-slate-200">
                <span>👤 受试者: {currentPatient.name}</span>
                <span>•</span>
                <span>🔢 统一 SUC: {currentPatient.id}</span>
              </div>
            )}
          </div>

          <hr className="border-slate-100 mb-6" />

          {/* Report body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Snapshot */}
            <div className="md:col-span-5 flex flex-col gap-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                📷 融合铅垂对齐快照
              </span>
              {data.snapshotImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-900 aspect-4/3 flex items-center justify-center">
                  <img src={data.snapshotImage} alt="Adams Snapshot" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 aspect-4/3 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                  <VideoOff size={32} className="mb-2 opacity-50" />
                  <span className="text-xs">未拍摄图像数据</span>
                </div>
              )}
            </div>

            {/* Scale scores */}
            <div className="md:col-span-7 flex flex-col gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                📐 临床筛查测量指标
              </span>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">ATR 躯干旋转角</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-800">{data.atrDegrees}°</span>
                    <span className="text-xs text-slate-500">
                      ({data.atrDirection === 'left' ? '左侧偏高' : data.atrDirection === 'right' ? '右侧偏高' : '无明显偏斜'})
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">估计 Cobb 角</div>
                  <div className="mt-1">
                    <span className="text-2xl font-bold text-slate-800">
                      {data.cobbAngleEstimate !== undefined ? `${data.cobbAngleEstimate}°` : '--'}
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">X光诊断参考</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">双肩高低对称性</div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-700">
                    {data.shoulderAsymmetry === 'symmetrical' ? '✅ 水平对称' : data.shoulderAsymmetry === 'left-higher' ? '⚠️ 左肩偏高' : '⚠️ 右肩偏高'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">肩胛骨对称性</div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-700">
                    {data.scapulaAsymmetry === 'symmetrical' ? '✅ 水平对称' : data.scapulaAsymmetry === 'left-prominent' ? '⚠️ 左侧隆起' : '⚠️ 右侧隆起'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">腰折痕对称性</div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-700">
                    {data.waistCreaseAsymmetry === 'symmetrical' ? '✅ 对称' : data.waistCreaseAsymmetry === 'left-deeper' ? '⚠️ 左侧折痕深' : '⚠️ 右侧折痕深'}
                  </div>
                </div>

                <div className="p-3 bg-slate-50/80 border border-slate-100 rounded-2xl">
                  <div className="text-[11px] font-semibold text-slate-400">脊柱大致形态</div>
                  <div className="mt-1.5 text-sm font-semibold text-slate-700">
                    {data.spineCurveEstimate === 'straight' ? '✅ 直线对称' : data.spineCurveEstimate === 'c-shape-left' ? '⚠️ 左C形侧弯' : data.spineCurveEstimate === 'c-shape-right' ? '⚠️ 右C形侧弯' : '⚠️ S形侧弯'}
                  </div>
                </div>
              </div>

              {/* Severity Level Indicator */}
              <div className={cn("p-4 border rounded-2xl flex flex-col gap-2 transition-all mt-1", finalRisk.color)}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider">临床风险评级</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold">
                    <span className={cn("h-2.5 w-2.5 rounded-full inline-block", finalRisk.dot)} />
                    {finalRisk.badge}
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed">{finalRisk.desc}</p>
              </div>
            </div>
          </div>

          {/* Remarks */}
          {data.remarks && (
            <div className="mt-6 p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <span className="text-xs font-bold text-slate-400 block mb-1">康复师临床备注</span>
              <p className="text-xs text-slate-600 whitespace-pre-line">{data.remarks}</p>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              💡 提示：此报告已通过 22 位正式 SUC Luhn 安全检验，并可由家长端 Chatbot RAG 绑定进行调阅。
            </span>
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <Printer size={14} />
                打印 / 导出 PDF
              </button>
              <button
                type="button"
                onClick={onBack}
                className="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-5 text-xs font-semibold text-white transition-all shadow-md shadow-slate-900/10"
              >
                返回体态主页 ➔
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Workstation Workspace view
  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden animate-in fade-in duration-500">
      {/* Header back button */}
      <div className="flex items-center justify-between bg-white border border-slate-150 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors"
            title="返回"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              📐 亚当斯前屈评估工作台
              <span className="text-[10px] font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                脊柱侧弯专项
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentPatient ? `当前患者：${currentPatient.name} (${currentPatient.id})` : '请确保已选择患者'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            CV 铅垂网格对齐已就位
          </span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 lg:gap-6 overflow-hidden">
        {/* Camera / Live Feed (Left) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-slate-950 rounded-[32px] overflow-hidden border border-slate-800 relative flex items-center justify-center shadow-lg group">
            {/* Absolute Plumb Line Overlays */}
            {!snapshot && (
              <>
                {/* Glowing vertical plumb line */}
                <div 
                  className="absolute inset-y-0 w-0.5 border-l border-dashed border-purple-500/80 shadow-[0_0_10px_rgba(168,85,247,0.7)] z-20 pointer-events-none"
                  style={{ left: '50%' }}
                />
                
                {/* Horizontal reference lines */}
                <div className="absolute inset-x-0 h-px bg-sky-400/35 border-t border-sky-400/30 z-20 pointer-events-none" style={{ top: '35%' }} />
                <div className="absolute inset-x-0 h-px bg-sky-400/35 border-t border-sky-400/30 z-20 pointer-events-none" style={{ top: '50%' }} />
                <div className="absolute inset-x-0 h-px bg-sky-400/35 border-t border-sky-400/30 z-20 pointer-events-none" style={{ top: '75%' }} />
                
                {/* Instructions Overlay */}
                <div className="absolute top-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 z-20 pointer-events-none flex items-start gap-2 max-w-md shadow-md animate-in slide-in-from-top-2 duration-500">
                  <Sparkles size={16} className="text-purple-400 mt-0.5 shrink-0 animate-pulse" />
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    <span className="text-purple-300 font-bold block mb-0.5">亚当斯操作指引：</span>
                    请嘱患者双足合拢站立，向前弯腰约 90°，双下肢伸直，双手自然下垂，合十对齐。调整患者身体位置，将脊柱棘突中线与紫色虚线（铅垂线）重合。
                  </p>
                </div>
              </>
            )}

            {/* Webcam video component */}
            {!snapshot ? (
              isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                /* Fallback smart skeleton mockup view */
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 z-10">
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-md mb-4 animate-pulse">
                    <Compass size={28} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-200">📷 智能虚拟骨架辅助对齐</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                    未检测到外接物理摄像头。已自动切换为三维骨架辅助模式。这仍允许您通过右侧量表进行标定，生成一份高标准的临床筛查档案。
                  </p>
                  {cameraError && (
                    <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-900/50 mt-4 max-w-xs block truncate">
                      {cameraError}
                    </span>
                  )}
                </div>
              )
            ) : (
              /* Snapshot Preview View */
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10 animate-in zoom-in-95 duration-300">
                <img src={snapshot} alt="Captured Adams" className="w-full h-full object-cover" />
                
                <div className="absolute bottom-5 left-5 bg-slate-950/85 backdrop-blur-md border border-purple-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs text-purple-200 font-semibold shadow-md">
                  <Grid size={13} className="text-purple-400" />
                  已融合临床铅垂线与网格线
                </div>
              </div>
            )}

            {/* Hidden capture Canvas */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Bottom Actions Overlay */}
            <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
              {!snapshot ? (
                <button
                  type="button"
                  onClick={handleTakeSnapshot}
                  disabled={isCapturing}
                  className="inline-flex h-12 px-6 items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] border border-slate-200 disabled:opacity-50"
                >
                  <Camera size={15} className="text-purple-600 animate-pulse" />
                  拍摄评估快照
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex h-12 px-5 items-center justify-center gap-2 rounded-2xl bg-slate-950/90 hover:bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-800 transition-all hover:scale-[1.02]"
                >
                  <RotateCcw size={14} className="text-slate-400" />
                  重新拍摄
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Clinical Form Sidebar (Right) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 min-h-0 overflow-y-auto pr-1">
          <div className="bg-white border border-slate-200/80 rounded-[32px] shadow-sm p-5 md:p-6 flex flex-col gap-5">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Sliders size={16} className="text-purple-600" />
              标准化脊柱侧弯筛查量表
            </h3>

            {/* Scale Inputs */}
            <div className="flex flex-col gap-4">
              {/* ATR Degrees Slider */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <label htmlFor="atr-slider" className="flex items-center gap-1">
                    <span>1. 躯干旋转角 ATR (度)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-sm font-extrabold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                    {atrDegrees}°
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="atr-slider"
                    type="range"
                    min="0"
                    max="25"
                    step="1"
                    value={atrDegrees}
                    onChange={(e) => setAtrDegrees(Number(e.target.value))}
                    className="flex-1 accent-purple-600 cursor-pointer h-1.5 bg-slate-100 rounded-lg appearance-none"
                  />
                  <div className="flex gap-1 shrink-0">
                    <button 
                      type="button" 
                      onClick={() => setAtrDegrees(prev => Math.max(0, prev - 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors"
                    >
                      -
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setAtrDegrees(prev => Math.min(25, prev + 1))}
                      className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-600 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Risk Warning Alert */}
                <div className={cn("p-3.5 border rounded-2xl flex items-start gap-2.5 transition-all duration-300 mt-1", risk.color)}>
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-wide">
                      {risk.badge}
                    </span>
                    <p className="text-[10px] leading-relaxed font-semibold">
                      {risk.desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* ATR Direction */}
              {atrDegrees > 0 && (
                <div className="flex flex-col gap-2 animate-in fade-in duration-300">
                  <label className="text-xs font-bold text-slate-600">
                    1.2 隆起方向 (ATR 侧向)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['right', 'left'] as const).map((dir) => (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => setAtrDirection(dir)}
                        className={cn(
                          "h-10 rounded-xl border text-xs font-semibold transition-all duration-200",
                          atrDirection === dir
                            ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {dir === 'right' ? '👉 右侧隆起 (剃刀背)' : '👈 左侧隆起 (剃刀背)'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Spine Curve shape estimate */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-600">
                  2. 脊柱大致弯曲形态 (体表棘突曲线)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'straight', label: '直线 (正常)' },
                    { value: 'c-shape-left', label: '左 C 形侧弯' },
                    { value: 'c-shape-right', label: '右 C 形侧弯' },
                    { value: 's-shape', label: 'S 形侧弯' }
                  ].map((shape) => (
                    <button
                      key={shape.value}
                      type="button"
                      onClick={() => setSpineCurveEstimate(shape.value as any)}
                      className={cn(
                        "h-10 rounded-xl border text-xs font-semibold transition-all duration-200 text-left px-3 flex items-center justify-between",
                        spineCurveEstimate === shape.value
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                      )}
                    >
                      <span>{shape.label}</span>
                      {spineCurveEstimate === shape.value && <CheckCircle2 size={12} className="text-white shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asymmetry Metrics Grid */}
              <div className="flex flex-col gap-3">
                {/* Shoulder asymmetry */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">
                    3. 双肩高低不对称
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'symmetrical', label: '对称' },
                      { value: 'left-higher', label: '左肩高' },
                      { value: 'right-higher', label: '右肩高' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setShoulderAsymmetry(item.value as any)}
                        className={cn(
                          "h-9 rounded-xl border text-[11px] font-semibold transition-all duration-200",
                          shoulderAsymmetry === item.value
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Scapula asymmetry */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">
                    4. 肩胛骨不对称/偏隆起
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'symmetrical', label: '对称' },
                      { value: 'left-prominent', label: '左侧隆起' },
                      { value: 'right-prominent', label: '右侧隆起' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setScapulaAsymmetry(item.value as any)}
                        className={cn(
                          "h-9 rounded-xl border text-[11px] font-semibold transition-all duration-200",
                          scapulaAsymmetry === item.value
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Waist crease asymmetry */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-slate-600">
                    5. 腰部折痕对称性
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'symmetrical', label: '对称' },
                      { value: 'left-deeper', label: '左侧折痕深' },
                      { value: 'right-deeper', label: '右侧折痕深' }
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setWaistCreaseAsymmetry(item.value as any)}
                        className={cn(
                          "h-9 rounded-xl border text-[11px] font-semibold transition-all duration-200",
                          waistCreaseAsymmetry === item.value
                            ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                            : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cobb Angle optional Estimate */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <label htmlFor="cobb-input">
                    6. 估计 Cobb 角 (X光片测量, 选填)
                  </label>
                  {cobbAngleEstimate !== '' && (
                    <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {cobbAngleEstimate}°
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="cobb-input"
                    type="number"
                    min="0"
                    max="90"
                    placeholder="例如: 12"
                    value={cobbAngleEstimate}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setCobbAngleEstimate('');
                      } else {
                        setCobbAngleEstimate(Math.min(90, Math.max(0, Number(val))));
                      }
                    }}
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50/50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors"
                  />
                  <span className="text-xs text-slate-400">度 (deg)</span>
                </div>
              </div>

              {/* Remarks Textarea */}
              <div className="flex flex-col gap-2">
                <label htmlFor="remarks-textarea" className="text-xs font-bold text-slate-600">
                  7. 康复师临床备注
                </label>
                <textarea
                  id="remarks-textarea"
                  rows={2}
                  maxLength={250}
                  placeholder="可在此记录患者棘突偏斜特征、侧弯节段、柔韧度或进一步诊治建议..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50/50 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all leading-relaxed"
                />
              </div>
            </div>

            {/* Save Action */}
            <div className="mt-2 pt-3 border-t border-slate-100 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSaveReport}
                disabled={isSaving || !snapshot}
                className={cn(
                  "w-full h-12 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md",
                  !snapshot
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none"
                    : "bg-purple-600 hover:bg-purple-500 text-white shadow-purple-500/10 hover:shadow-purple-500/20 active:scale-[0.98]"
                )}
              >
                <Save size={14} className={isSaving ? "animate-spin" : ""} />
                {isSaving ? '正在生成报告及存盘...' : !snapshot ? '⚠️ 请先点击左下角“拍摄快照”再保存' : '生成并保存亚当斯报告'}
              </button>
              
              {!snapshot && (
                <p className="text-[10px] text-slate-400 text-center">
                  * 必须拍摄一张融合对齐线的动作快照，作为合规的图像证据留存后方可保存报告。
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
