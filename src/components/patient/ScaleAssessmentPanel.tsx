/**
 * ScaleAssessmentPanel — 康复量表评定中心
 *
 * Therapists select a scale template, then either fill it in-clinic or push it
 * to the parent's chatbot. Shows historical records and a radar comparison chart.
 */

import React, { useState, useEffect } from 'react';
import {
  ClipboardList, Send, Smartphone, UserCheck, RefreshCw, ArrowLeft, Check,
  AlertCircle, BarChart2, TrendingUp,
} from 'lucide-react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { usePatientStore } from '@/store/usePatientStore';
import { IntegrationService } from '@/services/integrationService';
import { db } from '@/lib/db';
import type { Assessment, ScaleAssessmentData, ScaleAnswer } from '@/types/assessment';
import { Button, Card } from '@/components/ui';
import { SCALE_TEMPLATES, ADMIN_LEVEL_LABELS, type ScaleTemplate } from './ScaleAssessmentPanel.templates';

interface ScaleAssessmentPanelProps {
  patientId: string;
  sessionId: string;
  onBack: () => void;
}

type FillingMode = 'selection' | 'inClinic' | 'remoteWait';

export const ScaleAssessmentPanel: React.FC<ScaleAssessmentPanelProps> = ({
  patientId, sessionId, onBack,
}) => {
  const { importScaleAssessment, patients } = usePatientStore();
  const patient = patients.find(p => p.id === patientId);
  const patientName = patient?.name || '';

  const [selectedTemplate, setSelectedTemplate] = useState<ScaleTemplate>(SCALE_TEMPLATES[0]);
  const [pastScales, setPastScales] = useState<Assessment[]>([]);
  const [inClinicAnswers, setInClinicAnswers] = useState<Record<number, { score: number; text: string }>>({});
  const [fillingMode, setFillingMode] = useState<FillingMode>('selection');

  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'idle' | 'pushing' | 'pending' | 'completed'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Data loading ──

  const loadPastScaleRecords = async () => {
    try {
      const records = await db.assessments.where('patientId').equals(patientId)
        .filter(a => a.type === 'scale').toArray();
      records.sort((a, b) => b.createdAt - a.createdAt);
      setPastScales(records);
    } catch (err) { console.error('Failed to load past scale records', err); }
  };

  useEffect(() => { loadPastScaleRecords(); }, [patientId]);

  // ── In-clinic submit ──

  const handleInClinicSubmit = async () => {
    const unfilled = selectedTemplate.questions.filter(q => !inClinicAnswers[q.id]);
    if (unfilled.length > 0) {
      alert(`请完整填答所有问题！还有 ${unfilled.length} 道题未选择。`);
      return;
    }
    try {
      const answers: ScaleAnswer[] = selectedTemplate.questions.map(q => ({
        questionId: q.id, questionText: q.text, category: q.category,
        score: inClinicAnswers[q.id].score, answerText: inClinicAnswers[q.id].text,
      }));
      const totalScore = answers.reduce((sum, item) => sum + item.score, 0);
      const maxScore = selectedTemplate.maxScore;
      const percentageScore = Math.round((totalScore / maxScore) * 10000) / 100;

      const getCatAvg = (cat: string) => {
        const catAnswers = answers.filter(a => a.category === cat);
        if (catAnswers.length === 0) return 5.0;
        return Math.round((catAnswers.reduce((s, a) => s + a.score, 0) / catAnswers.length) * 10) / 10;
      };

      const scaleData: ScaleAssessmentData = {
        scaleId: selectedTemplate.id, scaleName: selectedTemplate.name, filledBy: 'therapist',
        totalScore, maxScore, percentageScore,
        dimensions: {
          functionActive: getCatAvg('function'), pain: getCatAvg('pain'),
          selfImage: getCatAvg('self_image'), mentalHealth: getCatAvg('mental_health'),
          satisfaction: getCatAvg('satisfaction'),
        },
        answers,
        aiInterpretation: `临床店内录入评定。总分 ${totalScore}/${maxScore} (${percentageScore}%)。功能活动 ${getCatAvg('function')}分，疼痛 ${getCatAvg('pain')}分，体态 ${getCatAvg('self_image')}分，心理 ${getCatAvg('mental_health')}分。`,
        createdAt: Date.now(),
      };

      await importScaleAssessment(patientId, scaleData, sessionId);
      await loadPastScaleRecords();
      setInClinicAnswers({});
      setFillingMode('selection');
      alert('量表录入成功，结果已归档！');
    } catch (err) {
      alert(`保存失败: ${err instanceof Error ? err.message : err}`);
    }
  };

  // ── Remote push ──

  const handlePushRemoteScale = async () => {
    setPushStatus('pushing');
    setErrorMsg(null);
    try {
      const response = await IntegrationService.pushScaleTask({
        patient_id: patientId, patient_name: patientName,
        session_id: sessionId, scale_id: selectedTemplate.id, therapist_name: '王康复师',
      });
      setActiveTaskId(response.task_id);
      setPushStatus('pending');
      setFillingMode('remoteWait');
    } catch (err) {
      setPushStatus('idle');
      setErrorMsg(err instanceof Error ? err.message : '远程下发推送失败，请检查网络！');
    }
  };

  const checkRemoteTaskResults = async () => {
    if (!activeTaskId) return;
    try {
      const results = await IntegrationService.getScaleResults(sessionId);
      const currentTaskResult = results.find(r => r.task_id === activeTaskId);
      if (currentTaskResult?.status === 'completed' && currentTaskResult.scale_data) {
        setPushStatus('completed');
        await importScaleAssessment(patientId, currentTaskResult.scale_data, sessionId);
        await loadPastScaleRecords();
        alert('家长已在手机端填答完成！');
        setFillingMode('selection'); setActiveTaskId(null); setPushStatus('idle');
      } else {
        alert('患者或家长尚未提交，请在手机端点击卡片完成答题后再点同步！');
      }
    } catch { alert('同步失败，请重试！'); }
  };

  const handleCancelWait = () => {
    setActiveTaskId(null); setPushStatus('idle'); setFillingMode('selection');
  };

  // ── Radar chart data ──

  const getRadarChartData = () => {
    const dims = [
      { key: 'pain', label: '疼痛耐受 (Pain)' },
      { key: 'functionActive', label: '功能活动 (Function)' },
      { key: 'selfImage', label: '自我形象 (Self Image)' },
      { key: 'mentalHealth', label: '精神健康 (Mental)' },
      { key: 'satisfaction', label: '疗效满意 (Satisfaction)' },
    ];
    if (pastScales.length === 0) return dims.map(d => ({ subject: d.label, '标准参考': 5, '当前水平': 3 }));

    const latest = pastScales[0].data.scale;
    const baseline = pastScales.length > 1 ? pastScales[pastScales.length - 1].data.scale : null;

    return dims.map(d => {
      const dp: any = { subject: d.label, '标准参考': 5.0 };
      if (latest) dp['最近评定'] = latest.dimensions[d.key as keyof typeof latest.dimensions] ?? 5.0;
      if (baseline) dp['基线对照'] = baseline.dimensions[d.key as keyof typeof baseline.dimensions] ?? 5.0;
      return dp;
    });
  };

  const radarData = getRadarChartData();

  // ── Render ──

  return (
    <div className="h-full flex flex-col bg-slate-50 text-slate-800 overflow-y-auto custom-scrollbar p-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-slate-500 hover:text-slate-900 hover:bg-slate-100/50" onClick={onBack}>
            <ArrowLeft size={16} />
          </Button>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <ClipboardList className="text-teal-600 animate-pulse" />
              康复量表评定中心
            </h1>
            <p className="text-xs text-slate-500 mt-1">临床 SOAP 规范的 S (Subjective) 主观维度多端联调控制舱</p>
          </div>
        </div>
        <ModeActions mode={fillingMode} template={selectedTemplate}
          onInClinic={() => setFillingMode('inClinic')}
          onPushRemote={handlePushRemoteScale} />
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        {/* Left */}
        <div className="space-y-6">
          {fillingMode === 'selection' && (
            <TemplateSelector templates={SCALE_TEMPLATES} selected={selectedTemplate} onSelect={setSelectedTemplate} />
          )}
          {fillingMode === 'inClinic' && (
            <InClinicForm template={selectedTemplate} answers={inClinicAnswers} setAnswers={setInClinicAnswers}
              onSubmit={handleInClinicSubmit} onCancel={() => setFillingMode('selection')} />
          )}
          {fillingMode === 'remoteWait' && (
            <RemoteWaitCard errorMsg={errorMsg} onCancel={handleCancelWait} onSync={checkRemoteTaskResults} />
          )}
          <HistorySection pastScales={pastScales} />
        </div>
        {/* Right: Radar */}
        <RadarSection pastScales={pastScales} radarData={radarData} />
      </div>
    </div>
  );
};

// ── Sub-components ──

const ModeActions: React.FC<{
  mode: FillingMode; template: ScaleTemplate;
  onInClinic: () => void; onPushRemote: () => void;
}> = ({ mode, template, onInClinic, onPushRemote }) => {
  if (mode !== 'selection') return null;
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" className="bg-white hover:bg-slate-50" onClick={onInClinic}>
        <UserCheck size={14} className="mr-1 text-teal-600" /> 店内现场录入 (iPad)
      </Button>
      {template.adminLevel === 'clinician_only' ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
          <AlertCircle size={14} /> 须由康复师在诊所内现场评定
        </div>
      ) : (
        <>
          {template.adminLevel === 'parent_adapted' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-700 font-medium">
              <AlertCircle size={12} /> 需适配通俗化版本后再下发
            </div>
          )}
          <Button variant="primary" className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs border-none"
            onClick={onPushRemote}>
            <Send size={14} className="mr-1" /> 远程下发至家长 Chatbot
          </Button>
        </>
      )}
    </div>
  );
};

const TemplateSelector: React.FC<{
  templates: ScaleTemplate[]; selected: ScaleTemplate; onSelect: (t: ScaleTemplate) => void;
}> = ({ templates, selected, onSelect }) => (
  <Card className="border-slate-200/80 bg-white/95 shadow-md p-5 rounded-2xl">
    <div className="text-sm font-black text-slate-900 mb-4">第一步：选择量表评定模板</div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {templates.map((tpl) => {
        const isSelected = selected.id === tpl.id;
        const levelInfo = ADMIN_LEVEL_LABELS[tpl.adminLevel];
        return (
          <div key={tpl.id} onClick={() => onSelect(tpl)}
            className={`cursor-pointer rounded-2xl border p-4 transition-all duration-300 ${
              isSelected ? 'border-teal-500 bg-teal-50/50 shadow-sm text-teal-950 font-bold'
                : 'border-slate-250 bg-white/70 text-slate-700 hover:border-slate-350 hover:bg-slate-50'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">{tpl.name}</span>
              {isSelected && <Check size={14} className="text-teal-600" />}
            </div>
            <p className="text-[11px] leading-relaxed text-slate-550 mb-3">{tpl.description}</p>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${levelInfo.color}`}>
              {levelInfo.label}
            </span>
          </div>
        );
      })}
    </div>
    <div className="mt-6 rounded-xl bg-amber-50/40 border border-amber-200/60 p-4">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="text-amber-600 mt-0.5 shrink-0" size={16} />
        <div className="text-xs leading-relaxed text-slate-650">
          <span className="text-amber-700 font-bold">SOAP临床提示：</span>
          量表结果用于补充患者主观疼痛分级与日常生活功能障碍率。推荐首选 <span className="text-slate-800 mx-0.5 font-black">SRS-22</span>。
        </div>
      </div>
    </div>
  </Card>
);

const InClinicForm: React.FC<{
  template: ScaleTemplate;
  answers: Record<number, { score: number; text: string }>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<number, { score: number; text: string }>>>;
  onSubmit: () => void; onCancel: () => void;
}> = ({ template, answers, setAnswers, onSubmit, onCancel }) => (
  <Card className="border-slate-200 bg-white/95 shadow-md rounded-2xl p-5">
    <div className="flex justify-between items-center mb-5 border-b border-slate-150 pb-3">
      <div>
        <div className="text-sm font-black text-slate-900">店内iPad手工录入录像模式</div>
        <p className="text-[11px] text-slate-500 mt-1">{template.name}问卷录入</p>
      </div>
      <Button variant="ghost" className="text-xs" onClick={onCancel}>取消返回</Button>
    </div>
    <div className="space-y-6 max-h-[500px] overflow-y-auto custom-scrollbar pr-2 mb-6">
      {template.questions.map((q, idx) => (
        <div key={q.id} className="bg-slate-50/60 border border-slate-150/60 p-4 rounded-xl space-y-3">
          <div className="text-xs font-black text-slate-800">
            Q{idx + 1}. {q.text}
            <span className="ml-2 text-[10px] text-teal-700 font-bold bg-teal-50 border border-teal-200/50 px-1.5 py-0.5 rounded">
              {q.category === 'pain' ? '疼痛' : q.category === 'function' ? '功能' : q.category === 'self_image' ? '形象' : q.category === 'mental_health' ? '心理' : '治疗满意度'}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {q.options.map(opt => {
              const isChosen = answers[q.id]?.score === opt.score;
              return (
                <button key={opt.score} onClick={() => setAnswers({ ...answers, [q.id]: { score: opt.score, text: opt.text } })}
                  className={`rounded-xl border p-2.5 text-left text-xs transition-all ${
                    isChosen ? 'border-teal-550 bg-teal-50 text-teal-900 font-bold shadow-sm' : 'border-slate-200 bg-white text-slate-650 hover:border-slate-350 hover:bg-slate-50'}`}>
                  <div className="font-bold text-[10px] text-slate-400 mb-1">{opt.score} 分</div>
                  <div className="text-[10px] leading-tight font-medium">{opt.text}</div>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
    <div className="flex justify-end gap-2 border-t border-slate-150 pt-4">
      <Button variant="secondary" className="bg-slate-100 text-slate-700 text-xs" onClick={onCancel}>放弃录入</Button>
      <Button variant="primary" className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-xs border-none"
        onClick={onSubmit}><Check size={14} className="mr-1" />提交临床建档</Button>
    </div>
  </Card>
);

const RemoteWaitCard: React.FC<{
  errorMsg: string | null; onCancel: () => void; onSync: () => void;
}> = ({ errorMsg, onCancel, onSync }) => (
  <Card className="border-slate-200 bg-white/95 shadow-md p-8 rounded-2xl text-center">
    <div className="flex justify-center mb-4">
      <div className="relative flex items-center justify-center">
        <div className="absolute animate-ping h-14 w-14 rounded-full bg-teal-500/20" />
        <div className="relative h-12 w-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-200">
          <Smartphone size={24} className="animate-bounce" />
        </div>
      </div>
    </div>
    <h3 className="text-base font-black text-slate-900 mb-2">已成功推送量表至家长端 Chatbot</h3>
    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed font-medium">
      正在等待家长在 <span className="text-teal-600 font-bold">Spine Assistant (小柱)</span> 的柔和对话流交互卡片上完成答题。
    </p>
    {errorMsg && (
      <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 py-2 rounded-lg max-w-sm mx-auto">{errorMsg}</div>
    )}
    <div className="mt-6 flex justify-center gap-3">
      <Button variant="secondary" className="bg-slate-100" onClick={onCancel}>取消等待</Button>
      <Button variant="primary" className="bg-teal-600 text-white" onClick={onSync}>
        <RefreshCw size={14} className="mr-1 animate-spin" />手动同步状态</Button>
    </div>
  </Card>
);

const HistorySection: React.FC<{ pastScales: Assessment[] }> = ({ pastScales }) => (
  <div className="space-y-3">
    <div className="text-sm font-black text-slate-900 flex items-center gap-1.5">
      <TrendingUp size={16} className="text-teal-600 animate-pulse" />
      历史量表评定数据汇总 ({pastScales.length})
    </div>
    {pastScales.length === 0 ? (
      <div className="text-center py-8 rounded-2xl bg-white/40 border border-slate-200 text-slate-450 text-xs">
        暂无历史量表评定记录。建议进行一次 SRS-22 首诊评估建档。
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {pastScales.map(record => {
          const scale = record.data.scale;
          if (!scale) return null;
          return (
            <div key={record.id} className="rounded-2xl border border-slate-200 bg-white/80 p-4 space-y-3 hover:shadow-md transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-xs font-bold text-slate-800">{scale.scaleName}</span>
                  <div className="text-[10px] text-slate-400 mt-1">{new Date(scale.createdAt).toLocaleString('zh-CN')}</div>
                </div>
                <div className="bg-teal-50 text-teal-700 border border-teal-200/50 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  得分: {scale.totalScore}/{scale.maxScore}
                </div>
              </div>
              <DimensionGrid dimensions={scale.dimensions} />
              <p className="text-[10px] text-slate-500 leading-normal italic line-clamp-2">{scale.aiInterpretation}</p>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const DimensionGrid: React.FC<{ dimensions: ScaleAssessmentData['dimensions'] }> = ({ dimensions }) => (
  <div className="grid grid-cols-5 gap-1.5 py-1.5 text-center border-y border-slate-150/80">
    {[
      ['疼痛', dimensions.pain],
      ['活动', dimensions.functionActive],
      ['形象', dimensions.selfImage],
      ['心理', dimensions.mentalHealth],
      ['疗效', dimensions.satisfaction ?? 5.0],
    ].map(([label, value]) => (
      <div key={label}>
        <div className="text-[8px] text-slate-450 font-bold uppercase leading-none mb-1">{label}</div>
        <span className="text-[10px] font-extrabold text-slate-700">{value}</span>
      </div>
    ))}
  </div>
);

const RadarSection: React.FC<{ pastScales: Assessment[]; radarData: any[] }> = ({ pastScales, radarData }) => (
  <div className="space-y-6">
    <Card className="border-slate-200/80 bg-white/95 shadow-md p-5 rounded-2xl flex flex-col h-full min-h-[450px]">
      <div className="mb-4">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <BarChart2 className="text-teal-600" size={16} /> 多维生命质量及疼痛雷达图
        </h3>
        <p className="text-[9px] text-slate-450 font-bold mt-1 uppercase">SOAP Multi-dimensional Radar Comparison</p>
      </div>
      <div className="flex-1 w-full min-h-[300px] relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} />
            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fill: '#64748b', fontSize: 9 }} stroke="#cbd5e1" />
            <Radar name="标准上限" dataKey="标准参考" stroke="#cbd5e1" fill="#94a3b8" fillOpacity={0.06} />
            {pastScales.length > 1 && <Radar name="基线对照" dataKey="基线对照" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} />}
            {pastScales.length > 0 && <Radar name="最近评定" dataKey="最近评定" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} />}
            <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.98)', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 15px 30px -5px rgba(0,0,0,0.05)', padding: '8px 12px', color: '#0f172a' }} />
            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '10px', color: '#475569' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-2">
        <div className="text-xs font-black text-slate-850 flex items-center gap-1">康复多维医学解读 (AI Analysis)</div>
        {pastScales.length === 0 ? (
          <p className="text-[10px] text-slate-500 leading-normal">
            等待量表数据录入。系统将自动对比基线与本周期量表多维雷达阴影面积差异，量化康复疗效。
          </p>
        ) : (
          <p className="text-[10px] text-amber-800 font-medium leading-relaxed italic">
            {pastScales[0].data.scale?.aiInterpretation}
          </p>
        )}
      </div>
    </Card>
  </div>
);
