import React, { useState } from 'react';
import { generateCanonicalPatientId, generateShortCode, usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';

interface NewVisitScreenProps {
  onStarted: (patientId: string, sessionId: string) => void;
  onCancel: () => void;
}

/** 屏 2：新建接诊（姓名可选，RehabID 自动生成；姓名仅存本机） */
export const NewVisitScreen: React.FC<NewVisitScreenProps> = ({ onStarted, onCancel }) => {
  const addPatient = usePatientStore((state) => state.addPatient);
  const startSession = useSessionStore((state) => state.startSession);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'female' | 'male' | ''>('');
  const [age, setAge] = useState('');
  const [shortCode] = useState(() => generateShortCode());
  const [patientId] = useState(() => generateCanonicalPatientId());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setSaving(true);
    setError(null);
    try {
      const patient = await addPatient(name.trim() || undefined, patientId, shortCode);
      const session = await startSession(patient.id);
      onStarted(patient.id, session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建接诊失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <section className="rounded-2xl border border-slate-200 p-3">
        <label className="block text-[11px] text-slate-500" htmlFor="patient-name">患者姓名（可选，不上传）</label>
        <input
          id="patient-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：王"
          className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-[15px] outline-none focus:border-[#0f9b8e]"
        />
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="text-[11px] text-slate-500">基础信息</div>
        <div className="mt-2 flex gap-2">
          {([['female', '女'], ['male', '男']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setGender(value)}
              className={`h-9 flex-1 rounded-xl border text-sm ${gender === value ? 'border-[#0f9b8e] bg-[#0f9b8e]/10 font-bold text-[#0f9b8e]' : 'border-slate-200 text-slate-600'}`}
            >
              {label}
            </button>
          ))}
          <input
            value={age}
            onChange={(event) => setAge(event.target.value.replace(/\D/g, '').slice(0, 3))}
            placeholder="年龄"
            inputMode="numeric"
            className="h-9 w-20 rounded-xl border border-slate-200 px-2 text-center text-sm outline-none focus:border-[#0f9b8e]"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="text-slate-500">系统编号</span>
          <span className="font-mono text-slate-700">{patientId}</span>
        </div>
        <div className="mt-1 text-[10.5px] text-slate-400">自动生成，用于科研数据对齐；姓名仅存本机</div>
        <div className="mt-2 flex items-center justify-between text-[11.5px]">
          <span className="text-slate-500">公开档案号</span>
          <span className="font-mono font-bold tracking-[0.2em] text-slate-800">{shortCode}</span>
        </div>
      </section>

      {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">{error}</div> : null}

      <div className="mt-auto space-y-2">
        <button
          onClick={handleConfirm}
          disabled={saving}
          className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white disabled:opacity-60"
        >
          {saving ? '创建中…' : '确认并开始接诊 →'}
        </button>
        <button onClick={onCancel} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
          取消
        </button>
      </div>
    </div>
  );
};
