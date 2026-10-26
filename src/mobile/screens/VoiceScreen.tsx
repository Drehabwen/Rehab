import React, { useEffect, useRef, useState } from 'react';

const POINTS = ['疼痛部位', '病程', '诱因', '活动加重', '夜间痛', '既往治疗', '伴随症状'];

interface VoiceScreenProps {
  onSaved: (durationSec: number, points: string[]) => void;
  onBack: () => void;
}

/** 屏 5：语音问诊（录音 + 关键要点点选，不依赖转写） */
export const VoiceScreen: React.FC<VoiceScreenProps> = ({ onSaved, onBack }) => {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [points, setPoints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => {
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    if (timerRef.current) window.clearInterval(timerRef.current);
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      setError('无法访问麦克风，请检查权限后重试');
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const handleSave = () => {
    if (points.length === 0) { setError('请至少选择 1 个关键要点'); return; }
    setError(null);
    onSaved(seconds, points);
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <section className="rounded-2xl border border-slate-200 p-3 text-center">
        <button
          onClick={recording ? stop : start}
          aria-label={recording ? '结束录音' : '开始录音'}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-white"
          style={{ background: 'radial-gradient(circle at 40% 35%, #2dd4bf, #0f9b8e)' }}
        >
          {recording ? '■' : '●'}
        </button>
        <div className="mt-2 text-[13px] font-bold text-slate-900">{recording ? `正在录音 · ${seconds}s` : '点击开始录音'}</div>
        <div className="mt-1 text-[10.5px] text-slate-400">转写仅作参考；要点为必选，不依赖转写</div>
      </section>

      {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">{error}</div> : null}

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="mb-2 text-[10.5px] tracking-wider text-slate-400">关键要点（必选）</div>
        <div className="flex flex-wrap gap-2">
          {POINTS.map((point) => {
            const on = points.includes(point);
            return (
              <button
                key={point}
                onClick={() => setPoints((current) => (current.includes(point) ? current.filter((item) => item !== point) : [...current, point]))}
                className={`rounded-full border px-3 py-1.5 text-[11.5px] ${on ? 'border-[#0f9b8e] bg-[#0f9b8e]/10 font-semibold text-[#0f9b8e]' : 'border-slate-200 text-slate-600'}`}
              >
                {point}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 p-3 text-[11.5px] text-slate-500">
        已选要点 {points.length} 项{seconds > 0 ? ` · 录音 ${seconds}s` : ''}
      </section>

      <div className="mt-auto space-y-2">
        <button
          onClick={handleSave}
          disabled={points.length === 0}
          className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white disabled:bg-slate-300"
        >
          {points.length === 0 ? '请先选择关键要点' : '完成语音问诊 →'}
        </button>
        <button onClick={onBack} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">返回</button>
      </div>
    </div>
  );
};
