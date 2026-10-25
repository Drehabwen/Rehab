import type { Assessment } from '@/types/assessment';
import type { SessionReportInputStatus, SessionReportInputType } from '@/types/report-center';

/**
 * 统一的评估"就绪度"判定（单一事实来源）。
 * 接诊流、报告中心、报告门禁都应调用这里，避免两套标准得出不同结论。
 *
 * ready   = 结构化/可引用结果完整（可进报告正文）
 * partial = 有原始数据但缺结论（需补录或补生成）
 * missing = 无该类型评估
 */
export function getAssessmentReadiness(
  assessment: Assessment,
  type: SessionReportInputType,
): SessionReportInputStatus {
  switch (type) {
    case 'posture': {
      const posture = assessment.data.posture;
      if (posture?.markdownReport || posture?.auxiliaryDiagnosis) return 'ready';
      if (posture?.metrics || (posture?.issues?.length ?? 0) > 0) return 'partial';
      return 'missing';
    }
    case 'rom': {
      const rom = assessment.data.rom;
      if (rom?.summary || (rom?.recommendations?.length ?? 0) > 0) return 'ready';
      if ((rom?.items?.length ?? 0) > 0) return 'partial';
      return 'missing';
    }
    case 'medvoice': {
      const medvoice = assessment.data.medvoice;
      const structured = medvoice?.structuredCase;
      const hasStructured = Boolean(structured && Object.values(structured).some((value) => value && String(value).trim()));
      if (hasStructured) return 'ready';
      if (medvoice?.transcript?.trim()) return 'partial';
      return 'missing';
    }
    case 'scale': {
      const scale = assessment.data.scale;
      // 统一标准：有总分即可引用（AI 解读是增强项，不再作为出报告的前置条件）
      if (scale?.aiInterpretation) return 'ready';
      if (scale?.totalScore !== undefined || (scale?.answers?.length ?? 0) > 0) return 'ready';
      return 'missing';
    }
    case 'adams': {
      const adams = assessment.data.adams;
      if (adams?.remarks || adams?.atrDegrees !== undefined) return 'ready';
      return 'missing';
    }
    default:
      return 'missing';
  }
}

export interface ReadinessSummary {
  ready: number;
  partial: number;
  missing: number;
  total: number;
  /** 可引用进报告正文的类型 */
  readyTypes: SessionReportInputType[];
}

export function summarizeReadiness(
  entries: Array<{ assessment: Assessment; type: SessionReportInputType }>,
): ReadinessSummary {
  const summary: ReadinessSummary = { ready: 0, partial: 0, missing: 0, total: entries.length, readyTypes: [] };
  for (const entry of entries) {
    const status = getAssessmentReadiness(entry.assessment, entry.type);
    summary[status] += 1;
    if (status === 'ready' && !summary.readyTypes.includes(entry.type)) summary.readyTypes.push(entry.type);
  }
  return summary;
}
