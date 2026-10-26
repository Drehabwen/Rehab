import React, { useEffect, useRef, useState } from 'react';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { decodeTo16kMono, useOfflineAsr } from '../asr/useOfflineAsr';

const POINTS = ['疼痛部位', '病程', '诱因', '活动加重', '夜间痛', '既往治疗', '伴随症状'];

interface VoiceScreenProps {
  patientId: string;
  sessionId: string;
  onSaved: (durationSec: number, points: string[]) => void;
  onBack: () => void;
}

/** 屏 5：语音问诊（录音 + 关键要点点选，不依赖转写） */
export const VoiceScreen: React.FC<VoiceScreenProps> = ({ patientId, sessionId, onSaved, onBack }) => {
  const addAssessment = useAssessmentStore((state) => state.addAssessment);
  const [saving, setSaving] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [points, setPoints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { status: asrStatus, transcribe } = useOfflineAsr();
  const [transcript, setTranscript] = useState('');
  const [transcribing, setTranscribing] = useState(false);

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
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (asrStatus !== 'ready' || blob.size === 0) return;
        setTranscribing(true);
        try {
          const samples = await decodeTo16kMono(blob);
          const result = await transcribe(samples);
          if (result.available && result.text.trim()) setTranscript(result.text.trim());
        } catch {
          // 识别失败时静默降级为要点点选
        } finally {
          setTranscribing(false);
        }
      };
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
    }
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const handleSave = async () => {
    if (points.length === 0) { setError('请至少选择 1 个关键要点'); return; }
    setError(null);
    setSaving(true);
    try {
      await addAssessment({
        sessionId,
        patientId,
        type: 'medvoice',
        mode: 'voice',
        data: {
          medvoice: {
            mode: 'voice',
            transcript,
            structuredCase: {
              主诉: points.join('、'),
              现病史: `语音问诊 ${seconds}s，要点：${points.join('、')}`,
            },
            patientInfo: { name: '', gender: '', age: '', case_id: patientId, visit_date: new Date().toISOString().slice(0, 10) },
            viewMode: 'standard',
          },
        },
      });
      onSaved(seconds, points);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存语音问诊失败，请重试');
    } finally {
      setSaving(false);
    }
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
        <div className="mb-2 flex items-center justify-between text-[10.5px] text-slate-400">
          <span>转写文本（可编辑）</span>
          <span>
            {asrStatus === 'unavailable' ? '本机未部署模型 · 已降级为要点点选'
              : transcribing ? '识别中…'
              : transcript ? '已转写' : asrStatus === 'ready' ? '录制后自动识别' : '模型加载中…'}
          </span>
        </div>
        <textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={3}
          placeholder="录音结束后自动填充；也可手动补充"
          className="w-full resize-none rounded-xl border border-slate-200 p-2 text-[11.5px] leading-relaxed outline-none focus:border-[#0f9b8e]"
        />
      </section>

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
          disabled={points.length === 0 || saving}
          className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white disabled:bg-slate-300"
        >
          {points.length === 0 ? '请先选择关键要点' : saving ? '保存中…' : '完成语音问诊 →'}
        </button>
        <button onClick={onBack} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">返回</button>
      </div>
    </div>
  );
};
