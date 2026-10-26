import React, { useMemo, useState } from 'react';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import type { ScaleAnswer } from '@/types/assessment';

const ITEMS = [
  '疼痛程度（今天）',
  '行走能力',
  '自理能力（穿衣/洗漱）',
  '提重物',
  '站立时间',
  '睡眠影响',
  '社交活动',
  '出行距离',
  '家务能力',
  '工作/日常活动',
];

interface ScaleScreenProps {
  patientId: string;
  sessionId: string;
  previousScores?: number[];
  onSaved: (total: number) => void;
  onBack: () => void;
}

const categoryOf = (index: number): ScaleAnswer['category'] => {
  if (index === 0) return 'pain';
  if (index === 5) return 'mental_health';
  if (index === 6) return 'satisfaction';
  return 'function';
};

/** 屏 4：量表（点选式，上次值虚线提示，必填校验，实时总分） */
export const ScaleScreen: React.FC<ScaleScreenProps> = ({ patientId, sessionId, previousScores, onSaved, onBack }) => {
  const addAssessment = useAssessmentStore((state) => state.addAssessment);
  const [scores, setScores] = useState<Array<number | null>>(() => ITEMS.map(() => null));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = scores.filter((score) => score !== null).length;
  const total = useMemo(() => scores.reduce<number>((sum, score) => sum + (score ?? 0), 0) * 2, [scores]);
  const previousTotal = previousScores?.length ? previousScores.reduce((a, b) => a + b, 0) * 2 : null;
  const missing = ITEMS.map((label, index) => ({ label, index })).filter((item) => scores[item.index] === null);

  const handleSave = async () => {
    if (missing.length > 0) {
      setError(`还有 ${missing.length} 项未填写：${missing[0].label} 等为必填项`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const answers: ScaleAnswer[] = scores.map((value, index) => ({
        questionId: index + 1,
        questionText: ITEMS[index],
        category: categoryOf(index),
        score: value ?? 0,
        answerText: String(value ?? 0),
      }));
      await addAssessment({
        sessionId,
        patientId,
        type: 'scale',
        mode: 'stepped',
        data: {
          scale: {
            scaleId: 'ODI',
            scaleName: 'ODI 功能障碍指数',
            filledBy: 'therapist',
            totalScore: total,
            maxScore: 100,
            percentageScore: total,
            dimensions: {
              functionActive: scores.slice(1, 5).reduce<number>((sum, value) => sum + (value ?? 0), 0) * 2,
              pain: (scores[0] ?? 0) * 2,
              selfImage: 0,
              mentalHealth: (scores[5] ?? 0) * 2,
            },
            answers,
            createdAt: Date.now(),
          },
        },
      });
      onSaved(total);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存评估失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold text-slate-900">量表 · ODI</span>
          <span className="text-[11.5px] text-slate-500">{answered}/{ITEMS.length}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded bg-slate-100">
          <div className="h-full bg-[#0f9b8e]" style={{ width: `${(answered / ITEMS.length) * 100}%` }} />
        </div>
        {previousTotal !== null ? <div className="mt-1 text-[10.5px] text-slate-400">上次 {previousTotal} 分 · 虚线为上次值</div> : null}
      </section>

      {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">{error}</div> : null}

      <div className="flex-1 space-y-1 overflow-y-auto pr-1">
        {ITEMS.map((label, index) => {
          const value = scores[index];
          const isMissing = error !== null && value === null;
          return (
            <div key={label} className={`rounded-xl px-2 py-2 ${isMissing ? 'bg-rose-50' : ''}`}>
              <div className="mb-1.5 text-[12.5px] text-slate-800">{index + 1}. {label}</div>
              <div className="flex gap-1.5">
                {[0, 1, 2, 3, 4, 5].map((point) => {
                  const isPrev = previousScores?.[index] === point;
                  const isOn = value === point;
                  return (
                    <button
                      key={point}
                      onClick={() => setScores((current) => current.map((item, i) => (i === index ? point : item)))}
                      aria-label={`${label} ${point} 分`}
                      className={[
                        'h-8 w-8 rounded-lg border text-[11.5px]',
                        isOn ? 'border-[#0f9b8e] bg-[#0f9b8e] font-bold text-white' : 'border-slate-200 text-slate-500',
                        !isOn && isPrev ? 'border-dashed' : '',
                      ].join(' ')}
                    >
                      {point}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl bg-slate-50 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11.5px] text-slate-500">实时总分</span>
          <span className="text-[20px] font-bold text-[#0f9b8e]">{total} / 100</span>
        </div>
      </section>

      <div className="space-y-2">
        <button
          onClick={handleSave}
          disabled={submitting}
          className={`h-12 w-full rounded-xl text-[15px] font-bold text-white ${missing.length > 0 ? 'bg-slate-300' : 'bg-[#0f9b8e]'}`}
        >
          {missing.length > 0 ? '请先完成必填项' : '保存并出报告 →'}
        </button>
        <button onClick={onBack} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">
          返回
        </button>
      </div>
    </div>
  );
};
