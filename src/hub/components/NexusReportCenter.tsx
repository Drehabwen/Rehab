import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Brain,
  Calendar,
  ExternalLink,
  FileJson,
  FileSpreadsheet,
  FileText,
  Layers,
  Mic,
  Sparkles,
  User,
  Wand2,
  X,
} from 'lucide-react';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionReportStore } from '@/store/useSessionReportStore';
import { useTreatmentPlanStore } from '@/store/useTreatmentPlanStore';
import type { Assessment } from '@/types/assessment';
import type { SessionReportInput, SessionReportOutput } from '@/types/report-center';
import { AssessmentCard, PageHeader, ProgressBar, StatusTag } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';
import {
  buildAssessmentOutputSummary,
  buildSessionReportGenerationRequest,
  buildSessionReportInputs,
  getAssessmentPreview,
} from '../report-center-utils';
import { buildSessionDraftReport, buildSessionInsightCards } from '../report-center-insights';
import { cn } from '@/lib/utils';

interface NexusReportCenterProps {
  mode?: 'datacenter' | 'reports';
  patientId?: string | null;
  sessionId?: string | null;
}

const modulePresentation = {
  posture: {
    title: '体态评估',
    description: '查看当前接诊中的体态异常证据和结构化结论。',
    icon: Activity,
    accentClassName: 'bg-blue-600 text-white',
  },
  rom: {
    title: 'ROM 评估',
    description: '查看关节活动范围、受限方向和左右差异。',
    icon: Layers,
    accentClassName: 'bg-emerald-600 text-white',
  },
  medvoice: {
    title: '语音问诊',
    description: '查看转写结果、结构化病史和问诊重点。',
    icon: Mic,
    accentClassName: 'bg-violet-600 text-white',
  },
} as const;

const trimText = (value: string | null | undefined, maxLength = 120) => {
  if (!value) return '当前模块尚未生成结构化摘要。';
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength)}...`;
};

const extractRecommendationCards = (content: string | null | undefined): string[] => {
  if (!content) return [];
  return content
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 4);
};

const outputStatusToWorkflowStatus = (status: 'ready' | 'partial' | 'missing') => status === 'ready' ? 'completed' : 'pending';

export const NexusReportCenter: React.FC<NexusReportCenterProps> = ({ patientId = null, sessionId = null }) => {
  const { assessments, loadAssessments } = useAssessmentStore();
  const { patients, loadPatients } = usePatientStore();
  const {
    reports: sessionReports,
    isGenerating: isGeneratingSessionReport,
    error: sessionReportError,
    loadReports: loadSessionReports,
    generateReport,
    getLatestReportBySessionId,
  } = useSessionReportStore();
  const {
    currentContent: currentTreatmentPlanContent,
    isGenerating: isGeneratingTreatmentPlan,
    error: treatmentPlanError,
    generatePlanFromSessionReport,
    linkedSessionId,
    linkedSessionReportId,
  } = useTreatmentPlanStore();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patientId);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionId);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [selectedReportMarkdown, setSelectedReportMarkdown] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
    loadAssessments();
    loadSessionReports();
  }, [loadPatients, loadAssessments, loadSessionReports]);

  useEffect(() => {
    setSelectedPatientId(patientId);
  }, [patientId]);

  useEffect(() => {
    setSelectedSessionId(sessionId);
  }, [sessionId]);

  const patientMap = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((patient) => map.set(patient.id, patient.name || `患者 ${patient.id}`));
    return map;
  }, [patients]);

  const availablePatients = useMemo(() => {
    const patientIds = new Set<string>();
    assessments.forEach((assessment) => patientIds.add(assessment.patientId));
    sessionReports.forEach((report) => patientIds.add(report.patientId));
    return patients.filter((patient) => patientIds.has(patient.id));
  }, [assessments, patients, sessionReports]);

  const patientScopedAssessments = useMemo(() => {
    return selectedPatientId
      ? assessments.filter((assessment) => assessment.patientId === selectedPatientId)
      : assessments;
  }, [assessments, selectedPatientId]);

  const sessionInputs = useMemo(
    () => buildSessionReportInputs(patientScopedAssessments, patientMap),
    [patientScopedAssessments, patientMap],
  );

  useEffect(() => {
    if (selectedSessionId && sessionInputs.some((input) => input.sessionId === selectedSessionId)) {
      return;
    }
    setSelectedSessionId(sessionInputs[0]?.sessionId ?? null);
  }, [selectedSessionId, sessionInputs]);

  const activeSessionInput = useMemo<SessionReportInput | null>(() => {
    if (sessionInputs.length === 0) return null;
    return sessionInputs.find((input) => input.sessionId === selectedSessionId) ?? sessionInputs[0] ?? null;
  }, [selectedSessionId, sessionInputs]);

  const generatedSessionReport = useMemo(
    () => activeSessionInput ? getLatestReportBySessionId(activeSessionInput.sessionId) : undefined,
    [activeSessionInput, getLatestReportBySessionId, sessionReports],
  );

  const hasVisibleTreatmentPlan = Boolean(currentTreatmentPlanContent)
    && Boolean(activeSessionInput)
    && linkedSessionId === activeSessionInput?.sessionId
    && linkedSessionReportId === generatedSessionReport?.id;

  const insightCards = useMemo(
    () => activeSessionInput ? buildSessionInsightCards(activeSessionInput) : [],
    [activeSessionInput],
  );

  const draftReport = useMemo(
    () => activeSessionInput ? buildSessionDraftReport(activeSessionInput) : null,
    [activeSessionInput],
  );

  const recommendationCards = useMemo(() => {
    if (generatedSessionReport?.recommendations?.length) {
      return generatedSessionReport.recommendations.slice(0, 4);
    }
    if (hasVisibleTreatmentPlan) {
      return extractRecommendationCards(currentTreatmentPlanContent);
    }
    return [];
  }, [generatedSessionReport, hasVisibleTreatmentPlan, currentTreatmentPlanContent]);

  const reportArchive = useMemo(() => {
    return sessionReports.filter((report) => {
      if (selectedPatientId && report.patientId !== selectedPatientId) return false;
      if (selectedSessionId && report.sessionId !== selectedSessionId) return false;
      return true;
    });
  }, [selectedPatientId, selectedSessionId, sessionReports]);

  const assessmentOutputs = useMemo(() => {
    return (['posture', 'rom', 'medvoice'] as const).map((type) => {
      const output = activeSessionInput?.outputs[type];
      const presentation = modulePresentation[type];
      const summary = output ? buildAssessmentOutputSummary(output.sourceAssessment) : null;
      return {
        type,
        output,
        presentation,
        summaryText: trimText(summary?.preview ?? null),
        evidenceText: output ? `证据项 ${summary?.evidenceCount ?? 0}` : '等待模块结果',
      };
    });
  }, [activeSessionInput]);

  const exportToJson = (assessment: Assessment) => {
    const dataStr = JSON.stringify(assessment, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `assessment-${assessment.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportToCsv = (assessment: Assessment) => {
    let csvContent = '';

    if (assessment.data.posture?.metrics) {
      csvContent = 'metric,value\n' + Object.entries(assessment.data.posture.metrics).map(([key, value]) => `${key},${value}`).join('\n');
    } else if (assessment.data.rom?.items) {
      csvContent = 'joint,direction,side,angle,maxAngle,minAngle,confidence\n';
      assessment.data.rom.items.forEach((item) => {
        csvContent += `${item.joint},${item.direction},${item.side},${item.angle},${item.maxAngle},${item.minAngle},${item.confidence}\n`;
      });
    } else if (assessment.data.medvoice) {
      const medvoice = assessment.data.medvoice;
      csvContent = 'field,value\n';
      csvContent += `patient_name,${medvoice.patientInfo.name}\n`;
      csvContent += `visit_date,${medvoice.patientInfo.visit_date}\n`;
      csvContent += `view_mode,${medvoice.viewMode}\n`;
    }

    if (!csvContent) return;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `assessment-${assessment.id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportSessionReportJson = (report: SessionReportOutput) => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `session-report-${report.sessionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportSessionReportText = (report: SessionReportOutput) => {
    const blob = new Blob([report.markdown], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `session-report-${report.sessionId}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateSessionReport = async () => {
    if (!activeSessionInput) return;
    const report = await generateReport(buildSessionReportGenerationRequest(activeSessionInput));
    setSelectedReportMarkdown(report.markdown);
  };

  const handleGenerateTreatmentPlan = async () => {
    if (!generatedSessionReport || !activeSessionInput) return;

    await generatePlanFromSessionReport({
      patientId: generatedSessionReport.patientId,
      sessionId: generatedSessionReport.sessionId,
      sessionReportId: generatedSessionReport.id,
      sessionReportMarkdown: generatedSessionReport.markdown,
      insights: generatedSessionReport.insights,
      recommendations: generatedSessionReport.recommendations,
    });
  };

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="接诊 -> 评估 -> 报告"
          title="报告中心"
          description="报告中心聚合当前接诊结果，突出评估结果、AI 分析和康复建议。页面只展示结构化信息，详细文本放到查看弹层。"
          summary={
            activeSessionInput ? (
              <>
                <StatusTag status={generatedSessionReport ? 'completed' : 'pending'} />
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  接诊 ID {activeSessionInput.sessionId}
                </span>
              </>
            ) : undefined
          }
          actions={
            <>
              <Button variant="secondary" icon={<Wand2 size={16} />} onClick={handleGenerateTreatmentPlan} loading={isGeneratingTreatmentPlan} disabled={!generatedSessionReport}>生成康复建议</Button>
              <Button variant="primary" icon={<Sparkles size={16} />} onClick={handleGenerateSessionReport} loading={isGeneratingSessionReport} disabled={!activeSessionInput}>生成综合报告</Button>
            </>
          }
        />

        <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1.1fr]">
            <div>
              <div className="mb-2 text-sm font-semibold text-slate-900">患者范围</div>
              <select
                value={selectedPatientId ?? 'all'}
                onChange={(event) => setSelectedPatientId(event.target.value === 'all' ? null : event.target.value)}
                className="field-select"
              >
                <option value="all">全部患者</option>
                {availablePatients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {(patient.name || `患者 ${patient.id}`) + ` · ${patient.id}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="mb-2 text-sm font-semibold text-slate-900">接诊范围</div>
              <select
                value={selectedSessionId ?? 'all'}
                onChange={(event) => setSelectedSessionId(event.target.value === 'all' ? null : event.target.value)}
                className="field-select"
              >
                <option value="all">当前患者的最近接诊</option>
                {sessionInputs.map((input) => (
                  <option key={input.sessionId} value={input.sessionId}>
                    {(input.patientName || input.patientId) + ` · ${input.sessionId}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">报告准备度</div>
              <p className="mt-1 text-sm text-slate-500">当前接诊已收集的有效模块数量，可据此判断是否适合生成综合报告。</p>
              <ProgressBar value={activeSessionInput?.readiness.readyCount ?? 0} total={3} className="mt-4" />
            </div>
          </div>
        </Card>

        {sessionReportError ? (
          <Card variant="default" padding="md" className="border-rose-200 bg-rose-50 text-rose-700">
            <div className="text-sm">{sessionReportError}</div>
          </Card>
        ) : null}

        {treatmentPlanError ? (
          <Card variant="default" padding="md" className="border-rose-200 bg-rose-50 text-rose-700">
            <div className="text-sm">{treatmentPlanError}</div>
          </Card>
        ) : null}

        {!activeSessionInput ? (
          <StatePanel
            title="当前没有可生成报告的接诊"
            description="请先完成至少一个评估模块，或切换患者后再进入报告中心。"
          />
        ) : (
          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">评估结果</h2>
                    <p className="mt-1 text-sm text-slate-500">整合同一接诊下的体态、ROM 和语音问诊结构化结论。</p>
                  </div>
                  <StatusTag status={activeSessionInput.readiness.readyCount === 3 ? 'completed' : 'pending'} />
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                  {assessmentOutputs.map((item) => {
                    const Icon = item.presentation.icon;
                    return (
                      <AssessmentCard
                        key={item.type}
                        icon={Icon}
                        title={item.presentation.title}
                        description={item.presentation.description}
                        status={item.output ? outputStatusToWorkflowStatus(item.output.status) : 'pending'}
                        summary={item.summaryText}
                        meta={item.evidenceText}
                        actionLabel={item.output ? '查看结果' : undefined}
                        onAction={item.output ? () => setSelectedAssessment(item.output.sourceAssessment) : undefined}
                        accentClassName={item.presentation.accentClassName}
                      />
                    );
                  })}
                </div>
              </Card>

              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">AI 分析</h2>
                    <p className="mt-1 text-sm text-slate-500">将多模块结果压缩成短结论卡片，帮助快速判断本次接诊重点。</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Brain size={18} />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
                  {(generatedSessionReport?.insights?.length
                    ? generatedSessionReport.insights.map((insight, index) => ({
                        id: `insight-${index}`,
                        title: `AI 分析 ${index + 1}`,
                        summary: trimText(insight, 140),
                        evidence: [],
                        action: '用于生成综合报告结论。',
                      }))
                    : insightCards
                  ).map((card) => (
                    <div key={card.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="text-sm font-semibold text-slate-900">{card.title}</div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{card.summary}</p>
                      {'evidence' in card && card.evidence.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {card.evidence.map((evidence) => (
                            <span key={evidence} className="inline-flex rounded-full bg-white px-2.5 py-1 text-xs text-slate-500">
                              {evidence}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 text-xs text-slate-500">{card.action}</div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">康复建议</h2>
                    <p className="mt-1 text-sm text-slate-500">只保留可执行建议，避免长段文字占据页面注意力。</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                    <Sparkles size={18} />
                  </div>
                </div>

                {recommendationCards.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    生成综合报告或康复建议后，这里会展示结构化建议卡片。
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    {recommendationCards.map((recommendation, index) => (
                      <div key={`${recommendation}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">建议 {index + 1}</div>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-4">
              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">当前接诊摘要</h2>
                    <p className="mt-1 text-sm text-slate-500">不展开全文的情况下，快速确认当前患者、接诊与报告状态。</p>
                  </div>
                  <StatusTag status={generatedSessionReport ? 'completed' : 'pending'} />
                </div>

                <div className="mt-4 space-y-3 text-sm text-slate-600">
                  <div className="flex items-center gap-2"><User size={14} className="text-slate-400" />{activeSessionInput.patientName || activeSessionInput.patientId}</div>
                  <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" />{activeSessionInput.sessionId}</div>
                  <div className="flex items-center gap-2"><FileText size={14} className="text-slate-400" />{generatedSessionReport ? '综合报告已生成' : '综合报告待生成'}</div>
                </div>

                <div className="mt-4 space-y-2">
                  <Button variant="secondary" className="w-full justify-center" icon={<ExternalLink size={16} />} onClick={() => setSelectedReportMarkdown(generatedSessionReport?.markdown || draftReport || null)} disabled={!generatedSessionReport && !draftReport}>
                    查看报告全文
                  </Button>
                  <Button variant="secondary" className="w-full justify-center" icon={<FileText size={16} />} onClick={() => generatedSessionReport && exportSessionReportText(generatedSessionReport)} disabled={!generatedSessionReport}>
                    导出 Markdown
                  </Button>
                  <Button variant="secondary" className="w-full justify-center" icon={<FileJson size={16} />} onClick={() => generatedSessionReport && exportSessionReportJson(generatedSessionReport)} disabled={!generatedSessionReport}>
                    导出 JSON
                  </Button>
                </div>
              </Card>

              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">报告预览</h2>
                  <p className="mt-1 text-sm text-slate-500">这里只显示摘要，避免长文本挤占阅读焦点。</p>
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {trimText(generatedSessionReport?.markdown || draftReport, 260)}
                </div>
              </Card>

              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_36px_rgba(15,23,42,0.06)]">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">报告归档</h2>
                  <p className="mt-1 text-sm text-slate-500">保留当前筛选范围内的综合报告，便于复查与导出。</p>
                </div>
                <div className="custom-scrollbar mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {reportArchive.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                      当前筛选范围内还没有综合报告归档。
                    </div>
                  ) : (
                    reportArchive.map((report) => (
                      <div key={report.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{report.sessionId}</div>
                            <div className="mt-1 text-xs text-slate-500">{patientMap.get(report.patientId) || report.patientId}</div>
                          </div>
                          <StatusTag status="completed" />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{trimText(report.markdown, 120)}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" className="btn-secondary h-8 px-3" onClick={() => setSelectedReportMarkdown(report.markdown)}>
                            <ExternalLink size={12} />查看
                          </button>
                          <button type="button" className="btn-secondary h-8 px-3" onClick={() => exportSessionReportText(report)}>
                            <FileText size={12} />文本
                          </button>
                          <button type="button" className="btn-secondary h-8 px-3" onClick={() => exportSessionReportJson(report)}>
                            <FileJson size={12} />JSON
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </div>
          </section>
        )}
      </div>

      {selectedAssessment ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/45 p-4 md:p-8">
          <div className="dialog-shell max-h-[85vh] w-full max-w-4xl">
            <div className="dialog-header">
              <div>
                <div className="text-base font-semibold text-slate-900">评估详情</div>
                <div className="mt-1 inline-flex items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Calendar size={12} />{new Date(selectedAssessment.createdAt).toLocaleString('zh-CN')}</span>
                  <span className="inline-flex items-center gap-1"><User size={12} />{patientMap.get(selectedAssessment.patientId) || selectedAssessment.patientId}</span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setSelectedAssessment(null)}><X size={14} /></button>
            </div>

            <div className="custom-scrollbar max-h-[calc(85vh-146px)] space-y-4 overflow-y-auto p-5">
              <Card variant="default" padding="md">
                <div className="text-sm font-semibold text-slate-900">结构化摘要</div>
                <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {getAssessmentPreview(selectedAssessment) || '当前记录暂无可读摘要，可使用导出功能查看原始数据。'}
                </div>
              </Card>
            </div>

            <div className="dialog-footer">
              <button className="btn-secondary" onClick={() => exportToJson(selectedAssessment)}><FileJson size={14} /> JSON</button>
              <button className="btn-secondary" onClick={() => exportToCsv(selectedAssessment)}><FileSpreadsheet size={14} /> CSV</button>
              <button className="btn-primary" onClick={() => setSelectedAssessment(null)}>关闭</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedReportMarkdown ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 p-4 md:p-8">
          <div className="dialog-shell max-h-[85vh] w-full max-w-4xl">
            <div className="dialog-header">
              <div className="text-base font-semibold text-slate-900">报告全文</div>
              <button className="btn-icon" onClick={() => setSelectedReportMarkdown(null)}><X size={14} /></button>
            </div>
            <pre className={cn('custom-scrollbar max-h-[calc(85vh-76px)] overflow-auto whitespace-pre-wrap p-5 text-sm text-slate-700')}>
              {selectedReportMarkdown}
            </pre>
          </div>
        </div>
      ) : null}
    </div>
  );
};
