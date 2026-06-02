import React, { useEffect, useMemo, useState } from 'react';
import { Activity, ClipboardList, Compass, Layers, Mic, Send, Sparkles, Wand2 } from 'lucide-react';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionReportStore } from '@/store/useSessionReportStore';
import { useTreatmentPlanStore } from '@/store/useTreatmentPlanStore';
import type { Assessment } from '@/types/assessment';
import type { SessionReportOutput } from '@/types/report-center';
import { PageHeader, StatusTag } from '@/components/workflow';
import { Button, Card } from '@/components/ui';
import { StatePanel } from '@/components/layout';
import { sanitizeReadableText } from '@/components/shared/MarkdownReport';
import {
  buildAssessmentOutputSummary,
  buildSessionReportGenerationRequest,
  buildSessionReportInputs,
} from '../report-center-utils';
import { buildSessionDraftReport, buildSessionInsightCards } from '../report-center-insights';
import { exportMarkdownToPdf } from '@/utils/exportPdf';
import { IntegrationService } from '@/services/integrationService';

// Sub-components
import { ReportFilterPanel } from './report-center/ReportFilterPanel';
import { ModuleResultsGrid } from './report-center/ModuleResultsGrid';
import { ReportInsightsList } from './report-center/ReportInsightsList';
import { ReportSummarySidebar } from './report-center/ReportSummarySidebar';
import { ReportDetailDialogs } from './report-center/ReportDetailDialogs';

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
  scale: {
    title: '量表评估',
    description: '查看日常生活自理、平衡、肌力及痉挛等多维量化评分结果与AI解读。',
    icon: ClipboardList,
    accentClassName: 'bg-teal-600 text-white',
  },
  adams: {
    title: '亚当斯筛查',
    description: '查看脊柱侧弯躯干旋转角（ATR）、剃刀背隆起方向与Cobb角估计。',
    icon: Compass,
    accentClassName: 'bg-purple-600 text-white',
  },
} as const;

const trimText = (value: string | null | undefined, maxLength = 120) => {
  if (!value) return '当前模块尚未生成结构化摘要。';
  const compact = sanitizeReadableText(value).replace(/\s+/g, ' ').trim();
  if (!compact) return '当前模块尚未生成结构化摘要。';
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength)}...`;
};

const extractRecommendationCards = (content: string | null | undefined): string[] => {
  if (!content) return [];
  return sanitizeReadableText(content)
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\d.\s]+/, '').trim())
    .filter((line) => line.length > 0)
    .slice(0, 4);
};

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
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPushingToParent, setIsPushingToParent] = useState(false);
  const [pushResultMsg, setPushResultMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([loadPatients(), loadAssessments(), loadSessionReports()]);
    };
    loadInitialData();
  }, [loadPatients, loadAssessments, loadSessionReports]);

  useEffect(() => {
    if (patientId !== undefined) setSelectedPatientId(patientId);
  }, [patientId]);

  useEffect(() => {
    if (sessionId !== undefined) setSelectedSessionId(sessionId);
  }, [sessionId]);

  const patientMap = useMemo(() => {
    const map = new Map<string, string>();
    patients.forEach((p) => map.set(p.id, p.name || `患者 ${p.id}`));
    return map;
  }, [patients]);

  const availablePatients = useMemo(() => {
    const ids = new Set<string>();
    assessments.forEach((a) => ids.add(a.patientId));
    sessionReports.forEach((r) => ids.add(r.patientId));
    return patients.filter((p) => ids.has(p.id));
  }, [assessments, patients, sessionReports]);

  const patientScopedAssessments = useMemo(() => {
    return selectedPatientId
      ? assessments.filter((a) => a.patientId === selectedPatientId)
      : assessments;
  }, [assessments, selectedPatientId]);

  const sessionInputs = useMemo(
    () => buildSessionReportInputs(patientScopedAssessments, patientMap),
    [patientScopedAssessments, patientMap],
  );

  useEffect(() => {
    if (sessionInputs.length > 0) {
      if (!selectedSessionId || !sessionInputs.some((input) => input.sessionId === selectedSessionId)) {
        setSelectedSessionId(sessionInputs[0].sessionId);
      }
    } else {
      setSelectedSessionId(null);
    }
  }, [selectedSessionId, sessionInputs]);

  const activeSessionInput = useMemo(() => {
    if (sessionInputs.length === 0) return null;
    return sessionInputs.find((input) => input.sessionId === selectedSessionId) ?? sessionInputs[0] ?? null;
  }, [selectedSessionId, sessionInputs]);

  const generatedSessionReport = useMemo(() => {
    if (!activeSessionInput) return undefined;
    return getLatestReportBySessionId(activeSessionInput.sessionId);
  }, [activeSessionInput, getLatestReportBySessionId, sessionReports]);

  const hasVisibleTreatmentPlan = Boolean(currentTreatmentPlanContent) &&
    Boolean(activeSessionInput) &&
    linkedSessionId === activeSessionInput?.sessionId &&
    linkedSessionReportId === generatedSessionReport?.id;

  const insightCards = useMemo(() => {
    if (!activeSessionInput) return [];
    return buildSessionInsightCards(activeSessionInput);
  }, [activeSessionInput]);

  const draftReport = useMemo(() => {
    if (!activeSessionInput) return null;
    return buildSessionDraftReport(activeSessionInput);
  }, [activeSessionInput]);

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
    if (!activeSessionInput) return [];
    return (['posture', 'adams', 'rom', 'medvoice', 'scale'] as const).map((type) => {
      const output = activeSessionInput.outputs[type];
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

  // Export handlers
  const exportToJson = (assessment: Assessment) => {
    const blob = new Blob([JSON.stringify(assessment, null, 2)], { type: 'application/json' });
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
      csvContent = 'metric,value\n' + Object.entries(assessment.data.posture.metrics).map(([k, v]) => `${k},${v}`).join('\n');
    } else if (assessment.data.rom?.items) {
      csvContent = 'joint,direction,side,angle,maxAngle,minAngle,confidence\n';
      assessment.data.rom.items.forEach((item) => {
        csvContent += `${item.joint},${item.direction},${item.side},${item.angle},${item.maxAngle},${item.minAngle},${item.confidence}\n`;
      });
    } else if (assessment.data.medvoice) {
      const mv = assessment.data.medvoice;
      csvContent = `field,value\npatient_name,${mv.patientInfo.name}\nvisit_date,${mv.patientInfo.visit_date}\nview_mode,${mv.viewMode}\n`;
    } else if (assessment.data.scale) {
      const scale = assessment.data.scale;
      csvContent = 'questionId,questionText,category,score,answerText\n';
      scale.answers.forEach((ans) => {
        csvContent += `${ans.questionId},"${ans.questionText.replace(/"/g, '""')}",${ans.category},${ans.score},"${ans.answerText.replace(/"/g, '""')}"\n`;
      });
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

  const handleExportReportPdf = async (markdown: string | null | undefined, fileName: string, title: string) => {
    const content = sanitizeReadableText(markdown);
    if (!content || !activeSessionInput) return;
    const subtitle = `${activeSessionInput.patientName || activeSessionInput.patientId} · ${activeSessionInput.sessionId}`;
    setIsExportingPdf(true);
    try {
      await exportMarkdownToPdf({ markdown: content, fileName, title, subtitle });
    } catch (error) {
      console.error('导出 PDF 失败:', error);
      alert('导出 PDF 失败，请重试');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleGenerateSessionReport = async () => {
    if (!activeSessionInput) return;
    try {
      const report = await generateReport(buildSessionReportGenerationRequest(activeSessionInput));
      setSelectedReportMarkdown(report.markdown);
    } catch (error) {
      console.error('生成报告失败:', error);
    }
  };

  const handleGenerateTreatmentPlan = async () => {
    if (!generatedSessionReport || !activeSessionInput) return;
    try {
      await generatePlanFromSessionReport({
        patientId: generatedSessionReport.patientId,
        sessionId: generatedSessionReport.sessionId,
        sessionReportId: generatedSessionReport.id,
        sessionReportMarkdown: generatedSessionReport.markdown,
        insights: generatedSessionReport.insights,
        recommendations: generatedSessionReport.recommendations,
      });
    } catch (error) {
      console.error('生成治疗计划失败:', error);
    }
  };

  const handlePushToParent = async () => {
    if (!activeSessionInput || !currentTreatmentPlanContent) return;
    setIsPushingToParent(true);
    setPushResultMsg(null);
    try {
      const result = await IntegrationService.pushTreatmentPlan({
        patient_id: activeSessionInput.patientId,
        patient_name: activeSessionInput.patientName,
        session_id: activeSessionInput.sessionId,
        therapist_name: '康复师',
        plan_content: currentTreatmentPlanContent,
      });
      setPushResultMsg(`已成功推送至家长端（处方ID: ${result.plan_id}）`);
    } catch (err) {
      console.error('推送治疗计划失败:', err);
      setPushResultMsg(err instanceof Error ? err.message : '推送失败，请检查网络后重试');
    } finally {
      setIsPushingToParent(false);
    }
  };

  return (
    <div className="rehab-page custom-scrollbar">
      <div className="rehab-page-inner space-y-5">
        <PageHeader
          eyebrow="接诊 -> 评估 -> 报告"
          title="报告中心"
          description="报告中心聚合当前接诊结果，突出评估结果、AI 分析和康复建议。页面只展示结构化信息，详细文本放到查看弹层。"
          compact
          className="border-slate-200 bg-white/92 shadow-[0_10px_28px_rgba(15,23,42,0.05)]"
          summary={
            activeSessionInput ? (
              <>
                <StatusTag status={generatedSessionReport ? 'completed' : 'pending'} />
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
                  接诊号 {activeSessionInput.sessionId}
                </span>
              </>
            ) : undefined
          }
          actions={
            <>
              <Button variant="secondary" icon={<Wand2 size={16} />} onClick={handleGenerateTreatmentPlan} loading={isGeneratingTreatmentPlan} disabled={!generatedSessionReport}>生成康复建议</Button>
              <Button
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
                icon={<Send size={16} />}
                onClick={handlePushToParent}
                loading={isPushingToParent}
                disabled={!hasVisibleTreatmentPlan || isPushingToParent}
              >
                推送至家长端
              </Button>
              <Button variant="primary" icon={<Sparkles size={16} />} onClick={handleGenerateSessionReport} loading={isGeneratingSessionReport} disabled={!activeSessionInput}>生成综合报告</Button>
            </>
          }
        />

        <Card variant="default" padding="lg" className="border-slate-200 bg-white/95 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-slate-900">报告筛选</div>
              <p className="mt-1 text-sm text-slate-500">先确定患者与接诊范围，再决定是否生成综合报告和康复建议。</p>
            </div>
            <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              当前接诊 {activeSessionInput?.sessionId || '未选择'}
            </div>
          </div>

          <ReportFilterPanel
            availablePatients={availablePatients}
            selectedPatientId={selectedPatientId}
            onPatientChange={setSelectedPatientId}
            sessionInputs={sessionInputs}
            selectedSessionId={selectedSessionId}
            onSessionChange={setSelectedSessionId}
            activeSessionInput={activeSessionInput}
          />
        </Card>

        {sessionReportError && (
          <Card variant="default" padding="md" className="border-rose-200 bg-rose-50 text-rose-700">
            <div className="text-sm">{sessionReportError}</div>
          </Card>
        )}

        {treatmentPlanError && (
          <Card variant="default" padding="md" className="border-rose-200 bg-rose-50 text-rose-700">
            <div className="text-sm">{treatmentPlanError}</div>
          </Card>
        )}

        {pushResultMsg && (
          <Card variant="default" padding="md" className={pushResultMsg.includes('失败') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}>
            <div className="text-sm">{pushResultMsg}</div>
          </Card>
        )}

        {!activeSessionInput ? (
          <StatePanel
            title="当前没有可生成报告的接诊"
            description="请先完成至少一个评估模块，或切换患者后再进入报告中心。"
          />
        ) : (
          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-4">
              <ModuleResultsGrid
                assessmentOutputs={assessmentOutputs}
                onViewDetails={setSelectedAssessment}
                readyCount={activeSessionInput.readiness.readyCount}
              />
              <ReportInsightsList
                generatedSessionReport={generatedSessionReport}
                insightCards={insightCards}
                recommendationCards={recommendationCards}
              />
            </div>

            <ReportSummarySidebar
              activeSessionInput={activeSessionInput}
              generatedSessionReport={generatedSessionReport}
              draftReport={draftReport}
              reportArchive={reportArchive}
              patientMap={patientMap}
              isExportingPdf={isExportingPdf}
              onViewReportFull={setSelectedReportMarkdown}
              onExportPdf={handleExportReportPdf}
              onExportMarkdown={exportSessionReportText}
              onExportJson={exportSessionReportJson}
            />
          </section>
        )}
      </div>

      <ReportDetailDialogs
        selectedAssessment={selectedAssessment}
        onCloseAssessment={() => setSelectedAssessment(null)}
        selectedReportMarkdown={selectedReportMarkdown}
        onCloseReport={() => setSelectedReportMarkdown(null)}
        patientMap={patientMap}
        isExportingPdf={isExportingPdf}
        onExportAssessmentJson={exportToJson}
        onExportAssessmentCsv={exportToCsv}
        onExportReportPdf={handleExportReportPdf}
      />
    </div>
  );
};
