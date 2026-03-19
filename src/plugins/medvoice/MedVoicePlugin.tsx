import React, { useMemo, useState } from 'react';
import {
  Activity,
  ClipboardCheck,
  Download,
  History,
  MessageSquare,
  Mic,
  RefreshCw,
  Save,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { useCaseStore, StructuredCase } from '@/store/useCaseStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useVoiceRecorder } from './hooks/useVoiceRecorder';
import { CONFIG } from '@/config';
import { PageTitleSection, UnifiedStatusBadge, StatePanel } from '@/components/layout';

type ViewMode = 'standard' | 'soap';

const standardSections = [
  { id: '主诉', label: '主诉反馈', icon: MessageSquare },
  { id: '现病史', label: '现病史/背景', icon: Activity },
  { id: '既往史', label: '既往情况', icon: History },
  { id: '体格检查', label: '体格检查', icon: ClipboardCheck },
  { id: '诊断', label: '分析判断', icon: ClipboardCheck },
  { id: '处理意见', label: '建议与计划', icon: Save },
  { id: 'ai_suggestions', label: 'AI 建议', icon: Activity },
] as const;

const soapSections = [
  { id: 'S', label: 'S 主观信息', icon: MessageSquare },
  { id: 'O', label: 'O 客观信息', icon: Activity },
  { id: 'A', label: 'A 分析判断', icon: ClipboardCheck },
  { id: 'P', label: 'P 计划建议', icon: Save },
  { id: 'ai_suggestions', label: 'AI 建议', icon: Activity },
] as const;

const structuredCaseAliases: Record<string, string[]> = {
  主诉: ['主诉', 'chief_complaint'],
  现病史: ['现病史', 'present_illness', '背景', '训练背景'],
  既往史: ['既往史', 'past_history', '历史表现', '历史数据'],
  体格检查: ['体格检查', 'physical_exam', '身体素质评估'],
  诊断: ['诊断', 'analysis', '表现分析'],
  处理意见: ['处理意见', 'plan', 'treatment_plan', '训练调整建议'],
  S: ['S'],
  O: ['O'],
  A: ['A'],
  P: ['P'],
  ai_suggestions: ['ai_suggestions', 'AI建议', 'recommendations'],
};

const normalizeStructuredCase = (input: StructuredCase): StructuredCase => {
  const normalized: StructuredCase = { ...input };

  Object.entries(structuredCaseAliases).forEach(([targetKey, aliases]) => {
    const matchedKey = aliases.find((alias) => {
      const value = input[alias];
      return typeof value === 'string' && value.trim().length > 0;
    });

    if (matchedKey) {
      normalized[targetKey] = input[matchedKey];
    }
  });

  return normalized;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const hasStructuredContent = (input: StructuredCase | null): boolean => {
  if (!input) return false;
  return Object.values(input).some((value) => typeof value === 'string' && value.trim().length > 0);
};

const composeExportText = (transcript: string, structuredCase: StructuredCase | null): string => {
  const lines: string[] = [];

  if (transcript.trim()) {
    lines.push('# 实时转写');
    lines.push(transcript.trim());
    lines.push('');
  }

  if (structuredCase) {
    const sections = Object.entries(structuredCase)
      .filter(([, value]) => Boolean(value && String(value).trim().length > 0))
      .map(([key, value]) => `## ${key}\n${String(value).trim()}`);

    if (sections.length > 0) {
      lines.push('# 结构化摘要');
      lines.push(...sections);
    }
  }

  return lines.join('\n\n').trim();
};

export const MedVoicePlugin: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [waveformPower, setWaveformPower] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const { structuredCase, setStructuredCase, patientInfo } = useCaseStore();
  const { addAssessment } = useAssessmentStore();
  const currentPatient = usePatientStore((state) => state.currentPatient);
  const currentSession = useSessionStore((state) => state.currentSession);
  const sessions = useSessionStore((state) => state.sessions);
  const startSession = useSessionStore((state) => state.startSession);
  const [activeSection, setActiveSection] = useState<string>('主诉');

  const { activeMeasurements, savedMeasurements } = useMeasurementStore();

  const { isRecording, recordTime, startRecording, stopRecording } = useVoiceRecorder({
    onTranscriptUpdate: (text) => {
      setTranscript(text);
      setIsSaved(false);
    },
    onTranscriptComplete: (text) => {
      setTranscript(text);
      setIsSaved(false);
    },
    onWaveformUpdate: (power) => setWaveformPower(power),
  });

  const sections = useMemo(() => (viewMode === 'standard' ? standardSections : soapSections), [viewMode]);
  const currentSectionData = sections.find((section) => section.id === activeSection) || sections[0];

  const hasTranscript = transcript.trim().length > 0;
  const structuredReady = hasStructuredContent(structuredCase);
  const canSaveToArchive = Boolean(structuredReady && hasTranscript && currentPatient);

  const recordingStatus = isRecording
    ? { tone: 'processing' as const, text: `录音中 ${formatTime(recordTime)}` }
    : { tone: 'disabled' as const, text: '录音已停止' };

  const caseStatus = isProcessing
    ? { tone: 'processing' as const, text: 'AI 解析中' }
    : structuredReady
      ? isSaved
        ? { tone: 'success' as const, text: '已保存归档' }
        : { tone: 'warning' as const, text: '待确认保存' }
      : hasTranscript
        ? { tone: 'processing' as const, text: '待结构化' }
        : { tone: 'disabled' as const, text: '待录音' };

  const handleStructure = async (inputText?: string) => {
    const content = inputText || transcript;
    if (!content || content.trim().length < 5) return;

    setIsProcessing(true);
    try {
      const visionData = {
        active: activeMeasurements.map((measurement) => ({
          joint: measurement.joint,
          direction: measurement.direction,
          side: measurement.side,
          maxAngle: measurement.maxAngle,
          currentAngle: measurement.currentAngle,
        })),
        latest_saved: savedMeasurements.length > 0 ? savedMeasurements[0] : null,
      };

      const response = await fetch(CONFIG.medvoice.structureUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: content,
          vision3_data: visionData,
          mode: viewMode,
        }),
      });

      const result: { status: string; data?: { structured_case?: StructuredCase } } = await response.json();
      if (result.status === 'success' && result.data?.structured_case) {
        const normalized = normalizeStructuredCase(result.data.structured_case);
        setStructuredCase(normalized);
        setIsSaved(false);
        if (!normalized[activeSection]) {
          setActiveSection(sections[0].id);
        }
      }
    } catch (error) {
      console.error('Structuring failed', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveToAssessment = async () => {
    if (!structuredCase || !hasTranscript || !currentPatient) return;

    setIsSaving(true);
    try {
      const patientId = currentPatient.id;
      const sessionId =
        (currentSession?.patientId === patientId ? currentSession.id : undefined)
        ?? sessions.find((session) => session.patientId === patientId)?.id
        ?? (await startSession(patientId)).id;

      await addAssessment({
        sessionId,
        patientId,
        type: 'medvoice',
        mode: 'voice',
        data: {
          medvoice: {
            mode: 'voice',
            transcript,
            structuredCase,
            patientInfo: {
              ...patientInfo,
              name: currentPatient.name || patientInfo.name,
              case_id: patientId,
            },
            viewMode,
          },
        },
      });

      setIsSaved(true);
    } catch (error) {
      console.error('Save failed', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setStructuredCase(null);
    setWaveformPower(0);
    setIsSaved(false);
  };

  const handleExportText = () => {
    const content = composeExportText(transcript, structuredCase);
    if (!content) return;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medvoice-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const canExport = Boolean(composeExportText(transcript, structuredCase));

  return (
    <div className="rehab-page">
      <div className="rehab-page-inner h-full min-h-0">
        <PageTitleSection
          title="问询补充"
          description="左侧进行录音与实时转写，右侧查看结构化摘要，并将结果保存到报告归档。"
          right={(
            <>
              <UnifiedStatusBadge status={recordingStatus.tone} text={recordingStatus.text} />
              <UnifiedStatusBadge status={caseStatus.tone} text={caseStatus.text} />
            </>
          )}
        />

        <section className="bento-card flex flex-wrap items-center gap-2 p-4">
          {isRecording ? (
            <button onClick={stopRecording} className="btn-primary">
              <Square size={14} />
              停止录音
            </button>
          ) : !hasTranscript ? (
            <button onClick={startRecording} className="btn-primary">
              <Mic size={14} />
              开始录音
            </button>
          ) : !structuredReady ? (
            <button
              onClick={() => handleStructure()}
              disabled={isProcessing}
              className={cn('btn-primary', isProcessing && 'opacity-50 cursor-not-allowed')}
            >
              <Activity size={14} />
              {isProcessing ? '解析中...' : '结构化解析'}
            </button>
          ) : (
            <button
              onClick={handleSaveToAssessment}
              disabled={!canSaveToArchive || isSaving}
              className={cn('btn-primary', (!canSaveToArchive || isSaving) && 'opacity-50 cursor-not-allowed')}
            >
              <Save size={14} />
              {isSaving ? '保存中...' : '保存到报告归档'}
            </button>
          )}

          <button onClick={isRecording ? stopRecording : startRecording} className="btn-secondary">
            {isRecording ? <Square size={14} /> : <Mic size={14} />}
            {isRecording ? '结束录音' : '继续录音'}
          </button>

          <button
            onClick={() => handleStructure()}
            disabled={!hasTranscript || isProcessing}
            className={cn('btn-secondary', (!hasTranscript || isProcessing) && 'opacity-50 cursor-not-allowed')}
          >
            <Activity size={14} />
            重新解析
          </button>

          <button onClick={handleClear} className="btn-secondary">
            <RefreshCw size={14} />
            清空
          </button>

          <button
            onClick={handleExportText}
            disabled={!canExport}
            className={cn('btn-secondary ml-auto', !canExport && 'opacity-50 cursor-not-allowed')}
          >
            <Download size={14} />
            导出文本
          </button>
        </section>

        <section className="grid flex-1 min-h-0 grid-cols-1 gap-4 lg:grid-cols-12">
          <article className="bento-card flex min-h-[420px] flex-col p-5 lg:col-span-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">实时转写</h3>
              <span className="text-xs text-slate-500">
                {isRecording ? `录音时长 ${formatTime(recordTime)}` : hasTranscript ? `字数 ${transcript.length}` : '等待开始'}
              </span>
            </div>

            <div className="mb-3 h-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <div
                className="h-full bg-violet-500/60 transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(4, waveformPower))}%` }}
              />
            </div>

            <div className="custom-scrollbar flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
              {transcript ? (
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{transcript}</p>
              ) : (
                <StatePanel title="暂无转写内容" description="点击“开始录音”后，系统会在这里实时显示转写结果。" />
              )}
            </div>
          </article>

          <article className="bento-card flex min-h-[420px] flex-col p-5 lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">结构化摘要</h3>
                <p className="mt-1 text-xs text-slate-500">状态：{caseStatus.text}</p>
              </div>

              <div className="segmented-control">
                <button
                  onClick={() => {
                    setViewMode('standard');
                    setActiveSection('主诉');
                  }}
                  className={cn('segmented-control-tab', viewMode === 'standard' ? 'segmented-control-tab-solid' : 'segmented-control-tab-inactive')}
                >
                  标准
                </button>
                <button
                  onClick={() => {
                    setViewMode('soap');
                    setActiveSection('S');
                  }}
                  className={cn('segmented-control-tab', viewMode === 'soap' ? 'segmented-control-tab-solid' : 'segmented-control-tab-inactive')}
                >
                  SOAP
                </button>
              </div>
            </div>

            {!isRecording && structuredReady && !isSaved ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                {currentPatient ? '当前摘要已解析完成，建议核对后保存到报告归档。' : '请先选择学生，再将当前摘要保存到报告归档。'}
              </div>
            ) : null}

            <div className="grid flex-1 min-h-0 grid-cols-1 gap-4 md:grid-cols-[220px_1fr]">
              <div className="custom-scrollbar space-y-2 overflow-y-auto pr-1">
                {sections.map((section) => {
                  const active = activeSection === section.id;
                  const hasValue = Boolean(structuredCase?.[section.id]);

                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'flex h-10 w-full items-center justify-between rounded-xl border px-3 text-sm',
                        active ? 'border-antey-primary bg-antey-primary/10 text-antey-primary' : 'border-slate-300 text-slate-700 hover:bg-slate-50',
                      )}
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <section.icon size={14} />
                        {section.label}
                      </span>
                      {hasValue ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="custom-scrollbar overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
                {isProcessing ? (
                  <div className="flex h-full items-center justify-center">
                    <UnifiedStatusBadge status="processing" text="AI 正在解析中" />
                  </div>
                ) : structuredCase?.[activeSection] ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-slate-900">{currentSectionData.label}</h4>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{structuredCase[activeSection]}</p>
                  </div>
                ) : (
                  <StatePanel title="该分节暂无内容" description="完成录音后点击“结构化解析”，系统会自动生成对应摘要。" />
                )}
              </div>
            </div>
          </article>
        </section>
      </div>
    </div>
  );
};

export default MedVoicePlugin;
