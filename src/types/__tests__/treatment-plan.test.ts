import { describe, it, expect } from 'vitest';
import type { TreatmentPlanVersion } from '../assessment';

describe('TreatmentPlanVersion Type', () => {
  it('应该定义完整的版本类型', () => {
    const version: TreatmentPlanVersion = {
      id: 'version_123',
      version: 1,
      content: '治疗计划内容',
      assessmentId: 'assessment_001',
      patientId: 'patient_001',
      createdAt: '2024-03-07T10:00:00.000Z',
      updatedAt: '2024-03-07T10:00:00.000Z',
      createdBy: 'system',
      isCurrent: true
    };

    expect(version.id).toBeDefined();
    expect(version.version).toBe(1);
    expect(version.content).toBe('治疗计划内容');
    expect(version.isCurrent).toBe(true);
  });

  it('应该支持可选的标签和备注', () => {
    const version: TreatmentPlanVersion = {
      id: 'version_123',
      version: 1,
      content: '治疗计划内容',
      assessmentId: 'assessment_001',
      patientId: 'patient_001',
      createdAt: '2024-03-07T10:00:00.000Z',
      updatedAt: '2024-03-07T10:00:00.000Z',
      createdBy: 'system',
      isCurrent: true,
      tags: ['康复', '肩部'],
      notes: '第一次生成'
    };

    expect(version.tags).toEqual(['康复', '肩部']);
    expect(version.notes).toBe('第一次生成');
  });
});
