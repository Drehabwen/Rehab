import React, { useEffect, useMemo, useState } from 'react';
import { Brain, FileText, Layers, Sparkles, User } from 'lucide-react';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionReportStore } from '@/store/useSessionReportStore';
import { useTreatmentPlanStore } from '@/store/useTreatmentPlanStore';
import type { Assessment } from '@/types/assessment';
import type { SessionReportInput } from '@/types/report-center';
import { PageHeader, ProgressBar, StatusTag } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';
import { sanitizeReadableText } from '@/components/shared/MarkdownReport';
import { cn } from '@/lib/utils';
import { buildSessionReportGenerationRequest, buildSessionReportInputs, getAssessmentPreview } from '../report-center-utils';
import { buildSessionDraftReport, buildSessionInsightCards, sessionInsightToneClass } from '../report-center-insights';
import { exportMarkdownToPdf } from '@/utils/exportPdf';
import { ReportSessionSummary } from './report-center/ReportSessionSummary';
import { ReportModuleGrid } from './report-center/ReportModuleGrid';
import { ReportArchiveList } from './report-center/ReportArchiveList';
import { ReportCenterModals } from './report-center/ReportCenterModals';
import { SectionHeading } from './report-center/SectionHeading';
import type { ModuleCardItem, QuickViewState, ReportArchiveItem } from './report-center/types';

interface NexusReportCenterProps {
  mode?: 'datacenter' | 'reports';
  patientId?: string | null;
  sessionId?: string | null;
}

const moduleMeta = {
  posture: { title: '体态筛查', description: '查看本次会话中的体态异常、关键指标与风险摘要。', accentClassName: 'bg-blue-600 text-white', iconKey: 'activity' as const },
  rom: { title: 'ROM 辅助', description: '查看活动度测量、受限方向与左右对称情况。', accentClassName: 'bg-emerald-600 text-white', iconKey: 'layers' as const },
  medvoice: { title: '问询补充', description: '查看问询记录、主诉摘要和结构化补充内容。', accentClassName: 'bg-violet-600 text-white', iconKey: 'mic' as const },
  fatigue: { title: '稳定性/疲劳参考', description: '查看稳定性、抖动和负荷相关参考指标。', accentClassName: 'bg-amber-500 text-white', iconKey: 'brain' as const },
};

const typeLabel = {
  posture: '体态筛查',
  rom: 'ROM 辅助',
  medvoice: '问询补充',
  fatigue: '稳定性/疲劳',
};

const trimText = (value: string | null | undefined, maxLength = 120) => {
  if (!value) return '等待生成内容';
  const compact = sanitizeReadableText(value).replace(/\s+/g, ' ').trim();
  if (!compact) return '等待生成内容';
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}...`;
};

const extractRecommendationCards = (content: string | null | undefined): string[] => {
  if (!content) return [];
  return sanitizeReadableText(content)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
};

export const NexusReportCenter: React.FC<NexusReportCenterProps> = ({ patientId = null, sessionId = null }) => {
  const { assessments, loadAssessments } = useAssessmentStore();
  const { patients, loadPatients } = usePatientStore();
  const { reports, isGenerating, error: reportError, loadReports, generateReport, getLatestReportBySessionId } = useSessionReportStore();
  const { currentContent, isGenerating: isGeneratingPlan, error: planError, generatePlanFromSessionReport, linkedSessionId, linkedSessionReportId } = useTreatmentPlanStore();

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patientId);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(sessionId);
  const [patientType, setPatientType] = useState<'adult' | 'adolescent'>('adolescent');
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [selectedQuickView, setSelectedQuickView] = useState<QuickViewState | null>(null);
  const [selectedReportMarkdown, setSelectedReportMarkdown] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  useEffect(() => {
    loadPatients();
    loadAssessments();
    loadReports();
  }, [loadPatients, loadAssessments, loadReports]);

  useEffect(() => setSelectedPatientId(patientId), [patientId]);
  useEffect(() => setSelectedSessionId(sessionId), [sessionId]);

  const patientMap = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((patient) => map.set(patient.id, patient.name || `学生 ${patient.id}`));
    return map;
  }, [patients]);

  const scopedAssessments = useMemo(
    () => (selectedPatientId ? assessments.filter((item) => item.patientId === selectedPatientId) : assessments),
    [assessments, selectedPatientId],
  );

  const sessionInputs = useMemo(
    () => buildSessionReportInputs(scopedAssessments, patientMap),
    [scopedAssessments, patientMap],
  );

  useEffect(() => {
    if (selectedSessionId && sessionInputs.some((input) => input.sessionId === selectedSessionId)) {
      return;
    }
    setSelectedSessionId(sessionInputs[0]?.sessionId ?? null);
  }, [selectedSessionId, sessionInputs]);

  const activeSessionInput = useMemo<SessionReportInput | null>(
    () => sessionInputs.find((input) => input.sessionId === selectedSessionId) ?? sessionInputs[0] ?? null,
    [selectedSessionId, sessionInputs],
  );

  const generatedSessionReport = useMemo(
    () => (activeSessionInput ? getLatestReportBySessionId(activeSessionInput.sessionId) : undefined),
    [activeSessionInput, getLatestReportBySessionId],
  );

  const hasVisiblePlan = Boolean(currentContent)
    && Boolean(activeSessionInput)
    && linkedSessionId === activeSessionInput?.sessionId
    && linkedSessionReportId === generatedSessionReport?.id;

  const draftReport = useMemo(
    () => (activeSessionInput ? buildSessionDraftReport(activeSessionInput) : null),
    [activeSessionInput],
  );

  const recommendationCards = useMemo(() => {
    if (generatedSessionReport?.recommendations?.length) return generatedSessionReport.recommendations.slice(0, 4);
    if (hasVisiblePlan) return extractRecommendationCards(currentContent);
    return [];
  }, [generatedSessionReport, hasVisiblePlan, currentContent]);

  const insightCards = useMemo(
    () => (activeSessionInput ? buildSessionInsightCards(activeSessionInput, patientType) : []),
    [activeSessionInput, patientType],
  );

  const moduleItems = useMemo<ModuleCardItem[]>(() => (
    (['posture', 'rom', 'medvoice', 'fatigue'] as const).map((type) => {
      const output = activeSessionInput?.outputs[type];
      const meta = moduleMeta[type];
      return {
        type,
        title: meta.title,
        description: meta.description,
        status: output?.status ?? 'missing',
        summaryText: trimText(output?.preview ?? null),
        evidenceText: output ? `证据数 ${output.evidenceCount ?? 0}` : '暂无结果',
        accentClassName: meta.accentClassName,
        iconKey: meta.iconKey,
        assessment: output?.sourceAssessment,
      };
    })
  ), [activeSessionInput]);

  const archiveItems = useMemo<ReportArchiveItem[]>(() => (
    reports
      .filter((report) => {
        if (selectedPatientId && report.patientId !== selectedPatientId) return false;
        if (selectedSessionId && report.sessionId !== selectedSessionId) return false;
        return true;
      })
      .map((report) => ({
        ...report,
        patientName: patientMap.get(report.patientId) || report.patientId,
        previewText: trimText(report.markdown, 120),
      }))
  ), [reports, selectedPatientId, selectedSessionId, patientMap]);

  const selectedAssessmentPreview = selectedAssessment ? getAssessmentPreview(selectedAssessment) : null;
  const selectedQuickViewContent = sanitizeReadableText(selectedQuickView?.content);
  const selectedReportContent = sanitizeReadableText(selectedReportMarkdown);
  const activePatientLabel = activeSessionInput ? (activeSessionInput.patientName || activeSessionInput.patientId) : undefined;
  const activeSessionLabel = activeSessionInput?.sessionId;

  const exportAssessmentJson = () => {
    if (!selectedAssessment) return;
    const blob = new Blob([JSON.stringify(selectedAssessment, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `assessment-${selectedAssessment.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportAssessmentCsv = () => {
    if (!selectedAssessment) return;
    let csvContent = '';
    if (selectedAssessment.data.posture?.metrics) {
      csvContent = `metric,value\n${Object.entries(selectedAssessment.data.posture.metrics).map(([key, value]) => `${key},${value}`).join('\n')}`;
    }
    if (!csvContent) return;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `assessment-${selectedAssessment.id}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportReportPdf = async (markdown: string | null | undefined, fileName: string, title: string) => {
    const content = sanitizeReadableText(markdown);
    if (!content) return;
    setIsExportingPdf(true);
    try {
      await exportMarkdownToPdf({
        markdown: content,
        fileName,
        title,
        subtitle: activePatientLabel && activeSessionLabel ? `${activePatientLabel} · ${activeSessionLabel}` : undefined,
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const exportGeneratedMarkdown = () => {
    if (!generatedSessionReport) return;
    const blob = new Blob([generatedSessionReport.markdown], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `screening-report-${generatedSessionReport.sessionId}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportGeneratedJson = () => {
    if (!generatedSessionReport) return;
    const blob = new Blob([JSON.stringify(generatedSessionReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `screening-report-${generatedSessionReport.sessionId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateSessionReport = async () => {
    if (!activeSessionInput) return;
    const report = await generateReport({ ...buildSessionReportGenerationRequest(activeSessionInput), patientType });
    setSelectedReportMarkdown(report.markdown);
  };

  const handleGeneratePlan = async () => {
    if (!activeSessionInput || !generatedSessionReport) return;
    await generatePlanFromSessionReport({
      patientId: generatedSessionReport.patientId,
      patientType,
      sessionId: generatedSessionReport.sessionId,
      sessionReportId: generatedSessionReport.id,
      sessionReportMarkdown: generatedSessionReport.markdown,
      insights: generatedSessionReport.insights,
      recommendations: generatedSessionReport.recommendations,
    });
  };

  const progressValue = activeSessionInput
    ? activeSessionInput.readiness.readyCount + activeSessionInput.readiness.partialCount
    : 0;

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="SCREENING REPORT CENTER"
          title="筛查报告中心"
          description="统一管理筛查会话、生成正式报告、查看归档记录，并将结果沉淀到学生档案与复测流程。"
          compact
          className="border-slate-200 bg-white/92 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
          summary={activeSessionInput ? (
            <>
              <StatusTag status={generatedSessionReport ? 'completed' : 'pending'} />
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                当前会话 {activeSessionInput.sessionId}
              </span>
            </>
          ) : undefined}
          actions={
            <>
              <Button variant="secondary" icon={<Sparkles size={16} />} onClick={handleGeneratePlan} loading={isGeneratingPlan} disabled={!generatedSessionReport}>
                生成干预建议
              </Button>
              <Button variant="primary" icon={<FileText size={16} />} onClick={handleGenerateSessionReport} loading={isGenerating} disabled={!activeSessionInput}>
                生成正式报告
              </Button>
            </>
          }
        />

        <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900">筛查对象与会话筛选</div>
              <p className="mt-1 text-sm text-slate-500">先选择学生与会话，再决定是查看草稿、生成正式报告，还是导出归档结果。</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              归档报告 {archiveItems.length}
            </div>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><User size={16} className="text-blue-600" />学生</div>
              <select value={selectedPatientId ?? 'all'} onChange={(e) => setSelectedPatientId(e.target.value === 'all' ? null : e.target.value)} className="field-select w-full bg-white">
                <option value="all">全部学生</option>
                {patients.map((patient) => <option key={patient.id} value={patient.id}>{(patient.name || `学生 ${patient.id}`) + ` · ${patient.id}`}</option>)}
              </select>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><Layers size={16} className="text-emerald-600" />会话</div>
              <select value={selectedSessionId ?? 'all'} onChange={(e) => setSelectedSessionId(e.target.value === 'all' ? null : e.target.value)} className="field-select w-full bg-white">
                <option value="all">最新会话</option>
                {sessionInputs.map((input) => <option key={input.sessionId} value={input.sessionId}>{(input.patientName || input.patientId) + ` · ${input.sessionId}`}</option>)}
              </select>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900"><Brain size={16} className="text-violet-600" />报告模式</div>
              <select value={patientType} onChange={(e) => setPatientType(e.target.value as 'adult' | 'adolescent')} className="field-select w-full bg-white">
                <option value="adolescent">青少年筛查模式</option>
                <option value="adult">通用模式</option>
              </select>
            </div>
          </div>
        </Card>

        {!activeSessionInput ? (
          <StatePanel title="暂无可用筛查会话" description="先完成至少一次筛查采集，再回到报告中心生成正式报告。" />
        ) : (
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
            <div className="space-y-5">
              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <SectionHeading eyebrow="SESSION STATUS" title="报告准备度" description="基于当前会话的四类输入模块，快速判断是否适合生成正式归档报告。" icon={<FileText size={18} />} />
                <div className="mt-4 space-y-4">
                  <ProgressBar value={progressValue} total={4} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><div className="text-xs text-slate-500">已就绪</div><div className="mt-1 text-2xl font-semibold text-slate-900">{activeSessionInput.readiness.readyCount}</div></div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><div className="text-xs text-slate-500">部分就绪</div><div className="mt-1 text-2xl font-semibold text-slate-900">{activeSessionInput.readiness.partialCount}</div></div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4"><div className="text-xs text-slate-500">缺失模块</div><div className="mt-1 text-sm font-semibold text-slate-900">{activeSessionInput.readiness.missingTypes.length > 0 ? activeSessionInput.readiness.missingTypes.map((type) => typeLabel[type]).join(' / ') : '无'}</div></div>
                  </div>
                </div>
              </Card>

              <ReportModuleGrid
                items={moduleItems}
                onOpenAssessment={(assessmentId) => setSelectedAssessment(assessments.find((item) => item.id === assessmentId) ?? null)}
              />

              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <SectionHeading eyebrow="REPORT INSIGHTS" title="归档洞察" description="这些洞察用于组织报告重点，不等同于诊断结论。" icon={<Sparkles size={18} />} />
                <div className="mt-4 grid gap-3">
                  {insightCards.map((card) => (
                    <div key={card.id} className={cn('rounded-2xl border p-4', sessionInsightToneClass(card.tone))}>
                      <div className="text-sm font-semibold">{card.title}</div>
                      <p className="mt-2 text-sm">{card.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.evidence.map((item) => <span key={item} className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600">{item}</span>)}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <p className="text-xs text-slate-600">{card.action}</p>
                        <Button variant="secondary" size="sm" onClick={() => setSelectedQuickView({ title: card.title, subtitle: '报告洞察', content: `${card.summary}\n\n${card.action}` })}>展开</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
                <SectionHeading eyebrow="RECOMMENDATIONS" title="建议摘要" description="显示正式报告或干预建议中的前几条关键结论。" icon={<Sparkles size={18} />} />
                {recommendationCards.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">生成正式报告或干预建议后，这里会展示结构化建议摘要。</div>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {recommendationCards.map((recommendation, index) => (
                      <div key={`${recommendation}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3.5">
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold tracking-wide text-slate-400">建议 {index + 1}</div>
                          <p className="mt-1 text-sm text-slate-700">{recommendation}</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => setSelectedQuickView({ title: `建议 ${index + 1}`, subtitle: '报告建议', content: recommendation })}>查看</Button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            <div className="space-y-5">
              <ReportSessionSummary
                activeSessionInput={activeSessionInput}
                generatedSessionReport={generatedSessionReport}
                draftReport={draftReport}
                isExportingPdf={isExportingPdf}
                onOpenReport={setSelectedReportMarkdown}
                onExportPdf={exportReportPdf}
                onExportMarkdown={exportGeneratedMarkdown}
                onExportJson={exportGeneratedJson}
              />

              <ReportArchiveList
                items={archiveItems}
                isExportingPdf={isExportingPdf}
                onOpenReport={setSelectedReportMarkdown}
                onExportPdf={exportReportPdf}
              />

              {(reportError || planError) ? (
                <Card variant="default" padding="md" className="border-rose-200 bg-rose-50 text-rose-700">
                  {reportError || planError}
                </Card>
              ) : null}
            </div>
          </section>
        )}
      </div>

      <ReportCenterModals
        selectedAssessment={selectedAssessment}
        selectedAssessmentPreview={selectedAssessmentPreview}
        selectedQuickView={selectedQuickView}
        selectedQuickViewContent={selectedQuickViewContent}
        selectedReportMarkdown={selectedReportMarkdown}
        selectedReportContent={selectedReportContent}
        selectedPatientLabel={activePatientLabel}
        activeSessionLabel={activeSessionLabel}
        isExportingPdf={isExportingPdf}
        onCloseAssessment={() => setSelectedAssessment(null)}
        onCloseQuickView={() => setSelectedQuickView(null)}
        onCloseReport={() => setSelectedReportMarkdown(null)}
        onExportAssessmentJson={exportAssessmentJson}
        onExportAssessmentCsv={exportAssessmentCsv}
        onExportReportPdf={() => exportReportPdf(selectedReportContent, `screening-report-${activeSessionLabel || 'preview'}.pdf`, '筛查报告')}
      />
    </div>
  );
};
