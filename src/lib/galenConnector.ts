import { liveQuery } from 'dexie';
import { db } from './db';
import type { Assessment } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';

type JsonRecord = Record<string, unknown>;

export interface GalenConnectorSnapshot {
  version: '1.0.0';
  connectorSchema: 'rehab-workbench/1';
  exportedAt: number;
  patients: JsonRecord[];
  sessions: JsonRecord[];
  assessments: JsonRecord[];
}

export interface GalenConnectorStatus {
  available: boolean;
  path: string;
  bytes: number;
  lastModified: number | null;
}

export interface GalenConnectorPublishResult {
  path: string;
  bytes: number;
  patientCount: number;
  sessionCount: number;
  assessmentCount: number;
}

export type GalenReviewAction = 'accept' | 'reject' | 'correct';
export type GalenFollowUpAction = 'none' | 'recapture' | 'schedule_retest';

export interface GalenResearchFeedbackItem {
  feedbackId: string;
  rehabId: string;
  sourceAssessmentId: string;
  observationId: string;
  metric: string;
  action: GalenReviewAction;
  followUpAction: GalenFollowUpAction;
  reason: string;
  reviewer: string;
  reviewedAt: string;
  previousValue: number | string | null;
  previousUnit: string;
  resultingValue: number | string | null;
  resultingUnit: string;
  resultingStatus: 'candidate' | 'verified' | 'disputed' | 'rejected';
}

export interface GalenResearchFeedback {
  schemaVersion: 1;
  connectorId: 'rehab-workbench';
  generatedAt: number | null;
  items: GalenResearchFeedbackItem[];
}

interface SnapshotSource {
  patients: Patient[];
  sessions: Session[];
  assessments: Assessment[];
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function numericRecord(value: unknown): JsonRecord | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as JsonRecord).filter(([, item]) => isFiniteNumber(item));
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function optionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

/** 只保留研究可用的结构化数值字段；研究事件流与研究批次共用。 */
export function sanitizeAssessment(assessment: Assessment): JsonRecord {
  const source = assessment as unknown as JsonRecord;
  const data = (source.data && typeof source.data === 'object' ? source.data : {}) as JsonRecord;
  const sanitizedData: JsonRecord = {};

  const posture = data.posture as JsonRecord | undefined;
  const postureMetrics = numericRecord(posture?.metrics);
  if (postureMetrics) sanitizedData.posture = { metrics: postureMetrics };

  const rom = data.rom as JsonRecord | undefined;
  if (Array.isArray(rom?.items)) {
    const items = rom.items.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const record = item as JsonRecord;
      if (!isFiniteNumber(record.angle)) return [];
      return [{
        joint: optionalText(record.joint) ?? 'joint',
        direction: optionalText(record.direction) ?? 'motion',
        side: optionalText(record.side) ?? 'side',
        angle: record.angle,
      }];
    });
    if (items.length > 0) sanitizedData.rom = { items };
  }

  const scale = data.scale as JsonRecord | undefined;
  if (scale) {
    const sanitizedScale: JsonRecord = {};
    const scaleId = optionalText(scale.scaleId);
    if (scaleId) sanitizedScale.scaleId = scaleId;
    for (const key of ['totalScore', 'percentageScore']) {
      if (isFiniteNumber(scale[key])) sanitizedScale[key] = scale[key];
    }
    const dimensions = numericRecord(scale.dimensions);
    if (dimensions) sanitizedScale.dimensions = dimensions;
    if (Object.keys(sanitizedScale).length > 0) sanitizedData.scale = sanitizedScale;
  }

  const adams = data.adams as JsonRecord | undefined;
  if (adams) {
    const sanitizedAdams: JsonRecord = {};
    for (const key of ['atrDegrees', 'scoliometerReading']) {
      if (isFiniteNumber(adams[key])) sanitizedAdams[key] = adams[key];
    }
    if (Object.keys(sanitizedAdams).length > 0) sanitizedData.adams = sanitizedAdams;
  }

  const result: JsonRecord = {
    id: assessment.id,
    sessionId: assessment.sessionId,
    patientId: assessment.patientId,
    type: assessment.type,
    mode: assessment.mode,
    createdAt: assessment.createdAt,
    status: assessment.status,
    data: sanitizedData,
  };
  if (assessment.isBaseline === true) result.isBaseline = true;

  for (const key of ['metrics', 'angles']) {
    const values = numericRecord(source[key]);
    if (values) result[key] = values;
  }
  if (Array.isArray(source.summaryMetrics)) {
    const metrics = source.summaryMetrics.flatMap((metric) => {
      if (!metric || typeof metric !== 'object') return [];
      const record = metric as JsonRecord;
      const metricKey = optionalText(record.metricKey);
      if (!metricKey || !isFiniteNumber(record.value)) return [];
      return [{ metricKey, value: record.value, unit: optionalText(record.unit) ?? 'value' }];
    });
    if (metrics.length > 0) result.summaryMetrics = metrics;
  }
  return result;
}

/** Build the only payload RehabMain is allowed to expose to Galen. */
export function buildGalenConnectorSnapshot(
  source: SnapshotSource,
  exportedAt = Date.now(),
): GalenConnectorSnapshot {
  const patientIds = new Set(source.patients.map((patient) => patient.id));
  return {
    version: '1.0.0',
    connectorSchema: 'rehab-workbench/1',
    exportedAt,
    patients: source.patients.map((patient) => ({
      id: patient.id,
      ...(optionalText(patient.shortCode) ? { shortCode: optionalText(patient.shortCode) } : {}),
    })),
    sessions: source.sessions
      .filter((session) => patientIds.has(session.patientId))
      .map((session) => ({
        id: session.id,
        patientId: session.patientId,
        sequence: session.sequence,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        status: session.status,
        ...(session.isBaseline === true ? { isBaseline: true } : {}),
      })),
    assessments: source.assessments
      .filter((assessment) => patientIds.has(assessment.patientId))
      .map(sanitizeAssessment),
  };
}

async function readSnapshotSource(): Promise<SnapshotSource> {
  const [patients, sessions, assessments] = await Promise.all([
    db.patients.toArray(),
    db.sessions.toArray(),
    db.assessments.toArray(),
  ]);
  return { patients, sessions, assessments };
}

export async function publishCurrentGalenSnapshot(): Promise<GalenConnectorPublishResult> {
  if (!window.rehabDesktop?.publishGalenSnapshot) {
    throw new Error('Galen Connector 仅在 RehabMain 桌面版中可用');
  }
  const snapshot = buildGalenConnectorSnapshot(await readSnapshotSource());
  const result = await window.rehabDesktop.publishGalenSnapshot(snapshot);
  return {
    ...result,
    patientCount: snapshot.patients.length,
    sessionCount: snapshot.sessions.length,
    assessmentCount: snapshot.assessments.length,
  };
}

export async function getGalenConnectorStatus(): Promise<GalenConnectorStatus | null> {
  return window.rehabDesktop?.getGalenConnectorStatus?.() ?? null;
}

export async function getGalenResearchFeedback(): Promise<GalenResearchFeedback | null> {
  return window.rehabDesktop?.getGalenResearchFeedback?.() ?? null;
}

let bridgeStarted = false;

/** Keep the desktop bridge fresh whenever its IndexedDB source changes. */
export function startGalenConnectorBridge(): void {
  if (bridgeStarted || !window.rehabDesktop?.publishGalenSnapshot) return;
  bridgeStarted = true;
  let publishSequence = 0;
  liveQuery(readSnapshotSource).subscribe({
    next: async (source) => {
      const sequence = ++publishSequence;
      const snapshot = buildGalenConnectorSnapshot(source);
      try {
        await window.rehabDesktop?.publishGalenSnapshot(snapshot);
      } catch (error) {
        if (sequence === publishSequence) {
          console.error('[GalenConnector] Failed to publish de-identified snapshot', error);
        }
      }
    },
    error: (error) => console.error('[GalenConnector] Failed to observe local data', error),
  });
}
