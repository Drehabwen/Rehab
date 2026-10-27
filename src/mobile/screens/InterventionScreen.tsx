import React, { useMemo, useState } from 'react';
import { useSessionStore } from '@/store/useSessionStore';

const THERAPIES = ['运动疗法', '手法治疗', '关节松动', '物理因子', '核心训练', '步态训练', '家庭训练'];
const FREQUENCIES = ['每周 1 次', '每周 2 次', '每周 3 次', '每天'];
const DURATIONS = ['20 分钟', '30 分钟', '45 分钟', '60 分钟'];
const ADHERENCE = [['good', '依从性好'], ['fair', '一般'], ['poor', '依从性差']] as const;

interface InterventionScreenProps {
  sessionId: string;
  onSaved: (followUpAt: string, enrollable: boolean) => void;
  onBack: () => void;
}

/**
 * 干预记录屏（P0 数据缺口）：
 * 没有"做了什么治疗"，就无法评估疗效。30 秒内完成，随接诊一起落库到 session.notes。
 */
export const InterventionScreen: React.FC<InterventionScreenProps> = ({ sessionId, onSaved, onBack }) => {
  const updateSession = useSessionStore((state) => state.updateSession);
  const [therapies, setTherapies] = useState<string[]>([]);
  const [frequency, setFrequency] = useState(FREQUENCIES[1]);
  const [duration, setDuration] = useState(DURATIONS[1]);
  const [adherence, setAdherence] = useState<'good' | 'fair' | 'poor'>('good');
  const [adverse, setAdverse] = useState<'none' | 'yes'>('none');
  const [adverseNote, setAdverseNote] = useState('');
  const [consent, setConsent] = useState(false);
  const [followUpDays, setFollowUpDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const followUpAt = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + followUpDays);
    return date.toISOString().slice(0, 10);
  }, [followUpDays]);

  const toggleTherapy = (item: string) => {
    setTherapies((current) => (current.includes(item) ? current.filter((value) => value !== item) : [...current, item]));
  };

  const handleSave = async () => {
    if (therapies.length === 0) { setError('请至少选择 1 项治疗内容'); return; }
    if (adverse === 'yes' && adverseNote.trim().length === 0) { setError('出现不良事件时请填写简述'); return; }
    setError(null);
    setSaving(true);
    try {
      const payload = {
        mobileIntervention: {
          therapies,
          frequency,
          duration,
          adherence,
          adverse: adverse === 'yes' ? adverseNote.trim() : null,
          consent,
          followUpAt,
          recordedAt: Date.now(),
        },
      };
      await updateSession(sessionId, { notes: JSON.stringify(payload) });
      onSaved(followUpAt, consent);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存干预记录失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="text-[13.5px] font-bold text-slate-900">本次干预内容</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {THERAPIES.map((item) => {
            const on = therapies.includes(item);
            return (
              <button
                key={item}
                onClick={() => toggleTherapy(item)}
                className={`rounded-full border px-3 py-1.5 text-[11.5px] ${on ? 'border-[#0f9b8e] bg-[#0f9b8e]/10 font-semibold text-[#0f9b8e]' : 'border-slate-200 text-slate-600'}`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="text-[10.5px] tracking-wider text-slate-400">频次</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {FREQUENCIES.map((item) => (
            <button key={item} onClick={() => setFrequency(item)} className={`rounded-lg border px-2.5 py-1.5 text-[11.5px] ${frequency === item ? 'border-[#0f9b8e] font-semibold text-[#0f9b8e]' : 'border-slate-200 text-slate-600'}`}>{item}</button>
          ))}
        </div>
        <div className="mt-3 text-[10.5px] tracking-wider text-slate-400">单次时长</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {DURATIONS.map((item) => (
            <button key={item} onClick={() => setDuration(item)} className={`rounded-lg border px-2.5 py-1.5 text-[11.5px] ${duration === item ? 'border-[#0f9b8e] font-semibold text-[#0f9b8e]' : 'border-slate-200 text-slate-600'}`}>{item}</button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="text-[10.5px] tracking-wider text-slate-400">依从性</div>
        <div className="mt-2 flex gap-2">
          {ADHERENCE.map(([value, label]) => (
            <button key={value} onClick={() => setAdherence(value)} className={`flex-1 rounded-lg border py-1.5 text-[11.5px] ${adherence === value ? 'border-[#0f9b8e] font-semibold text-[#0f9b8e]' : 'border-slate-200 text-slate-600'}`}>{label}</button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] text-slate-600">不良事件</span>
          <div className="flex gap-2">
            <button onClick={() => setAdverse('none')} className={`rounded-lg border px-2.5 py-1 text-[11.5px] ${adverse === 'none' ? 'border-[#0f9b8e] font-semibold text-[#0f9b8e]' : 'border-slate-200 text-slate-600'}`}>无</button>
            <button onClick={() => setAdverse('yes')} className={`rounded-lg border px-2.5 py-1 text-[11.5px] ${adverse === 'yes' ? 'border-rose-400 font-semibold text-rose-600' : 'border-slate-200 text-slate-600'}`}>有</button>
          </div>
        </div>
        {adverse === 'yes' ? (
          <input
            value={adverseNote}
            onChange={(event) => setAdverseNote(event.target.value)}
            placeholder="简述（如：训练后短暂疼痛加重）"
            className="mt-2 h-9 w-full rounded-lg border border-slate-200 px-2 text-[11.5px] outline-none focus:border-[#0f9b8e]"
          />
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between text-[11.5px]">
          <span className="text-slate-600">下次复评</span>
          <div className="flex gap-2">
            {[7, 14, 30].map((days) => (
              <button key={days} onClick={() => setFollowUpDays(days)} className={`rounded-lg border px-2 py-1 text-[11px] ${followUpDays === days ? 'border-[#0f9b8e] font-semibold text-[#0f9b8e]' : 'border-slate-200 text-slate-500'}`}>{days} 天</button>
            ))}
          </div>
        </div>
        <div className="mt-1 text-[10.5px] text-slate-400">预计复评日期：{followUpAt}</div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-3">
        <label className="flex items-center justify-between text-[11.5px] text-slate-600">
          <span>已告知患者，同意用于科研（去标识）</span>
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="h-4 w-4 accent-[#0f9b8e]" />
        </label>
      </section>

      {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">{error}</div> : null}

      <div className="mt-auto space-y-2 pt-2">
        <button onClick={handleSave} disabled={saving} className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white disabled:opacity-60">
          {saving ? '保存中…' : '保存干预记录 →'}
        </button>
        <button onClick={onBack} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">返回</button>
      </div>
    </div>
  );
};
