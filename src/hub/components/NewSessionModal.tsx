import React, { useEffect, useState } from 'react';
import { CheckCircle, RefreshCw, Stethoscope, User, X } from 'lucide-react';
import { generateCanonicalPatientId, usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { cn } from '@/lib/utils';

interface NewSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (patientId: string) => void;
}

export const NewSessionModal: React.FC<NewSessionModalProps> = ({ isOpen, onClose, onStartSession }) => {
  const [name, setName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const addPatient = usePatientStore((state) => state.addPatient);
  const startSession = useSessionStore((state) => state.startSession);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    generateNewId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const generateNewId = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setPatientId(generateCanonicalPatientId());
      setIsGenerating(false);
    }, 200);
  };

  const handleConfirm = async () => {
    if (!patientId) return;

    setIsCreating(true);
    try {
      const patient = await addPatient(name.trim() || undefined, patientId);
      await startSession(patient.id);
      onStartSession(patient.id);
      onClose();
    } catch (error) {
      console.error('Failed to create patient/session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="dialog-backdrop" onClick={onClose} />

      <div className="dialog-shell max-w-xl">
        <div className="dialog-header">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-antey-primary/10 text-antey-primary flex items-center justify-center">
              <Stethoscope size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">新建患者接诊</h2>
              <p className="text-xs text-slate-500 mt-1">创建患者后自动开启本次接诊</p>
            </div>
          </div>

          <button onClick={onClose} className="btn-icon" aria-label="close">
            <X size={14} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 inline-flex items-center gap-1.5">
              <User size={14} />
              患者姓名（可选）
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：张三"
              className="mt-2 w-full h-10 px-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:border-antey-primary"
            />
          </label>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">患者编号</span>
              <button onClick={generateNewId} disabled={isGenerating} className="btn-secondary h-8 px-3 text-xs">
                <RefreshCw size={12} className={cn(isGenerating && 'animate-spin')} />
                刷新编号
              </button>
            </div>

            <div className="mt-2 p-4 rounded-xl bg-slate-900 text-white border border-slate-700">
              <div className="text-lg font-mono font-semibold tracking-tight break-all">{patientId || '--'}</div>
              <div className="mt-1 text-xs text-slate-400">患者唯一编号，用于全系统身份标识</div>
            </div>
          </div>
        </div>

        <div className="dialog-footer">
          <button onClick={onClose} className="btn-secondary">取消</button>
          <button onClick={handleConfirm} disabled={isCreating || isGenerating} className={cn('btn-primary', (isCreating || isGenerating) && 'opacity-50 cursor-not-allowed')}>
            {isCreating ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle size={14} />}
            {isCreating ? '创建中...' : '确认接诊'}
          </button>
        </div>
      </div>
    </div>
  );
};
