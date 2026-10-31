import React, { useEffect, useRef, useState } from 'react';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { transcribeAudio } from '../ai/asr';
import { structureTranscript } from '../ai/structure';
import { isAsrReady, isLlmReady, loadAiConfig } from '../ai/config';

const POINTS = ['疼痛部位', '病程', '诱因', '活动加重', '夜间痛', '既往治疗', '伴随症状'];
const FIELDS = ['主诉', '现病史', '既往史', '体格检查', '诊断', '处理意见'] as const;
type Field = (typeof FIELDS)[number];

interface VoiceScreenProps {
  patientId: string;
  sessionId: string;
  onSaved: (durationSec: number, points: string[]) => void;
  onBack: () => void;
}

type Pipeline = 'idle' | 'transcribing' | 'structuring' | 'ready' | 'failed';

export const VoiceScreen: React.FC<VoiceScreenProps> = ({ patientId, sessionId, onSaved, onBack }) => {
  const addAssessment = useAssessmentStore((state) => state.addAssessment);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [points, setPoints] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pipeline, setPipeline] = useState<Pipeline>('idle');
  const [transcript, setTranscript] = useState('');
  const [structured, setStructured] = useState<Record<Field, string>>(() => ({ 主诉: '', 现病史: '', 既往史: '', 体格检查: '', 诊断: '', 处理意见: '' }));
  const [saving, setSaving] = useState(false);

  const config = loadAiConfig();
  const asrReady = isAsrReady(config);
  const llmReady = isLlmReady(config);

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
      setError(null);
      timerRef.current = window.setInterval(() => setSeconds((value) => value + 1), 1000);
    } catch {
      setError('无法访问麦克风，请检查权限后重试');
    }
  };

  const runPipeline = async (blob: Blob) => {
    setPipeline('transcribing');
    const asr = await transcribeAudio(blob, config);
    if ('reason' in asr) {
      setPipeline('failed');
      setError(`转写失败（${asr.reason}），已降级为要点点选`);
      return;
    }
    setTranscript(asr.text);
    if (!llmReady) {
      setPipeline('failed');
      setError('未配置 LLM，转写文本已保留，可手动整理或点选要点');
      return;
    }
    setPipeline('structuring');
    const result = await structureTranscript(asr.text, config);
    if ('reason' in result) {
      setPipeline('failed');
      setError(`结构化失败（${result.reason}），转写文本已保留`);
      return;
    }
    setStructured({
      主诉: result.data.主诉 ?? '',
      现病史: result.data.现病史 ?? '',
      既往史: result.data.既往史 ?? '',
      体格检查: result.data.体格检查 ?? '',
      诊断: result.data.诊断 ?? '',
      处理意见: result.data.处理意见 ?? '',
    });
    setPipeline('ready');
  };

  const stop = () => {
    const recorder = recorderRef.current;
    if (recorder) {
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (asrReady) void runPipeline(blob);
      };
      recorder.stop();
      recorder.stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
    }
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
  };

  const handleSave = async () => {
    const hasStructured = FIELDS.some((field) => structured[field].trim().length > 0);
    if (!hasStructured && points.length === 0 && !transcript.trim()) {
      setError('请至少录音转写，或选择 1 个关键要点');
      return;
    }
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
            structuredCase: hasStructured
              ? FIELDS.reduce<Record<string, string>>((acc, field) => {
                  const value = structured[field].trim();
                  if (value) acc[field] = value;
                  return acc;
                }, {})
              : { 主诉: points.join('、') },
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

  const statusText = () => {
    if (!asrReady) return '未配置 ASR：可在设置页填写讯飞密钥（当前降级为要点点选）';
    if (pipeline === 'transcribing') return '转写中…';
    if (pipeline === 'structuring') return '结构化中…';
    if (pipeline === 'ready') return '已生成结构化病史，请核对';
    if (pipeline === 'failed') return '处理未完成，已降级为要点点选';
    return recording ? '录音中' : '录完自动转写 + 结构化';
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto">
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
        <div className="mt-1 text-[10.5px] text-slate-400">{statusText()}</div>
      </section>

      {error ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] text-rose-700">{error}</div> : null}

      {pipeline !== 'idle' ? (
        <section className="rounded-2xl border border-slate-200 p-3">
          <div className="mb-2 flex items-center justify-between text-[10.5px] text-slate-400">
            <span>转写文本（可编辑）</span>
            <span>{transcript.length} 字</span>
          </div>
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={3}
            placeholder="录音结束后自动填充；也可手动补充"
            className="w-full resize-none rounded-xl border border-slate-200 p-2 text-[11.5px] leading-relaxed outline-none focus:border-[#0f9b8e]"
          />
        </section>
      ) : null}

      {FIELDS.some((field) => structured[field]) ? (
        <section className="rounded-2xl border border-[#0f9b8e]/30 bg-[#0f9b8e]/[0.04] p-3">
          <div className="mb-2 text-[10.5px] tracking-wider text-[#0f9b8e]">结构化病史（AI 生成，请核对后保存）</div>
          {FIELDS.map((field) => (
            <label key={field} className="mt-2 block">
              <span className="text-[10.5px] text-slate-500">{field}</span>
              <textarea
                value={structured[field]}
                onChange={(event) => setStructured((current) => ({ ...current, [field]: event.target.value }))}
                rows={2}
                className="mt-1 w-full resize-none rounded-lg border border-slate-200 p-2 text-[11.5px] leading-relaxed outline-none focus:border-[#0f9b8e]"
              />
            </label>
          ))}
        </section>
      ) : null}

      <section className="rounded-2xl border border-slate-200 p-3">
        <div className="mb-2 text-[10.5px] tracking-wider text-slate-400">关键要点（无 ASR 时必选）</div>
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

      <div className="mt-auto space-y-2 pt-2">
        <button
          onClick={handleSave}
          disabled={saving || pipeline === 'transcribing' || pipeline === 'structuring'}
          className="h-12 w-full rounded-xl bg-[#0f9b8e] text-[15px] font-bold text-white disabled:bg-slate-300"
        >
          {saving ? '保存中…' : pipeline === 'transcribing' ? '转写中…' : pipeline === 'structuring' ? '结构化中…' : '完成语音问诊 →'}
        </button>
        <button onClick={onBack} className="h-11 w-full rounded-xl border border-slate-200 text-sm font-semibold text-slate-600">返回</button>
      </div>
    </div>
  );
};
