import { describe, expect, it } from 'vitest';
import { buildGalenConnectorSnapshot } from './galenConnector';

describe('Galen connector snapshot', () => {
  it('keeps governed numeric observations and strips identity and narrative fields', () => {
    const snapshot = buildGalenConnectorSnapshot({
      patients: [{
        id: 'patient-internal-1', shortCode: 'RID-001', name: 'Private Name',
        notes: 'private patient note', createdAt: 1, updatedAt: 2,
      }],
      sessions: [{
        id: 'session-1', patientId: 'patient-internal-1', sequence: 1,
        createdAt: 10, updatedAt: 11, status: 'completed', notes: 'private session note',
        assessments: [], isBaseline: true,
      }],
      assessments: [{
        id: 'assessment-1', sessionId: 'session-1', patientId: 'patient-internal-1',
        type: 'adams', mode: 'stepped', createdAt: 12, status: 'completed',
        notes: 'private assessment note', isBaseline: true,
        data: {
          posture: {
            mode: 'stepped', view: 'back', confidence: 0.93,
            metrics: { shoulderAngle: 4.2 }, issues: [], landmarks: [],
            markdownReport: 'private report', auxiliaryDiagnosis: 'private interpretation',
          },
          adams: {
            atrDegrees: 7.5, atrDirection: 'right', shoulderAsymmetry: 'right-higher',
            scapulaAsymmetry: 'right-prominent', waistCreaseAsymmetry: 'right-deeper',
            spineCurveEstimate: 'c-shape-right', cobbAngleEstimate: 19,
            snapshotImage: 'data:image/png;base64,private', remarks: 'private remark', createdAt: 12,
          },
          medvoice: {
            mode: 'voice', transcript: 'private transcript', structuredCase: {}, patientInfo: {}, viewMode: 'soap',
          } as never,
        },
      }],
    }, 99);

    expect(snapshot.exportedAt).toBe(99);
    expect(snapshot.patients).toEqual([{ id: 'patient-internal-1', shortCode: 'RID-001' }]);
    expect(snapshot.assessments[0]).toMatchObject({
      id: 'assessment-1',
      data: {
        posture: { metrics: { shoulderAngle: 4.2 } },
        adams: { atrDegrees: 7.5 },
      },
    });

    const serialized = JSON.stringify(snapshot);
    for (const secret of [
      'Private Name', 'private patient note', 'private session note', 'private assessment note',
      'private report', 'private interpretation', 'private transcript', 'private remark',
      'data:image/png', 'cobbAngleEstimate', '"medvoice"', '"name"', '"notes"',
    ]) {
      expect(serialized).not.toContain(secret);
    }
  });

  it('drops orphan records and non-finite measurements', () => {
    const snapshot = buildGalenConnectorSnapshot({
      patients: [{ id: 'patient-1', createdAt: 1, updatedAt: 1 }],
      sessions: [{
        id: 'orphan-session', patientId: 'missing', sequence: 1, createdAt: 1,
        updatedAt: 1, status: 'active', assessments: [],
      }],
      assessments: [{
        id: 'orphan-assessment', sessionId: 'none', patientId: 'missing', type: 'posture',
        mode: 'realtime', createdAt: 1, status: 'completed',
        data: { posture: { mode: 'realtime', view: 'front', confidence: 1, metrics: { shoulderAngle: Number.NaN } } },
      }],
    });

    expect(snapshot.sessions).toEqual([]);
    expect(snapshot.assessments).toEqual([]);
  });
});
