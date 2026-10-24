/**
 * 研究数据集构建：把 Dexie 里的临床数据投影成「事件流 + 文书」，并打包成可传输的批次。
 *
 * 设计原则：
 * - 纯函数（输入快照，输出字符串），不直接读库，方便单测；
 * - 只输出结构化字段，姓名/备注等自由文本经 scrub 替换为 RehabID；
 * - 事件 ID 确定性生成（eventId = type + 源记录 ID），Galen 侧可按 eventId 幂等去重。
 */
import type { Assessment } from '@/types/assessment';
import type { SessionReportOutput } from '@/types/report-center';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import { sanitizeAssessment } from '@/lib/galenConnector';
import {
  RESEARCH_SCHEMA_VERSION,
  buildRehabIdIndex,
  isAfterCursor,
  type ResearchEvent,
  type ResearchEventType,
  type ResearchQuality,
} from './schema';

export interface ResearchSource {
  patients: Patient[];
  sessions: Session[];
  assessments: Assessment[];
  reports: SessionReportOutput[];
}

export interface BuildOptions {
  batchId: string;
  exportedAt: number;
  since?: number | null;
}

export interface ResearchFileDraft {
  name: string;
  content: string;
  lines: number;
}

export interface ResearchPackageDraft {
  batchId: string;
  exportedAt: number;
  since: number | null;
  counts: Record<ResearchEventType | 'patients' | 'documents', number>;
  quality: ResearchQuality;
  coverage: { from: number | null; to: number | null };
  files: ResearchFileDraft[];
}

const MODULE_TYPES = ['posture', 'adams', 'rom', 'medvoice', 'scale'] as const;

/** 把自由文本里的患者姓名替换为 RehabID（其余内容保留，供研究使用）。 */
export function scrubText(text: string, replacements: Array<{ name: string; rehabId: string }>): string {
  let output = text;
  const sorted = replacements
    .filter((item) => item.name.trim().length > 0)
    .sort((a, b) => b.name.length - a.name.length);
  for (const item of sorted) {
    output = output.split(item.name).join(item.rehabId);
  }
  return output;
}

function nameReplacements(patients: Patient[], index: Map<string, string>) {
  return patients.map((patient) => ({
    name: patient.name ?? '',
    rehabId: index.get(patient.id) ?? 'RID-UNKNOWN',
  }));
}

/** 事件流：visit / assessment / session_report，按 occurredAt 升序。 */
export function buildResearchEvents(source: ResearchSource, since: number | null = null): ResearchEvent[] {
  const index = buildRehabIdIndex(source.patients);
  const rehabOf = (patientId: string) => index.byPatientId.get(patientId) ?? 'RID-UNKNOWN';
  const events: ResearchEvent[] = [];

  for (const session of source.sessions) {
    const rehabId = rehabOf(session.patientId);
    if (!isAfterCursor(session.createdAt, since)) continue;
    events.push({
      eventId: `visit-${session.id}`,
      rehabId,
      type: 'visit',
      occurredAt: session.createdAt,
      recordedAt: session.updatedAt ?? session.createdAt,
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      completeness: 'complete',
      payload: {
        visitSeq: session.sequence,
        status: session.status,
        isBaseline: session.isBaseline === true,
        assessmentCount: session.assessments.length,
      },
    });
  }

  for (const assessment of source.assessments) {
    const rehabId = rehabOf(assessment.patientId);
    if (!isAfterCursor(assessment.createdAt, since)) continue;
    const sanitized = sanitizeAssessment(assessment);
    const data = (sanitized.data ?? {}) as Record<string, unknown>;
    const hasData = Object.keys(data).length > 0;
    events.push({
      eventId: `assessment-${assessment.id}`,
      rehabId,
      type: 'assessment',
      occurredAt: assessment.createdAt,
      recordedAt: assessment.createdAt,
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      completeness: hasData ? 'complete' : 'partial',
      payload: {
        assessmentId: assessment.id,
        sessionId: assessment.sessionId,
        assessmentType: assessment.type,
        mode: assessment.mode,
        status: assessment.status,
        data,
        ...(assessment.isBaseline === true ? { isBaseline: true } : {}),
      },
    });
  }

  for (const report of source.reports) {
    const rehabId = rehabOf(report.patientId);
    if (!isAfterCursor(report.createdAt, since)) continue;
    events.push({
      eventId: `report-${report.id}`,
      rehabId,
      type: 'session_report',
      occurredAt: report.createdAt,
      recordedAt: report.createdAt,
      schemaVersion: RESEARCH_SCHEMA_VERSION,
      completeness: report.markdown.trim().length > 0 ? 'complete' : 'partial',
      payload: {
        reportId: report.id,
        sessionId: report.sessionId,
        sourceAssessmentCount: report.sourceAssessmentIds.length,
        insightCount: report.insights.length,
        recommendationCount: report.recommendations.length,
      },
    });
  }

  return events.sort((a, b) => a.occurredAt - b.occurredAt || a.eventId.localeCompare(b.eventId));
}

/** 文书行：正文经过姓名 → RehabID 脱敏，保留研究工作可用的内容。 */
export function buildDocumentRecords(source: ResearchSource) {
  const index = buildRehabIdIndex(source.patients);
  const replacements = nameReplacements(source.patients, index.byPatientId);
  return source.reports.map((report) => {
    const rehabId = index.byPatientId.get(report.patientId) ?? 'RID-UNKNOWN';
    const markdown = scrubText(report.markdown, replacements);
    return {
      documentId: report.id,
      rehabId,
      sessionId: report.sessionId,
      createdAt: report.createdAt,
      kind: 'session_report',
      chars: markdown.length,
      markdown,
      insights: report.insights.map((item) => scrubText(item, replacements)),
      recommendations: report.recommendations.map((item) => scrubText(item, replacements)),
    };
  });
}

export function computeQuality(source: ResearchSource, events: ResearchEvent[]): ResearchQuality {
  const index = buildRehabIdIndex(source.patients);
  const patientsWithAssessment = new Set(source.assessments.map((item) => item.patientId));
  const moduleCoverage: Record<string, number> = {};
  for (const type of MODULE_TYPES) moduleCoverage[type] = 0;
  for (const assessment of source.assessments) {
    if (assessment.type in moduleCoverage) moduleCoverage[assessment.type] += 1;
  }
  const occurredTimes = events.map((event) => event.occurredAt);
  return {
    patients: source.patients.length,
    patientsWithAssessment: patientsWithAssessment.size,
    visits: source.sessions.length,
    assessments: source.assessments.length,
    documents: source.reports.length,
    moduleCoverage,
    incompleteEvents: events.filter((event) => event.completeness === 'partial').length,
    lastEventAt: occurredTimes.length > 0 ? Math.max(...occurredTimes) : null,
  };
}

const toJsonl = (rows: unknown[]): { content: string; lines: number } => ({
  content: rows.length > 0 ? `${rows.map((row) => JSON.stringify(row)).join('\n')}\n` : '',
  lines: rows.length,
});

/** 组装完整批次（不含哈希，哈希由桌面端写入时计算）。 */
export function buildResearchPackage(source: ResearchSource, options: BuildOptions): ResearchPackageDraft {
  const since = options.since ?? null;
  const events = buildResearchEvents(source, since);
  const documents = buildDocumentRecords(source).filter((doc) => isAfterCursor(doc.createdAt, since));
  const index = buildRehabIdIndex(source.patients);

  const patientRows = source.patients.map((patient) => ({
    rehabId: index.byPatientId.get(patient.id) ?? 'RID-UNKNOWN',
    // 只有研究必需的粗粒度信息；无姓名/联系方式/住址
    createdAt: patient.createdAt,
    shortCode: patient.shortCode ?? null,
    tagCount: patient.tags?.length ?? 0,
  }));

  const patientsFile = toJsonl(patientRows);
  const eventsFile = toJsonl(events);
  const documentsFile = toJsonl(documents);

  const files: ResearchFileDraft[] = [
    { name: 'patients.jsonl', ...patientsFile },
    { name: 'events.jsonl', ...eventsFile },
    { name: 'documents.jsonl', ...documentsFile },
  ];

  const occurredTimes = events.map((event) => event.occurredAt);
  return {
    batchId: options.batchId,
    exportedAt: options.exportedAt,
    since,
    counts: {
      visit: events.filter((event) => event.type === 'visit').length,
      assessment: events.filter((event) => event.type === 'assessment').length,
      session_report: events.filter((event) => event.type === 'session_report').length,
      patients: patientRows.length,
      documents: documents.length,
    },
    quality: computeQuality(source, events),
    coverage: {
      from: occurredTimes.length > 0 ? Math.min(...occurredTimes) : null,
      to: occurredTimes.length > 0 ? Math.max(...occurredTimes) : null,
    },
    files,
  };
}

/** 批次 ID：按时间排序、可读、带随机后缀避免并发冲突。 */
export function createBatchId(now: number = Date.now()): string {
  const date = new Date(now);
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  const suffix = Math.random().toString(36).slice(2, 6);
  return `batch-${stamp}-${suffix}`;
}
