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

const scaleAssessment: Assessment = {
  id: 'scale-1',
  sessionId: 'session-1',
  patientId: 'patient-1',
  type: 'scale',
  mode: 'realtime',
  createdAt: now - 500,
  data: {
    scale: {
      scaleId: 'MBI',
      scaleName: '改良 Barthel 指数',
      filledBy: 'therapist',
      totalScore: 22,
      maxScore: 25,
      percentageScore: 88,
      dimensions: {
        functionActive: 5,
        pain: 5,
        selfImage: 4,
        mentalHealth: 4,
        satisfaction: 4,
      },
      answers: [
        { questionId: 1, questionText: '进食', category: 'function', score: 5, answerText: '完全独立' },
      ],
      aiInterpretation: '### 量表多维医学解读\n患者ADL日常生活自理能力良好，轻度功能障碍。',
      createdAt: now - 500,
    },
  },
  status: 'completed',
};

const adamsAssessment: Assessment = {
  id: 'adams-1',
  sessionId: 'session-1',
  patientId: 'patient-1',
  type: 'adams',
  mode: 'stepped',
  createdAt: now - 300,
  data: {
    adams: {
      atrDegrees: 7,
      atrDirection: 'right',
      shoulderAsymmetry: 'right-higher',
      scapulaAsymmetry: 'right-prominent',
      waistCreaseAsymmetry: 'left-deeper',
      spineCurveEstimate: 's-shape',
      cobbAngleEstimate: 12,
      snapshotImage: 'data:image/jpeg;base64,mock_adams_image',
      remarks: '测试备注',
      createdAt: now - 300
    }
  },
  status: 'completed',
};

describe('report-center-utils', () => {
  it('detects report payloads and previews across assessment types', () => {
    expect(hasAssessmentReportPayload(postureAssessment)).toBe(true);
    expect(hasAssessmentReportPayload(romAssessment)).toBe(true);
    expect(hasAssessmentReportPayload(medVoiceAssessment)).toBe(true);
    expect(hasAssessmentReportPayload(scaleAssessment)).toBe(true);
    expect(hasAssessmentReportPayload(adamsAssessment)).toBe(true);
    expect(getAssessmentPreview(medVoiceAssessment)).toContain('## 主诉');
    expect(getAssessmentPreview(scaleAssessment)).toContain('### 量表多维医学解读');
    expect(getAssessmentPreview(adamsAssessment)).toContain('### 亚当斯脊柱侧弯早筛结果');
  });

  it('builds one session-level input with posture, rom, medvoice, scale, and adams outputs', () => {
    const sessions = buildSessionReportInputs(
      [postureAssessment, romAssessment, medVoiceAssessment, scaleAssessment, adamsAssessment],
      new Map([['patient-1', '张三']]),
    );

    expect(sessions).toHaveLength(1);
    expect(sessions[0].sessionId).toBe('session-1');
    expect(sessions[0].patientName).toBe('张三');
    expect(sessions[0].outputs.posture?.status).toBe('ready');
    expect(sessions[0].outputs.rom?.status).toBe('ready');
    expect(sessions[0].outputs.medvoice?.status).toBe('ready');
    expect(sessions[0].outputs.scale?.status).toBe('ready');
    expect(sessions[0].outputs.adams?.status).toBe('ready');
    expect(sessions[0].readiness.readyCount).toBe(5);
    expect(sessions[0].readiness.missingTypes).toEqual([]);
  });

  it('builds a session report generation payload from a session input', () => {
    const sessionInput = buildSessionReportInputs(
      [postureAssessment, romAssessment, medVoiceAssessment, scaleAssessment, adamsAssessment],
      new Map([['patient-1', '张三']]),
    )[0];

    const payload = buildSessionReportGenerationRequest(sessionInput);

    expect(payload.sessionId).toBe('session-1');
    expect(payload.patientId).toBe('patient-1');
    expect(payload.patientName).toBe('张三');
    expect(payload.sourceAssessmentIds).toEqual(expect.arrayContaining(['posture-1', 'rom-1', 'voice-1', 'scale-1', 'adams-1']));
    expect(payload.posture?.status).toBe('ready');
    expect(payload.rom?.status).toBe('ready');
    expect(payload.medvoice?.status).toBe('ready');
    expect(payload.scale?.status).toBe('ready');
    expect(payload.adams?.status).toBe('ready');
  });
});
