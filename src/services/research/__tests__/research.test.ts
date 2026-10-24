import { describe, expect, it } from 'vitest';
import {
  buildDocumentRecords,
  buildResearchEvents,
  buildResearchPackage,
  createBatchId,
  scrubText,
} from '@/services/research/build';
import { buildRehabIdIndex, isAfterCursor, toRehabId } from '@/services/research/schema';
import type { ResearchSource } from '@/services/research/build';

const source = {
  patients: [
    { id: 'p-1', shortCode: 'CS-2418', name: '陈志远', createdAt: 1000, updatedAt: 1000 },
    { id: 'p-2', shortCode: '', name: '林慧敏', createdAt: 2000, updatedAt: 2000 },
  ],
  sessions: [
    { id: 's-1', patientId: 'p-1', sequence: 1, createdAt: 3000, updatedAt: 3000, status: 'completed', assessments: [], isBaseline: true },
    { id: 's-2', patientId: 'p-2', sequence: 1, createdAt: 4000, updatedAt: 4000, status: 'active', assessments: [] },
  ],
  assessments: [
    {
      id: 'a-1', sessionId: 's-1', patientId: 'p-1', type: 'posture', mode: 'quick', status: 'completed', createdAt: 3100,
      data: { posture: { metrics: { headForward: 12 } } },
    },
    {
      id: 'a-2', sessionId: 's-2', patientId: 'p-2', type: 'rom', mode: 'quick', status: 'completed', createdAt: 4100,
      data: {},
    },
  ],
  reports: [
    {
      id: 'r-1', sessionId: 's-1', patientId: 'p-1', createdAt: 3200,
      markdown: '陈志远 本次体态改善，建议继续训练。林慧敏 也需随访。',
      insights: ['陈志远 头前伸改善'],
      recommendations: ['陈志远 每周 2 次'],
      sourceAssessmentIds: ['a-1'],
    },
  ],
} as unknown as ResearchSource;

describe('RehabID', () => {
  it('由 shortCode 派生，缺失时用 UUID 前缀', () => {
    expect(toRehabId({ id: 'p-1', shortCode: 'cs-2418' })).toBe('RID-CS-2418');
    expect(toRehabId({ id: 'abcdef12-3456', shortCode: '' })).toBe('RID-ABCDEF1234');
  });

  it('索引按患者 ID 唯一映射', () => {
    const index = buildRehabIdIndex(source.patients);
    expect(index.byPatientId.get('p-1')).toBe('RID-CS-2418');
    expect(index.byPatientId.get('p-2')).toBe('RID-P2');
  });
});

describe('研究事件流', () => {
  it('生成 visit / assessment / session_report 三类事件，按时间排序', () => {
    const events = buildResearchEvents(source);
    expect(events.map((event) => event.type)).toEqual([
      'visit', 'assessment', 'session_report', 'visit', 'assessment',
    ]);
    expect(events.map((event) => event.occurredAt)).toEqual([3000, 3100, 3200, 4000, 4100]);
    expect(events[1].eventId).toBe('assessment-a-1');
    expect(events[0].rehabId).toBe('RID-CS-2418');
  });

  it('空数据的评估标记为 partial，事件带 schemaVersion', () => {
    const events = buildResearchEvents(source);
    const rom = events.find((event) => event.eventId === 'assessment-a-2');
    expect(rom?.completeness).toBe('partial');
    expect(events.every((event) => event.schemaVersion === 1)).toBe(true);
  });

  it('增量游标只导出更晚的数据', () => {
    expect(buildResearchEvents(source, 3100).map((event) => event.eventId)).toEqual([
      'report-r-1', 'visit-s-2', 'assessment-a-2',
    ]);
    expect(isAfterCursor(3100, 3100)).toBe(false);
    expect(isAfterCursor(3101, 3100)).toBe(true);
  });
});

describe('文书脱敏与打包', () => {
  it('正文与洞察里的姓名替换成 RehabID', () => {
    const docs = buildDocumentRecords(source);
    expect(docs).toHaveLength(1);
    expect(docs[0].markdown).toContain('RID-CS-2418');
    expect(docs[0].markdown).not.toContain('陈志远');
    expect(docs[0].markdown).not.toContain('林慧敏');
    expect(docs[0].insights[0]).toContain('RID-CS-2418');
  });

  it('scrubText 长名优先，避免部分替换', () => {
    const out = scrubText('张伟明和张伟', [
      { name: '张伟', rehabId: 'RID-A' },
      { name: '张伟明', rehabId: 'RID-B' },
    ]);
    expect(out).toBe('RID-B和RID-A');
  });

  it('批次包含三个 JSONL 文件与质量指标，且患者行不含姓名', () => {
    const pkg = buildResearchPackage(source, { batchId: 'batch-20261020-120000-abcd', exportedAt: 5000, since: null });
    expect(pkg.files.map((file) => file.name)).toEqual(['patients.jsonl', 'events.jsonl', 'documents.jsonl']);
    expect(pkg.counts.patients).toBe(2);
    expect(pkg.counts.assessment).toBe(2);
    expect(pkg.quality.patients).toBe(2);
    expect(pkg.quality.patientsWithAssessment).toBe(2);
    expect(pkg.quality.incompleteEvents).toBe(1);
    expect(pkg.coverage.from).toBe(3000);
    expect(pkg.coverage.to).toBe(4100);
    expect(pkg.files[0].content).not.toContain('陈志远');
    expect(pkg.files[0].content).toContain('RID-CS-2418');
  });

  it('批次 ID 形如 batch-YYYYMMDD-HHMMSS-xxxx', () => {
    expect(createBatchId(new Date('2026-10-20T12:00:05').getTime())).toMatch(/^batch-20261020-1[12]0005-[a-z0-9]{4}$/);
  });
});
