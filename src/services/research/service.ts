/**
 * 研究数据服务（前端编排层）。
 *
 * 流程：读取 Dexie 快照 → 构建批次（去标识）→ 交给桌面端原子落盘 →
 * 记录导出游标（下次只导增量）→ 返回可展示的结果。
 */
import { db } from '@/lib/db';
import {
  buildResearchPackage,
  createBatchId,
  type ResearchSource,
  type ResearchPackageDraft,
} from './build';
import { RESEARCH_PACKAGE_SCHEMA, type ResearchQuality } from './schema';

const CURSOR_KEY = 'rehab.research.exportCursor';

export interface ResearchExportResult {
  batchId: string;
  path: string;
  bytes: number;
  counts: ResearchPackageDraft['counts'];
  files: Array<{ name: string; bytes: number; sha256: string; lines: number }>;
}

export interface ResearchOverview {
  available: boolean;
  reason?: string;
  cursor: number | null;
  quality: ResearchQuality | null;
  batches: Array<{
    batchId: string;
    exportedAt: number;
    counts: Record<string, number>;
    path: string;
  }>;
}

export async function readResearchSource(): Promise<ResearchSource> {
  const [patients, sessions, assessments, reports] = await Promise.all([
    db.patients.toArray(),
    db.sessions.toArray(),
    db.assessments.toArray(),
    db.sessionReports.toArray(),
  ]);
  return { patients, sessions, assessments, reports };
}

export function readExportCursor(): number | null {
  try {
    const raw = window.localStorage.getItem(CURSOR_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeExportCursor(value: number): void {
  try {
    window.localStorage.setItem(CURSOR_KEY, String(value));
  } catch {
    // 本地存储不可用时忽略：下次导出会退化为全量，Galen 侧按 eventId 去重
  }
}

function bridge() {
  return window.rehabDesktop;
}

/** 构建批次但不落盘（给质量预览 / 测试用）。 */
export async function buildCurrentResearchPackage(options?: {
  batchId?: string;
  exportedAt?: number;
  since?: number | null;
}): Promise<ResearchPackageDraft> {
  const source = await readResearchSource();
  return buildResearchPackage(source, {
    batchId: options?.batchId ?? createBatchId(),
    exportedAt: options?.exportedAt ?? Date.now(),
    since: options?.since === undefined ? readExportCursor() : options.since,
  });
}

/** 导出并传输到 Galen（桌面端写 exports 批次目录）。 */
export async function exportResearchToGalen(): Promise<ResearchExportResult> {
  if (!bridge()?.exportGalenResearch) {
    throw new Error('研究数据传输仅在 RehabMain 桌面版可用（浏览器预览无本地文件权限）');
  }
  const pkg = await buildCurrentResearchPackage();
  const result = await bridge()!.exportGalenResearch!({
    schema: RESEARCH_PACKAGE_SCHEMA,
    batchId: pkg.batchId,
    exportedAt: pkg.exportedAt,
    since: pkg.since,
    coverage: pkg.coverage,
    counts: pkg.counts,
    quality: pkg.quality,
    files: pkg.files.map((file) => ({ name: file.name, content: file.content })),
  });
  const cursor = pkg.coverage.to ?? pkg.exportedAt;
  writeExportCursor(cursor);
  return { ...result, counts: pkg.counts };
}

/** 概览：质量指标 + 历史批次（供“研究数据”面板展示）。 */
export async function getResearchOverview(): Promise<ResearchOverview> {
  const source = await readResearchSource();
  const pkg = buildResearchPackage(source, {
    batchId: createBatchId(),
    exportedAt: Date.now(),
    since: null,
  });
  const available = Boolean(bridge()?.exportGalenResearch);
  const batches = available && bridge()?.listGalenResearchBatches
    ? await bridge()!.listGalenResearchBatches!()
    : [];
  return {
    available,
    reason: available ? undefined : '仅桌面版支持批次写入；当前环境可预览统计',
    cursor: readExportCursor(),
    quality: pkg.quality,
    batches: batches.map((batch) => ({
      batchId: batch.batchId,
      exportedAt: batch.exportedAt,
      counts: batch.counts ?? {},
      path: batch.path,
    })),
  };
}
