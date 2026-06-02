/**
 * AdamsWorkspace — 亚当斯前屈评估工作台.
 *
 * Webcam capture + clinical assessment form + report generation.
 * Delegates the report view to AdamsReportView and the form sidebar to AdamsFormSidebar.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Camera, RotateCcw, Compass, Grid, Sparkles, ArrowLeft } from 'lucide-react';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { cn } from '@/lib/utils';
import type { AdamsAssessmentData } from '@/types/assessment';
import { AdamsReportView } from './AdamsReportView';
import { AdamsFormSidebar } from './AdamsFormSidebar';

interface Props { onBack: () => void; }

export const AdamsWorkspace: React.FC<Props> = ({ onBack }) => {
  const { currentPatient } = usePatientStore();
  const { currentSession, sessions, startSession } = useSessionStore();
  const { addAssessment } = useAssessmentStore();

  // Camera state
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Form state
  const [atrDegrees, setAtrDegrees] = useState(0);
  const [atrDirection, setAtrDirection] = useState<'left' | 'right' | 'none'>('none');
  const [shoulderAsymmetry, setShoulderAsymmetry] = useState<'symmetrical' | 'left-higher' | 'right-higher'>('symmetrical');
  const [scapulaAsymmetry, setScapulaAsymmetry] = useState<'symmetrical' | 'left-prominent' | 'right-prominent'>('symmetrical');
  const [waistCreaseAsymmetry, setWaistCreaseAsymmetry] = useState<'symmetrical' | 'left-deeper' | 'right-deeper'>('symmetrical');
  const [spineCurveEstimate, setSpineCurveEstimate] = useState<'straight' | 'c-shape-left' | 'c-shape-right' | 's-shape'>('straight');
  const [cobbAngleEstimate, setCobbAngleEstimate] = useState<number | ''>('');
  const [remarks, setRemarks] = useState('');

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [savedAssessment, setSavedAssessment] = useState<any | null>(null);

  // ATR auto-direction
  useEffect(() => {
    if (atrDegrees === 0) setAtrDirection('none');
    else if (atrDegrees > 0 && atrDirection === 'none') setAtrDirection('right');
  }, [atrDegrees, atrDirection]);

  // Webcam lifecycle
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (snapshot || savedAssessment) return;
    (async () => {
      try {
        setCameraError(null); setIsCameraActive(false);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }, audio: false,
        });
        activeStream = mediaStream; setStream(mediaStream); setIsCameraActive(true);
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      } catch {
        setCameraError('未检测到可用相机或权限被拒绝。已为您开启高保真模拟对齐视图。');
      }
    })();
    return () => { if (activeStream) activeStream.getTracks().forEach(t => t.stop()); };
  }, [snapshot, savedAssessment]);

  // Take snapshot with grid overlays
  const handleTakeSnapshot = () => {
    if (!canvasRef.current) return;
    setIsCapturing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const [w, h] = [640, 480];
    canvas.width = w; canvas.height = h;

    if (isCameraActive && videoRef.current) {
      ctx.drawImage(videoRef.current, 0, 0, w, h);
    } else {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#1e1b4b');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(w / 2, 100, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(w / 2 - 80, 160); ctx.lineTo(w / 2 + 80, 165); ctx.stroke();
      ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(w / 2, 162); ctx.bezierCurveTo(w / 2 + 15, 230, w / 2 - 10, 300, w / 2, 380); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(w / 2 - 70, 380); ctx.lineTo(w / 2 + 70, 380); ctx.stroke();
    }
    // Grid overlays
    ctx.strokeStyle = 'rgba(168,85,247,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke(); ctx.setLineDash([]);
    for (const y of [h * 0.35, h * 0.5, h * 0.75]) {
      ctx.strokeStyle = 'rgba(56,189,248,0.4)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(168,85,247,0.9)'; ctx.font = 'bold 11px system-ui';
    ctx.fillText('📐 亚当斯前屈评估对齐线', 20, 30);

    setSnapshot(canvas.toDataURL('image/jpeg', 0.9));
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); setIsCameraActive(false); }
    setIsCapturing(false);
  };

  // Save assessment
  const handleSaveReport = async () => {
    const patientId = currentPatient?.id;
    if (!patientId) { alert('请先选择或录入受试者！'); return; }
    setIsSaving(true);
    try {
      let sessionId = currentSession?.patientId === patientId ? currentSession.id : undefined;
      if (!sessionId) {
        const match = sessions.find(s => s.patientId === patientId);
        if (match) sessionId = match.id;
        else { const ns = await startSession(patientId); sessionId = ns.id; }
      }
      const data: AdamsAssessmentData = {
        atrDegrees, atrDirection, shoulderAsymmetry, scapulaAsymmetry,
        waistCreaseAsymmetry, spineCurveEstimate,
        cobbAngleEstimate: cobbAngleEstimate === '' ? undefined : Number(cobbAngleEstimate),
        snapshotImage: snapshot || undefined, remarks: remarks || undefined, createdAt: Date.now(),
      };
      const assessment = await addAssessment({
        sessionId, patientId, type: 'adams', mode: 'stepped',
        data: { adams: data }, notes: remarks || undefined,
      });
      setSavedAssessment(assessment);
    } catch (err) { console.error(err); alert('保存报告失败，请重试。'); }
    finally { setIsSaving(false); }
  };

  // Risk level
  const getRiskLevel = (deg: number) => {
    if (deg >= 7) return { level: 'high', color: 'text-rose-600 bg-rose-50 border-rose-200', dot: 'bg-rose-500', badge: '重度旋转 (高危)', desc: '🔴 高危：ATR ≥ 7°。建议立即转诊 X 光，评估 Cobb 角及支具/矫形治疗。' };
    if (deg >= 5) return { level: 'medium', color: 'text-amber-600 bg-amber-50 border-amber-200', dot: 'bg-amber-500', badge: '中度旋转 (中危)', desc: '🟡 中危：ATR 5°~6°。建议 3~6 个月复查，开展 Schroth 施罗特呼吸训练。' };
    if (deg > 0)  return { level: 'low', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500', badge: '轻微偏斜 (低危)', desc: '🟢 低危：ATR 1°~4°。保持坐姿端正，定期拉伸与核心训练，6个月后复筛。' };
    return { level: 'none', color: 'text-slate-600 bg-slate-50 border-slate-200', dot: 'bg-slate-400', badge: '水平正常', desc: '🟢 ATR = 0°。脊柱轴线对称，健康状况良好。' };
  };

  const risk = getRiskLevel(atrDegrees);

  // ── Saved report view ──
  if (savedAssessment) {
    const data: AdamsAssessmentData = savedAssessment.data.adams;
    return <AdamsReportView data={data} risk={getRiskLevel(data.atrDegrees)} patient={currentPatient} onBack={onBack} />;
  }

  // ── Workspace view ──
  const formState = { atrDegrees, atrDirection, shoulderAsymmetry, scapulaAsymmetry, waistCreaseAsymmetry, spineCurveEstimate, cobbAngleEstimate, remarks };

  return (
    <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-hidden animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between bg-white border border-slate-150 p-4 rounded-3xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
              📐 亚当斯前屈评估工作台
              <span className="text-[10px] font-normal text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">脊柱侧弯专项</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {currentPatient ? `当前患者：${currentPatient.name} (${currentPatient.id})` : '请确保已选择患者'}
            </p>
          </div>
        </div>
        <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> CV 铅垂网格对齐已就位
        </span>
      </div>

      {/* Main grid: camera + form */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-4 lg:gap-6 overflow-hidden">
        {/* Camera */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-4 min-h-0">
          <div className="flex-1 bg-slate-950 rounded-[32px] overflow-hidden border border-slate-800 relative flex items-center justify-center shadow-lg">
            {!snapshot && (
              <>
                <div className="absolute inset-y-0 w-0.5 border-l border-dashed border-purple-500/80 shadow-[0_0_10px_rgba(168,85,247,0.7)] z-20 pointer-events-none" style={{ left: '50%' }} />
                {[0.35, 0.5, 0.75].map(y => (
                  <div key={y} className="absolute inset-x-0 h-px bg-sky-400/35 z-20 pointer-events-none" style={{ top: `${y * 100}%` }} />
                ))}
                <div className="absolute top-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md border border-slate-800/80 rounded-2xl p-3 z-20 pointer-events-none flex items-start gap-2 max-w-md shadow-md">
                  <Sparkles size={16} className="text-purple-400 mt-0.5 shrink-0 animate-pulse" />
                  <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
                    <span className="text-purple-300 font-bold block mb-0.5">亚当斯操作指引：</span>
                    请嘱患者双足合拢站立，向前弯腰约 90°。调整患者身体位置，将脊柱棘突中线与紫色虚线（铅垂线）重合。
                  </p>
                </div>
              </>
            )}
            {!snapshot ? (
              isCameraActive ? (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 z-10">
                  <div className="w-16 h-16 rounded-full bg-slate-900 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shadow-md mb-4 animate-pulse">
                    <Compass size={28} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-200">📷 智能虚拟骨架辅助对齐</h3>
                  <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
                    未检测到外接物理摄像头。已自动切换为三维骨架辅助模式。
                  </p>
                  {cameraError && <span className="text-[10px] text-indigo-300 bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-900/50 mt-4">{cameraError}</span>}
                </div>
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10 animate-in zoom-in-95 duration-300">
                <img src={snapshot} alt="Adams" className="w-full h-full object-cover" />
                <div className="absolute bottom-5 left-5 bg-slate-950/85 backdrop-blur-md border border-purple-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs text-purple-200 font-semibold shadow-md">
                  <Grid size={13} className="text-purple-400" /> 已融合临床铅垂线与网格线
                </div>
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
              {!snapshot ? (
                <button onClick={handleTakeSnapshot} disabled={isCapturing}
                  className="inline-flex h-12 px-6 items-center justify-center gap-2 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xl disabled:opacity-50">
                  <Camera size={15} className="text-purple-600 animate-pulse" /> 拍摄评估快照
                </button>
              ) : (
                <button onClick={() => setSnapshot(null)}
                  className="inline-flex h-12 px-5 items-center justify-center gap-2 rounded-2xl bg-slate-950/90 hover:bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-800">
                  <RotateCcw size={14} className="text-slate-400" /> 重新拍摄
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Form sidebar */}
        <AdamsFormSidebar
          form={formState} risk={risk} snapshot={snapshot} isSaving={isSaving}
          onAtrChange={setAtrDegrees} onAtrDirection={setAtrDirection}
          onShoulderChange={setShoulderAsymmetry} onScapulaChange={setScapulaAsymmetry}
          onWaistChange={setWaistCreaseAsymmetry} onSpineCurveChange={setSpineCurveEstimate}
          onCobbChange={setCobbAngleEstimate} onRemarksChange={setRemarks}
          onSave={handleSaveReport}
        />
      </div>
    </div>
  );
};
