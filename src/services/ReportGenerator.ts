import type { Assessment, AssessmentRecord, TreatmentPlanVersion } from '../types/assessment';
import { ScreeningArchiveService } from './DataCenterService';
import { DataStandardizationService } from './DataStandardizationService';
import { LLMReportService } from './LLMReportService';

export type LegacyReportType = 'assessment' | 'treatment' | 'progress' | 'comprehensive';
export type ScreeningReportType = 'screening' | 'intervention' | 'follow-up' | 'overview';
export type ReportType = ScreeningReportType | LegacyReportType;
export type ReportFormat = 'markdown' | 'html' | 'pdf';

export interface ScreeningReportConfig {
  type: ReportType;
  format: ReportFormat;
  patientId: string;
  assessmentIds?: string[];
  interventionPlanId?: string;
  treatmentPlanId?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  includeCharts?: boolean;
  includeRecommendations?: boolean;
  includeRawData?: boolean;
}

export interface ScreeningReportData {
  id: string;
  patientId: string;
  type: ScreeningReportType;
  format: ReportFormat;
  title: string;
  content: string;
  createdAt: number;
  data: {
    assessments: Assessment[];
    interventionPlans: TreatmentPlanVersion[];
    records: AssessmentRecord[];
    metrics: Record<string, number>;
    insights: string[];
  };
}

type ProcessedReportData = ScreeningReportData['data'];

type RecordMetricSnapshot = {
  metric: string;
  average: number;
  min: number;
  max: number;
  sampleCount: number;
};

type RecordSummary = {
  totalRecords: number;
  latestRecordAt: string | null;
  assessmentTypeBreakdown: Record<'front' | 'side' | 'back', number>;
  averageImprovement: number | null;
  feedbackHighlights: string[];
  metricSnapshots: RecordMetricSnapshot[];
  interventionTrends: Array<{
    interventionId: string;
    protocolName?: string;
    beforeAt: string;
    afterAt: string;
    deltas: Partial<Record<'rpe' | 'stabilityScore' | 'jitterIndex' | 'fatigueScore' | 'recoveryScore', number>>;
  }>;
};

type CompactReportRecord = {
  id: string;
  timestamp: string;
  assessmentType: 'front' | 'side' | 'back';
  angles: Record<string, number>;
  metrics: Record<string, number>;
  feedback?: string;
  improvement?: number;
};

const REPORT_STORAGE_KEY = 'rehab_reports';

const reportTypeMetadata: Record<
  ScreeningReportType,
  {
    titlePrefix: string;
    intro: string;
    requiredSections: string[];
    focus: string[];
  }
> = {
  screening: {
    titlePrefix: '筛查报告',
    intro: '请根据以下筛查、指标和复测记录，生成一份面向机构与执行人员的体态筛查报告。',
    requiredSections: ['筛查概览', '关键发现', '风险分层', '复测建议'],
    focus: ['异常体态表现', '量化指标变化', '需要优先复测的风险点'],
  },
  intervention: {
    titlePrefix: '干预建议报告',
    intro: '请根据以下筛查结果与干预建议版本，生成一份可执行的干预指导报告。',
    requiredSections: ['建议概览', '阶段目标', '执行要点', '复测条件'],
    focus: ['动作与训练安排', '负荷控制', '随访与复测节点'],
  },
  'follow-up': {
    titlePrefix: '复测跟踪报告',
    intro: '请根据以下历次筛查记录和阶段变化，生成一份复测跟踪报告。',
    requiredSections: ['变化概览', '趋势判断', '风险变化', '下一步建议'],
    focus: ['前后变化', '趋势走向', '是否需要升级干预'],
  },
  overview: {
    titlePrefix: '综合归档报告',
    intro: '请根据以下筛查、干预建议和复测记录，生成一份完整的综合归档报告。',
    requiredSections: ['个体概况', '筛查结果', '干预建议', '复测追踪', '总结建议'],
    focus: ['整体风险状态', '筛查与建议的一致性', '后续管理优先级'],
  },
};

function normalizeReportType(type: ReportType): ScreeningReportType {
  switch (type) {
    case 'assessment':
      return 'screening';
    case 'treatment':
      return 'intervention';
    case 'progress':
      return 'follow-up';
    case 'comprehensive':
      return 'overview';
    default:
      return type;
  }
}

function buildPrompt(
  type: ScreeningReportType,
  format: ReportFormat,
  data: ProcessedReportData,
  recordSummary: RecordSummary,
  compactRecords: CompactReportRecord[],
): string {
  const meta = reportTypeMetadata[type];
  const payload = {
    assessments: data.assessments.map((assessment) => DataStandardizationService.standardizeAssessment(assessment)),
    interventionPlans: data.interventionPlans,
    metrics: data.metrics,
    insights: data.insights,
    recordSummary,
    recentRecords: compactRecords,
  };

  return [
    meta.intro,
    '',
    '数据摘要：',
    JSON.stringify(payload, null, 2),
    '',
    '生成要求：',
    `1. 报告必须包含：${meta.requiredSections.join('、')}。`,
    `2. 重点关注：${meta.focus.join('、')}。`,
    '3. 语言风格保持专业、克制、可执行，避免夸张表述。',
    '4. 若存在前后对比数据，明确写出变化方向和幅度。',
    '5. 若数据不足，直接指出信息缺口与补采建议。',
    `6. 输出格式使用 ${format === 'markdown' ? 'Markdown' : format.toUpperCase()}。`,
  ].join('\n');
}

export class ScreeningReportGenerator {
  static async generateReport(config: ScreeningReportConfig): Promise<ScreeningReportData> {
    try {
      const normalizedType = normalizeReportType(config.type);
      const data = await this.collectData(config);
      const standardizedData = this.processData(data);
      const reportContent = await this.generateContent(standardizedData, normalizedType, config.format);

      return {
        id: `report_${Date.now()}`,
        patientId: config.patientId,
        type: normalizedType,
        format: config.format,
        title: this.generateTitle(normalizedType),
        content: reportContent,
        createdAt: Date.now(),
        data: standardizedData,
      };
    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  }

  private static async collectData(config: ScreeningReportConfig): Promise<{
    assessments: Assessment[];
    interventionPlans: TreatmentPlanVersion[];
    records: AssessmentRecord[];
  }> {
    let assessments = config.assessmentIds
      ? config.assessmentIds.map((id) => {
          const assessment = ScreeningArchiveService.getAssessment(id);
          if (!assessment) {
            throw new Error(`未找到筛查记录 ${id}。`);
          }
          return assessment;
        })
      : ScreeningArchiveService.loadAssessments(config.patientId);

    if (config.timeRange) {
      assessments = assessments.filter(
        (assessment) => assessment.createdAt >= config.timeRange!.start && assessment.createdAt <= config.timeRange!.end,
      );
    }

    const interventionPlanId = config.interventionPlanId ?? config.treatmentPlanId;
    let interventionPlans = ScreeningArchiveService.loadInterventionPlans(config.patientId);
    if (interventionPlanId) {
      interventionPlans = interventionPlans.filter((plan) => plan.id === interventionPlanId);
    }

    let records = ScreeningArchiveService.loadRecords(config.patientId);
    if (config.timeRange) {
      records = records.filter((record) => {
        const timestamp = new Date(record.timestamp).getTime();
        return timestamp >= config.timeRange!.start && timestamp <= config.timeRange!.end;
      });
    }

    return { assessments, interventionPlans, records };
  }

  private static processData(data: {
    assessments: Assessment[];
    interventionPlans: TreatmentPlanVersion[];
    records: AssessmentRecord[];
  }): ProcessedReportData {
    return {
      ...data,
      metrics: DataStandardizationService.calculateMetrics(data.assessments),
      insights: DataStandardizationService.generateInsights(data.assessments),
    };
  }

  private static async generateContent(
    data: ProcessedReportData,
    type: ScreeningReportType,
    format: ReportFormat,
  ): Promise<string> {
    const llmService = new LLMReportService();
    const recordSummary = this.buildRecordSummary(data.records);
    const compactRecords = this.buildCompactRecords(data.records);
    const prompt = buildPrompt(type, format, data, recordSummary, compactRecords);
    return llmService.generateReport(prompt, format);
  }

  private static generateTitle(type: ScreeningReportType): string {
    const date = new Date().toISOString().split('T')[0];
    return `${reportTypeMetadata[type].titlePrefix} - ${date}`;
  }

  static saveReport(report: ScreeningReportData): boolean {
    try {
      const reports = this.loadReports();
      reports.push(report);
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
      return true;
    } catch (error) {
      console.error('保存报告失败:', error);
      return false;
    }
  }

  static loadReports(patientId?: string): ScreeningReportData[] {
    try {
      const reportsStr = localStorage.getItem(REPORT_STORAGE_KEY);
      if (!reportsStr) {
        return [];
      }

      const reports = JSON.parse(reportsStr) as ScreeningReportData[];
      return patientId ? reports.filter((report) => report.patientId === patientId) : reports;
    } catch (error) {
      console.error('加载报告失败:', error);
      return [];
    }
  }

  static getReport(id: string): ScreeningReportData | null {
    return this.loadReports().find((report) => report.id === id) ?? null;
  }

  static deleteReport(id: string): boolean {
    try {
      const reports = this.loadReports().filter((report) => report.id !== id);
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(reports));
      return true;
    } catch (error) {
      console.error('删除报告失败:', error);
      return false;
    }
  }

  private static buildRecordSummary(records: AssessmentRecord[]): RecordSummary {
    const sortedRecords = [...records].sort((left, right) => this.toTimestamp(right.timestamp) - this.toTimestamp(left.timestamp));
    const typeBreakdown: Record<'front' | 'side' | 'back', number> = {
      front: 0,
      side: 0,
      back: 0,
    };
    const improvements: number[] = [];
    const feedbackHighlights: string[] = [];
    const metricBuckets = new Map<string, { sum: number; count: number; min: number; max: number }>();

    sortedRecords.forEach((record) => {
      typeBreakdown[record.assessmentType] += 1;

      if (typeof record.improvement === 'number' && Number.isFinite(record.improvement)) {
        improvements.push(record.improvement);
      }

      if (record.feedback?.trim()) {
        feedbackHighlights.push(record.feedback.trim());
      }

      Object.entries(record.metrics ?? {}).forEach(([metric, value]) => {
        if (typeof value !== 'number' || Number.isNaN(value)) {
          return;
        }

        const existing = metricBuckets.get(metric);
        if (!existing) {
          metricBuckets.set(metric, { sum: value, count: 1, min: value, max: value });
          return;
        }

        existing.sum += value;
        existing.count += 1;
        existing.min = Math.min(existing.min, value);
        existing.max = Math.max(existing.max, value);
      });
    });

    const metricSnapshots: RecordMetricSnapshot[] = Array.from(metricBuckets.entries())
      .map(([metric, bucket]) => ({
        metric,
        average: Number((bucket.sum / bucket.count).toFixed(3)),
        min: Number(bucket.min.toFixed(3)),
        max: Number(bucket.max.toFixed(3)),
        sampleCount: bucket.count,
      }))
      .sort((left, right) => right.sampleCount - left.sampleCount)
      .slice(0, 10);

    return {
      totalRecords: sortedRecords.length,
      latestRecordAt: sortedRecords[0]?.timestamp ?? null,
      assessmentTypeBreakdown: typeBreakdown,
      averageImprovement:
        improvements.length > 0
          ? Number((improvements.reduce((sum, value) => sum + value, 0) / improvements.length).toFixed(3))
          : null,
      feedbackHighlights: [...new Set(feedbackHighlights)].slice(0, 8),
      metricSnapshots,
      interventionTrends: this.buildInterventionTrends(sortedRecords),
    };
  }

  private static buildCompactRecords(records: AssessmentRecord[]): CompactReportRecord[] {
    return [...records]
      .sort((left, right) => this.toTimestamp(right.timestamp) - this.toTimestamp(left.timestamp))
      .slice(0, 12)
      .map((record) => ({
        id: record.id,
        timestamp: record.timestamp,
        assessmentType: record.assessmentType,
        angles: Object.fromEntries(Object.entries(record.angles ?? {}).slice(0, 8)),
        metrics: Object.fromEntries(
          Object.entries(record.metrics ?? {})
            .filter(([, value]) => typeof value === 'number' && Number.isFinite(value))
            .slice(0, 10),
        ) as Record<string, number>,
        feedback: record.feedback,
        improvement: record.improvement,
      }));
  }

  private static buildInterventionTrends(records: AssessmentRecord[]): Array<{
    interventionId: string;
    protocolName?: string;
    beforeAt: string;
    afterAt: string;
    deltas: Partial<Record<'rpe' | 'stabilityScore' | 'jitterIndex' | 'fatigueScore' | 'recoveryScore', number>>;
  }> {
    const groups = new Map<string, AssessmentRecord[]>();

    records.forEach((record) => {
      const interventionId = record.intervention?.interventionId;
      if (!interventionId) {
        return;
      }
      const current = groups.get(interventionId) ?? [];
      current.push(record);
      groups.set(interventionId, current);
    });

    return Array.from(groups.entries())
      .map(([interventionId, interventionRecords]) => {
        const sorted = [...interventionRecords].sort(
          (left, right) => this.toTimestamp(left.timestamp) - this.toTimestamp(right.timestamp),
        );
        const beforeRecord = [...sorted].reverse().find((record) => record.intervention?.phase === 'before');
        const afterRecord = sorted.find((record) => record.intervention?.phase === 'after');
        if (!beforeRecord || !afterRecord) {
          return null;
        }

        const beforeMetrics = this.extractFatigueMetrics(beforeRecord);
        const afterMetrics = this.extractFatigueMetrics(afterRecord);
        const deltas: Partial<
          Record<'rpe' | 'stabilityScore' | 'jitterIndex' | 'fatigueScore' | 'recoveryScore', number>
        > = {};

        (['rpe', 'stabilityScore', 'jitterIndex', 'fatigueScore', 'recoveryScore'] as const).forEach((metricKey) => {
          const beforeValue = beforeMetrics[metricKey];
          const afterValue = afterMetrics[metricKey];
          if (typeof beforeValue === 'number' && typeof afterValue === 'number') {
            deltas[metricKey] = Number((afterValue - beforeValue).toFixed(3));
          }
        });

        if (Object.keys(deltas).length === 0) {
          return null;
        }

        return {
          interventionId,
          protocolName: beforeRecord.intervention?.protocolName ?? afterRecord.intervention?.protocolName,
          beforeAt: beforeRecord.timestamp,
          afterAt: afterRecord.timestamp,
          deltas,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((left, right) => this.toTimestamp(right.afterAt) - this.toTimestamp(left.afterAt))
      .slice(0, 8);
  }

  private static extractFatigueMetrics(
    record: AssessmentRecord,
  ): Partial<Record<'rpe' | 'stabilityScore' | 'jitterIndex' | 'fatigueScore' | 'recoveryScore', number>> {
    const structured = record.fatigueMetrics ?? {};
    const metrics = record.metrics ?? {};
    const parsed = {
      rpe: typeof structured.rpe === 'number' ? structured.rpe : this.toNumeric(metrics.rpe),
      stabilityScore:
        typeof structured.stabilityScore === 'number' ? structured.stabilityScore : this.toNumeric(metrics.stabilityScore),
      jitterIndex: typeof structured.jitterIndex === 'number' ? structured.jitterIndex : this.toNumeric(metrics.jitterIndex),
      fatigueScore:
        typeof structured.fatigueScore === 'number' ? structured.fatigueScore : this.toNumeric(metrics.fatigueScore),
      recoveryScore:
        typeof structured.recoveryScore === 'number' ? structured.recoveryScore : this.toNumeric(metrics.recoveryScore),
    };

    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => typeof value === 'number' && Number.isFinite(value)),
    ) as Partial<Record<'rpe' | 'stabilityScore' | 'jitterIndex' | 'fatigueScore' | 'recoveryScore', number>>;
  }

  private static toNumeric(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private static toTimestamp(value: string): number {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
}

export type ReportConfig = ScreeningReportConfig;
export type ReportData = ScreeningReportData;
export { ScreeningReportGenerator as ReportGenerator };
