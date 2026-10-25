import { describe, expect, it } from 'vitest';
import type { Assessment } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import { buildVisitTaskList, buildVisitTaskSummary } from '../workflow';

const patient = { id: 'p1', name: 'A', createdAt: 1, updatedAt: 2 } as unknown as Patient;
const session = { id: 's1', patientId: 'p1', sequence: 1, status: 'active', createdAt: 1, updatedAt: 2 } as unknown as Session;
const assessment = (type: Assessment['type']) => ({ id: `${type}-1`, patientId: 'p1', sessionId: 's1', type, createdAt: 5 } as unknown as Assessment);

describe('workflow required/optional modules', () => {
  it('必需模块齐全才可出报告', () => {
    const ready = buildVisitTaskSummary(patient, [session], [assessment('posture'), assessment('scale')]);
    expect(ready.reportReady).toBe(true);

    const missing = buildVisitTaskSummary(patient, [session], [assessment('posture')]);
    expect(missing.reportReady).toBe(false);
    expect(missing.nextStep).toContain('量表');
  });

  it('可选模块不阻断报告', () => {
    const summary = buildVisitTaskSummary(patient, [session], [assessment('posture'), assessment('scale')]);
    expect(summary.progressRatio).toBe(0.5);
    expect(summary.nextStep).not.toContain('必需评估');
  });

  it('批量聚合并保持报告状态', () => {
    const list = buildVisitTaskList([patient], () => [session], [assessment('posture'), assessment('scale')]);
    expect(list).toHaveLength(1);
    expect(list[0].reportReady).toBe(true);
  });
});
