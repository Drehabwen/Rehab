import React, { useState } from 'react';
import { CheckCircle, Loader2, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VisitTaskSummary } from '../../workflow';

interface CompleteSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitTask: VisitTaskSummary;
  onConfirm: (notes: string, isBaseline: boolean) => Promise<void>;
}

const chatbotSteps = [
  "正在结构化多维评定指标与数据归档...",
  "正在编排家属版居家康复任务与安全指南...",
  "处方打包完成，正在注入 AI 居家教练（Chatbot）大脑 🧠...",
  "下发成功！AI 居家主动催促与每周报告反馈机制已启动。"
];

export const CompleteSessionModal: React.FC<CompleteSessionModalProps> = ({
  isOpen,
  onClose,
  visitTask,
  onConfirm,
}) => {
  const [therapistNotes, setTherapistNotes] = useState('');
  const [isBaselineChecked, setIsBaselineChecked] = useState(false);
  const [isPushingToChatbot, setIsPushingToChatbot] = useState(false);
  const [chatbotPushStep, setChatbotPushStep] = useState(0);

  if (!isOpen) return null;

  const handleConfirmComplete = async () => {
    setIsPushingToChatbot(true);
    setChatbotPushStep(0);

    // Dynamic multi-agent command flow simulation
    const interval = setInterval(() => {
      setChatbotPushStep((prev) => {
        if (prev < chatbotSteps.length - 1) {
          return prev + 1;
        }
        clearInterval(interval);
        return prev;
      });
    }, 1200);

    // Finalize state write & redirect
    setTimeout(async () => {
      clearInterval(interval);
      try {
        await onConfirm(therapistNotes, isBaselineChecked);
      } catch (err) {
        console.error('Failed to complete session:', err);
      } finally {
        setIsPushingToChatbot(false);
        onClose();
      }
    }, 5000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/40 bg-white/90 p-6 shadow-2xl backdrop-blur-md animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={20} />
            完成本次康复评定
          </h3>
          {!isPushingToChatbot && (
            <button 
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Content */}
        {!isPushingToChatbot ? (
          <div className="space-y-4 py-4">
            
            {/* Modules Summary */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">本次评定完成项</div>
              <div className="grid grid-cols-2 gap-2">
                {visitTask.modules.map(mod => {
                  const done = mod.status === 'completed';
                  return (
                    <div key={mod.toolId} className="flex items-center gap-2 text-xs text-slate-700 bg-white rounded-xl px-3 py-2 border border-slate-100 shadow-sm">
                      <div className={cn("w-2 h-2 rounded-full", done ? "bg-emerald-500" : "bg-slate-300")} />
                      <span className={cn(done ? "font-medium" : "text-slate-400")}>{mod.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Therapist notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>康复师临床备注与工作总结</span>
                <span className="text-[10px] text-amber-500 font-medium normal-case">该评语将融入家属处方，增加温情</span>
              </label>
              <textarea
                value={therapistNotes}
                onChange={(e) => setTherapistNotes(e.target.value)}
                placeholder="请输入本次评估中做的主要工作与临床观察（例如：完成了日常生活能力MBI评定与ROM评估，发现患者左下肢负重轻微受限，已嘱咐家属注意陪同并进行手部捏球游戏...）"
                className="w-full h-28 rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder-slate-400 focus:border-emerald-500 focus:outline-none transition-all"
              />
            </div>

            {/* Baseline Option */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-amber-500 animate-pulse" />
                  设为阶段性对比基线
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  开启后，本次接诊指标将作为本阶段的“里程碑基线”，供后续随访评估在『进度对比』中进行高精度成效追踪。
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={isBaselineChecked}
                  onChange={(e) => setIsBaselineChecked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button 
                onClick={onClose}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl justify-center py-2.5 font-medium text-sm transition"
              >
                取消
              </button>
              <button 
                onClick={handleConfirmComplete}
                className="flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg py-2.5 font-medium text-sm transition"
              >
                确认完成并下发
              </button>
            </div>

          </div>
        ) : (
          /* Agent Simulation View */
          <div className="py-8 text-center space-y-6 animate-in fade-in duration-300">
            <div className="relative flex justify-center">
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-amber-500 animate-ping opacity-60" size={32} />
              </div>
              <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 shadow-inner">
                <Loader2 className="animate-spin" size={28} />
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-base font-semibold text-slate-900">正在协同 AI 居家教练...</h4>
              <p className="text-xs text-slate-400">正在打包您的临床诊断备注并为家属制定运动处方</p>
            </div>

            {/* Step List */}
            <div className="max-w-md mx-auto text-left rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
              {chatbotSteps.map((step, idx) => {
                const isDone = idx < chatbotPushStep;
                const isCurrent = idx === chatbotPushStep;
                return (
                  <div key={idx} className="flex items-start gap-2.5 text-xs">
                    <div className="mt-0.5 flex h-4.5 w-4.5 items-center justify-center">
                      {isDone ? (
                        <CheckCircle size={14} className="text-emerald-500 animate-in zoom-in" />
                      ) : isCurrent ? (
                        <Loader2 size={12} className="animate-spin text-emerald-600" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-slate-200" />
                      )}
                    </div>
                    <span className={cn(
                      isDone ? "text-slate-500 line-through decoration-slate-200" : isCurrent ? "text-slate-900 font-medium" : "text-slate-400"
                    )}>
                      {step}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
