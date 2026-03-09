import { describe, expect, it } from 'vitest';
import type { TreatmentPlanVersion } from '../assessment';

describe('TreatmentPlanVersion', () => {
  it('supports assessment-scoped plan metadata', () => {
    const version: TreatmentPlanVersion = {
      id: 'version_123',
      version: 1,
      content: 'treatment plan content',
      assessmentId: 'assessment_001',
      sourceType: 'assessment',
      patientId: 'patient_001',
      createdAt: '2024-03-07T10:00:00.000Z',
      updatedAt: '2024-03-07T10:00:00.000Z',
      createdBy: 'system',
      isCurrent: true,
    };

    expect(version.assessmentId).toBe('assessment_001');
    expect(version.sourceType).toBe('assessment');
    expect(version.isCurrent).toBe(true);
  });

  it('supports session-report-scoped plan metadata', () => {
    const version: TreatmentPlanVersion = {
      id: 'version_456',
      version: 2,
      content: 'session plan content',
      sessionId: 'session_001',
      sessionReportId: 'session_report_001',
      sourceType: 'session-report',
      patientId: 'patient_001',
      createdAt: '2024-03-07T10:00:00.000Z',
      updatedAt: '2024-03-07T10:00:00.000Z',
      createdBy: 'system',
      isCurrent: false,
      tags: ['rehab', 'shoulder'],
      notes: 'generated from session report',
    };

    expect(version.sessionId).toBe('session_001');
    expect(version.sessionReportId).toBe('session_report_001');
    expect(version.tags).toEqual(['rehab', 'shoulder']);
    expect(version.notes).toBe('generated from session report');
  });
});
