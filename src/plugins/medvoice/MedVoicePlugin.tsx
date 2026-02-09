import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Mic, 
  MicOff, 
  Play, 
  Square, 
  FileText, 
  Save, 
  RefreshCw, 
  ClipboardCheck, 
  User, 
  History,
  MessageSquare,
  Activity,
  ChevronRight,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StructuredCase {
  '主诉'?: string;
  '现病史'?: string;
  '既往史'?: string;
  '体格检查'?: string;
  '诊断'?: string;
  '处理意见'?: string;
  'ai_suggestions'?: string;
  [key: string]: string | undefined;
}

export const MedVoicePlugin: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const isRecordingRef = useRef(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [structuredCase, setStructuredCase] = useState<StructuredCase | null>(null);
  const [activeSection, setActiveSection] = useState<string>('主诉');
  const [recordTime, setRecordTime] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 同步 ref
  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // 格式化时间
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 绘制波形
  const drawWaveform = useCallback((power: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 自动适配容器大小
    if (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight) {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // 基础圆环 (脉动效果)
    const centerX = w / 2;
    const centerY = h / 2;
    const baseRadius = Math.min(w, h) * 0.2;
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius + power * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(168, 85, 247, ${0.1 + power * 0.005})`;
    ctx.fill();

    // 内部圆
    ctx.beginPath();
    ctx.arc(centerX, centerY, (baseRadius * 0.7) + power * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(168, 85, 247, ${0.2 + power * 0.01})`;
    ctx.fill();

    // 核心点
    ctx.beginPath();
    ctx.arc(centerX, centerY, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#A855F7';
    ctx.fill();
  }, []);

  // 初始化 WebSocket
  const connectWS = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const ws = new WebSocket(`${protocol}//${host}/medvoice/ws/stream_transcribe`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'update') {
          setTranscript(data.text || '');
        } else if (data.status === 'complete') {
          setTranscript(data.text || '');
          // 自动触发结构化
          if (data.text && data.text.length > 5) {
            handleStructure(data.text);
          }
        }
      } catch (err) {
        console.error('Failed to parse WS message', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      if (isRecordingRef.current) {
        console.log('Retrying connection...');
        setTimeout(connectWS, 1000);
      }
    };

    wsRef.current = ws;
    return ws;
  }, []);

  const handleStructure = async (text?: string) => {
    const content = text || transcript;
    if (!content || content.length < 5) return;
    
    setIsProcessing(true);
    try {
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const response = await fetch(`${window.location.protocol}//${host}/medvoice/api/structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: content }),
      });
      const result = await response.json();
      if (result.status === 'success') {
        setStructuredCase(result.data.structured_case);
      }
    } catch (err) {
      console.error('Structuring failed', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);

      const ws = connectWS();

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        
        // 计算音量用于波形显示
        let sum = 0;
        for (let i = 0; i < inputData.length; i++) {
          sum += inputData[i] * inputData[i];
        }
        const rms = Math.sqrt(sum / inputData.length);
        const power = Math.min(100, rms * 500);
        drawWaveform(power);

        // 转换为 Int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(pcmData.buffer);
        }
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ command: 'stop' }));
    }

    streamRef.current?.getTracks().forEach(track => track.stop());
    audioContextRef.current?.close();
    
    setIsRecording(false);
  };

  const sections = [
    { id: '主诉', icon: MessageSquare, color: 'text-blue-500', bgColor: 'bg-blue-50' },
    { id: '现病史', icon: Activity, color: 'text-emerald-500', bgColor: 'bg-emerald-50' },
    { id: '既往史', icon: History, color: 'text-amber-500', bgColor: 'bg-amber-50' },
    { id: '体格检查', icon: ClipboardCheck, color: 'text-purple-500', bgColor: 'bg-purple-50' },
    { id: '诊断', icon: FileText, color: 'text-rose-500', bgColor: 'bg-rose-50' },
    { id: '处理意见', icon: Save, color: 'text-indigo-500', bgColor: 'bg-indigo-50' },
    { id: 'ai_suggestions', icon: Activity, color: 'text-purple-600', bgColor: 'bg-purple-50', label: 'AI 临床建议' },
  ];

  const currentSectionData = sections.find(s => s.id === activeSection);

  return (
    <div className="h-full flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header with Control Panel */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
              <Mic size={24} />
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">语音接诊助手</h1>
          </div>
          <p className="text-slate-400 font-medium flex items-center gap-2">
            <span className="w-8 h-[1px] bg-slate-200" />
            AI 驱动的实时病历结构化与智能导诊
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-2 rounded-2xl border border-white/50 shadow-sm">
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={cn(
              "group relative flex items-center gap-3 px-8 py-4 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-500 overflow-hidden",
              isRecording 
                ? "bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.3)]" 
                : "bg-antey-primary text-white shadow-lg shadow-antey-primary/20 hover:scale-105 active:scale-95"
            )}
          >
            {isRecording && (
              <span className="absolute inset-0 bg-white/20 animate-pulse-slow" />
            )}
            {isRecording ? (
              <><div className="w-2 h-2 rounded-full bg-white animate-pulse" /><Square size={16} className="relative z-10" /> 停止接诊</>
            ) : (
              <><Mic size={16} className="relative z-10 group-hover:rotate-12 transition-transform" /> 开启智能录入</>
            )}
          </button>
          
          <button 
            onClick={() => { setTranscript(''); setStructuredCase(null); }}
            className="p-4 text-slate-400 hover:text-antey-primary hover:bg-white hover:shadow-sm rounded-xl transition-all group"
            title="重置会话"
          >
            <RefreshCw size={20} className={cn("group-hover:rotate-180 transition-transform duration-700", isProcessing && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
        {/* Left: Real-time Transcript */}
        <div className="lg:col-span-5 flex flex-col gap-6 min-h-0">
          <div className="bento-card glow-border p-8 flex flex-col flex-1 min-h-0 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-purple-500/10 transition-colors" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-1.5 h-5 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
                实时对话流水
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  AI 生成 · 仅供参考
                </span>
                {isRecording && (
                  <div className="flex items-center gap-3 px-3 py-1 bg-rose-50 rounded-full border border-rose-100 animate-in fade-in zoom-in duration-500">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                      <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">{formatTime(recordTime)}</span>
                    </div>
                    <div className="w-[1px] h-3 bg-rose-200" />
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Live</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-6 relative z-10">
              {transcript ? (
                <div className="text-slate-600 leading-relaxed font-medium text-lg whitespace-pre-wrap selection:bg-purple-100">
                  {transcript}
                  {isRecording && <span className="inline-block w-1.5 h-6 ml-2 bg-purple-500 animate-caret shadow-[0_0_8px_rgba(168,85,247,0.5)]" />}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-40">
                  <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200">
                    <Mic size={32} className="stroke-[1.5px]" />
                  </div>
                  <div className="space-y-2 text-center">
                    <p className="text-sm font-black uppercase tracking-[0.2em]">就绪中</p>
                    <p className="text-[11px] font-bold opacity-60">请点击“开启智能录入”开始捕获医患对话</p>
                  </div>
                </div>
              )}
            </div>

            {/* Waveform Visualizer */}
            <div className="h-32 flex items-center justify-center mt-6 relative">
              <canvas 
                ref={canvasRef} 
                className={cn(
                  "w-full h-full transition-opacity duration-500",
                  isRecording ? "opacity-100" : "opacity-0"
                )}
              />
              {!isRecording && (
                <div className="absolute inset-0 flex items-end gap-1.5 px-6 opacity-20">
                  {[...Array(24)].map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-slate-200 rounded-t-full h-1"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Structured Medical Record */}
        <div className="lg:col-span-7 flex flex-col gap-6 min-h-0">
          <div className="bento-card p-8 flex flex-col flex-1 min-h-0 relative">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] flex items-center gap-3">
                <span className="w-1.5 h-5 bg-gradient-to-b from-antey-primary to-blue-500 rounded-full" />
                AI 自动化病历构建
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-[9px] font-bold text-slate-300 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                  AI 分析结果 · 仅供参考
                </span>
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 hover:bg-antey-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all group shadow-sm hover:shadow-lg hover:shadow-antey-primary/20">
                    <Plus size={16} className="group-hover:rotate-90 transition-transform duration-500" />
                    保存并同步
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 flex gap-10 min-h-0">
              {/* Navigation Tabs */}
              <div className="w-56 flex flex-col gap-2.5">
                {sections.map(section => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={cn(
                      "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all text-left group relative overflow-hidden",
                      activeSection === section.id 
                        ? "bg-white text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.08)] ring-1 ring-slate-100" 
                        : "text-slate-400 hover:bg-white/50 hover:text-slate-600"
                    )}
                  >
                    {activeSection === section.id && (
                      <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 rounded-r-full shadow-lg", section.color.replace('text', 'bg'))} />
                    )}
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500",
                      activeSection === section.id ? section.bgColor : "bg-slate-50 group-hover:bg-white"
                    )}>
                      <section.icon size={20} className={activeSection === section.id ? section.color : "opacity-60"} />
                    </div>
                    <span className="text-[12px] font-black uppercase tracking-widest">{section.label || section.id}</span>
                  </button>
                ))}
              </div>

              {/* Section Content */}
              <div className="flex-1 bg-slate-50/30 rounded-[2.5rem] p-10 border border-slate-200/50 overflow-y-auto custom-scrollbar relative group/content">
                {isProcessing ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-md z-20 animate-in fade-in duration-500">
                    <div className="relative w-20 h-20 mb-6">
                      <div className="absolute inset-0 border-4 border-antey-primary/10 rounded-full" />
                      <div className="absolute inset-0 border-4 border-antey-primary rounded-full border-t-transparent animate-spin" />
                      <Activity size={32} className="absolute inset-0 m-auto text-antey-primary animate-pulse" />
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">深度语义解析中...</span>
                  </div>
                ) : null}

                <div className="space-y-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", currentSectionData?.bgColor)}>
                        {currentSectionData && <currentSectionData.icon size={24} className={currentSectionData.color} />}
                      </div>
                      <h4 className="text-2xl font-black text-slate-900 tracking-tight">{currentSectionData?.label || activeSection}</h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-3 text-slate-300 hover:text-antey-primary hover:bg-white rounded-xl transition-all shadow-sm">
                        <FileText size={20} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-slate-600 font-medium leading-[2] text-xl min-h-[200px] selection:bg-antey-primary/10">
                    {structuredCase?.[activeSection] ? (
                      <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                        {structuredCase[activeSection]}
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-inner">
                          <ClipboardCheck size={28} className="opacity-20" />
                        </div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em]">等待录入解析</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Quick Info Card */}
          <div className="grid grid-cols-3 gap-6">
            {[
              { label: '患者姓名', value: '王晓明', icon: User, color: 'text-blue-500', bg: 'bg-blue-50' },
              { label: '就诊类型', value: '初次评估', icon: Activity, color: 'text-teal-500', bg: 'bg-teal-50' },
              { label: '预约编号', value: '#REF-20240209', icon: ClipboardCheck, color: 'text-indigo-500', bg: 'bg-indigo-50' }
            ].map((item, i) => (
              <div key={i} className="bento-card p-6 flex items-center gap-5 group hover:translate-y-[-4px] transition-all duration-500">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500", item.bg, item.color)}>
                  <item.icon size={28} />
                </div>
                <div>
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{item.label}</div>
                  <div className="text-xl font-black text-slate-900 tracking-tight group-hover:text-antey-primary transition-colors">{item.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const Calendar: React.FC<{ size?: number, className?: string }> = ({ size = 20, className }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
    <line x1="16" y1="2" x2="16" y2="6"></line>
    <line x1="8" y1="2" x2="8" y2="6"></line>
    <line x1="3" y1="10" x2="21" y2="10"></line>
  </svg>
);

export default MedVoicePlugin;
