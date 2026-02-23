import React, { useState, useEffect } from 'react';
import { X, User, RefreshCw, CheckCircle, Stethoscope } from 'lucide-react';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { generatePatientId } from '@/lib/session-utils';
import { cn } from '@/lib/utils';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (sessionId: string) => void;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({ isOpen, onClose, onStartSession }) => {
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  const addPatient = usePatientStore(state => state.addPatient);
  const startSession = useSessionStore(state => state.startSession);

  useEffect(() => {
    if (isOpen) {
      generateNewId();
      setName('');
    }
  }, [isOpen]);

  const generateNewId = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setPatientId(generatePatientId());
      setIsGenerating(false);
    }, 300);
  };

  const handleConfirm = async () => {
    setIsCreating(true);
    try {
      const patient = await addPatient(name.trim() || undefined);
      const session = await startSession(patient.id);
      onStartSession(session.id);
      onClose();
    } catch (error) {
      console.error('Failed to create session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full max-w-lg animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-antey-primary/10 flex items-center justify-center">
              <Stethoscope className="text-antey-primary" size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">接诊新患者</h2>
              <p className="text-slate-400 font-medium text-sm">创建新的接诊记录</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-slate-100 rounded-2xl transition-all group"
          >
            <X size={20} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-4">
            <label className="block">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <User size={14} />
                患者姓名（可选）
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="请输入患者姓名"
                className="mt-3 w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-antey-primary/10 focus:border-antey-primary/30 transition-all"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                患者编号
              </span>
              <button
                onClick={generateNewId}
                disabled={isGenerating}
                className="flex items-center gap-2 px-4 py-2 text-slate-400 hover:text-antey-primary hover:bg-antey-primary/5 rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCw size={14} className={cn(isGenerating && "animate-spin")} />
                <span className="text-[10px] font-black uppercase tracking-widest">刷新</span>
              </button>
            </div>
            
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-antey-primary/20 to-blue-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 border border-slate-700 shadow-2xl">
                <div className="text-center">
                  <div className="text-[56px] font-black tracking-[0.4em] text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-antey-primary to-blue-400">
                    {patientId}
                  </div>
                  <p className="mt-4 text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                    请告知患者此编号
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 flex items-center gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:bg-slate-200 transition-all"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isCreating || isGenerating}
            className="flex-1 px-8 py-4 bg-gradient-to-r from-antey-primary to-teal-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl hover:shadow-lg hover:shadow-antey-primary/30 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                创建中...
              </>
            ) : (
              <>
                <CheckCircle size={18} />
                确认接诊
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
