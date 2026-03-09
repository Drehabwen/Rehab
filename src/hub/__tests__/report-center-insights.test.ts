import { describe, expect, it } from 'vitest';
import type { SessionReportInput } from '@/types/report-center';
import { buildSessionDraftReport, buildSessionInsightCards } from '../report-center-insights';

const sessionInput: SessionReportInput = {
  sessionId: 'session-1',
  patientId: 'patient-1',
  patientName: '张三',
  latestCreatedAt: Date.now(),
  outputs: {
    posture: {
      assessmentId: 'posture-1',
      sessionId: 'session-1',
      patientId: 'patient-1',
      type: 'posture',
      title: '体态评估',
      status: 'ready',
      createdAt: Date.now() - 3000,
      preview: '基础体态报告显示头前引与圆肩趋势。',
      evidenceCount: 4,
      sourceAssessment: {} as never,
    },
    rom: {
      assessmentId: 'rom-1',
      sessionId: 'session-1',
      patientId: 'patient-1',
      type: 'rom',
      title: '关节活动度',
      status: 'ready',
      createdAt: Date.now() - 2000,
      preview: '左肩前屈受限，外展活动轻度下降。',
      evidenceCount: 2,
      sourceAssessment: {} as never,
    },
    medvoice: {
      assessmentId: 'voice-1',
      sessionId: 'session-1',
      patientId: 'patient-1',
      type: 'medvoice',
      title: '语音病历',
      status: 'ready',
      createdAt: Date.now() - 1000,
      preview: '主诉肩颈疼痛两周，久坐后加重。',
      evidenceCount: 2,
      sourceAssessment: {} as never,
    },
  },
  readiness: {
    readyCount: 3,
    partialCount: 0,
    missingTypes: [],
    availableTypes: ['posture', 'rom', 'medvoice'],
  },
};

describe('report-center-insights', () => {
  it('builds cross-input insight cards for a rich session context', () => {
    const cards = buildSessionInsightCards(sessionInput);

    expect(cards.length).toBeGreaterThan(0);
    expect(cards.some((card) => card.id === 'posture-rom')).toBe(true);
    expect(cards.some((card) => card.id === 'posture-voice')).toBe(true);
  });

  it('builds a deterministic session draft report preview', () => {
    const draft = buildSessionDraftReport(sessionInput);

    expect(draft).toContain('# 综合报告编排预览');
    expect(draft).toContain('session-1');
    expect(draft).toContain('基础体态报告显示头前引与圆肩趋势');
    expect(draft).toContain('左肩前屈受限');
    expect(draft).toContain('主诉肩颈疼痛两周');
  });
});
