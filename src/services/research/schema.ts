/**
 * 研究数据契约（RehabMain → Galen）。
 *
 * 核心：RehabID 是临床与研究之间唯一的 join key。
 * - 临床端本地保留 patient.id（UUID）与真实身份；
 * - 导出包只出现 RehabID（由 shortCode 派生，不含姓名/联系方式）；
 * - 每条事件都带 schemaVersion / occurredAt / completeness，Galen 侧可校验、可重放。
 */
export const RESEARCH_SCHEMA_VERSION = 1 as const;
export const RESEARCH_PACKAGE_SCHEMA = 'rehab-research/1' as const;
export const RESEARCH_EXPORTED_BY = 'rehab-workbench' as const;

export type ResearchEventType = 'visit' | 'assessment' | 'session_report';
export type ResearchCompleteness = 'complete' | 'partial';

export interface ResearchEvent {
  eventId: string;
  rehabId: string;
  type: ResearchEventType;
  occurredAt: number;
  recordedAt: number;
  schemaVersion: typeof RESEARCH_SCHEMA_VERSION;
  completeness: ResearchCompleteness;
  payload: Record<string, unknown>;
}

export interface ResearchQuality {
  patients: number;
  patientsWithAssessment: number;
  visits: number;
  assessments: number;
  documents: number;
  moduleCoverage: Record<string, number>;
  incompleteEvents: number;
  lastEventAt: number | null;
}

export interface ResearchFileRef {
  name: string;
  bytes: number;
  sha256: string;
  lines: number;
}

export interface ResearchManifest {
  schema: typeof RESEARCH_PACKAGE_SCHEMA;
  batchId: string;
  exportedBy: typeof RESEARCH_EXPORTED_BY;
  exportedAt: number;
  since: number | null;
  coverage: { from: number | null; to: number | null };
  counts: Record<ResearchEventType, number> & { patients: number; documents: number };
  quality: ResearchQuality;
  files: ResearchFileRef[];
  note: string;
}

/** 本地索引：临床 ID → RehabID 的唯一映射入口。 */
export interface RehabIdIndex {
  byPatientId: Map<string, string>;
}

/** RehabID 由 shortCode 派生；没有 shortCode 时退化为 UUID 前 10 位（依旧不含可识别信息）。 */
export function toRehabId(patient: { id: string; shortCode?: string | null }): string {
  const code = (patient.shortCode ?? '').trim().toUpperCase().replace(/\s+/g, '');
  if (code.length > 0) return `RID-${code}`;
  const fallback = patient.id.replace(/-/g, '').slice(0, 10).toUpperCase();
  return `RID-${fallback || 'UNKNOWN'}`;
}

export function buildRehabIdIndex(patients: Array<{ id: string; shortCode?: string | null }>): RehabIdIndex {
  const byPatientId = new Map<string, string>();
  for (const patient of patients) byPatientId.set(patient.id, toRehabId(patient));
  return { byPatientId };
}

/** 新增/变更的判定：occurredAt 晚于游标（游标来自上一次导出覆盖到的时间点）。 */
export function isAfterCursor(occurredAt: number, since: number | null): boolean {
  return since === null || occurredAt > since;
}
