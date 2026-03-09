import { describe, expect, it } from 'vitest';
import type { Assessment } from '@/types/assessment';
import { buildSessionReportGenerationRequest, buildSessionReportInputs, getAssessmentPreview, hasAssessmentReportPayload } from '../report-center-utils';

const now = Date.now();

const postureAssessment: Assessment = {
  id: 'posture-1',
  sessionId: 'session-1',
  patientId: 'patient-1',
  type: 'posture',
  mode: 'stepped',
  createdAt: now - 3000,
  data: {
    posture: {
      mode: 'stepped',
      view: 'front',
      confidence: 0.9,
      auxiliaryDiagnosis: '### 基础报告',
      metrics: { swayOffset: 1.2 },
      issues: [],
    },
  },
  status: 'completed',
};

const romAssessment: Assessment = {
  id: 'rom-1',
  sessionId: 'session-1',
  patientId: 'patient-1',
  type: 'rom',
  mode: 'realtime',
  createdAt: now - 2000,
  data: {
    rom: {
      items: [
        {
          joint: 'shoulder',
          direction: 'flexion',
          side: 'left',
          angle: 95,
          maxAngle: 95,
          minAngle: 12,
          timestamp: now - 2000,
          confidence: 0.96,
        },
      ],
      summary: '左肩前屈受限',
      recommendations: ['建议针对左肩活动受限进行训练'],
    },
  },
  status: 'completed',
};

const medVoiceAssessment: Assessment = {
  id: 'voice-1',
  sessionId: 'session-1',
  patientId: 'patient-1',
  type: 'medvoice',
  mode: 'voice',
  createdAt: now - 1000,
  data: {
    medvoice: {
      mode: 'voice',
      transcript: '患者主诉肩颈疼痛两周。',
      structuredCase: {
        主诉: '肩颈疼痛两周',
        现病史: '久坐后加重',
      },
      patientInfo: {
        name: '张三',
        gender: '男',
        age: '32',
        case_id: 'patient-1',
        visit_date: '2026/03/09',
      },
      viewMode: 'standard',
    },
  },
  status: 'completed',
};

describe('report-center-utils', () => {
  it('detects report payloads and previews across assessment types', () => {
    expect(hasAssessmentReportPayload(postureAssessment)).toBe(true);
    expect(hasAssessmentReportPayload(romAssessment)).toBe(true);
    expect(hasAssessmentReportPayload(medVoiceAssessment)).toBe(true);
    expect(getAssessmentPreview(medVoiceAssessment)).toContain('## 主诉');
  });

  it('builds one session-level input with posture, rom, and medvoice outputs', () => {
    const sessions = buildSessionReportInputs(
      [postureAssessment, romAssessment, medVoiceAssessment],
      new Map([['patient-1', '张三']]),
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-1');
    expect(sessions[0].patientName).toBe('张三');
    expect(sessions[0].outputs.posture?.status).toBe('ready');
    expect(sessions[0].outputs.rom?.status).toBe('ready');
    expect(sessions[0].outputs.medvoice?.status).toBe('ready');
    expect(sessions[0].readiness.readyCount).toBe(3);
    expect(sessions[0].readiness.missingTypes).toEqual([]);
  });

  it('builds a session report generation payload from a session input', () => {
    const sessionInput = buildSessionReportInputs(
      [postureAssessment, romAssessment, medVoiceAssessment],
      new Map([['patient-1', '张三']]),
    )[0];

    const payload = buildSessionReportGenerationRequest(sessionInput);

    expect(payload.sessionId).toBe('session-1');
    expect(payload.patientId).toBe('patient-1');
    expect(payload.patientName).toBe('张三');
    expect(payload.sourceAssessmentIds).toEqual(expect.arrayContaining(['posture-1', 'rom-1', 'voice-1']));
    expect(payload.posture?.status).toBe('ready');
    expect(payload.rom?.status).toBe('ready');
    expect(payload.medvoice?.status).toBe('ready');
  });
});
