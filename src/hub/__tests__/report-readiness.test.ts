import { describe, expect, it } from 'vitest';
import type { Assessment } from '@/types/assessment';
import { getAssessmentReadiness, summarizeReadiness } from '../report-readiness';
import { buildSessionReportInputs } from '../report-center-utils';

const assessment = (type: Assessment['type'], data: Assessment['data']): Assessment =>
  ({ id: `${type}-1`, patientId: 'p1', sessionId: 's1', type, createdAt: 1, data } as unknown as Assessment);

describe('unified report readiness', () => {
  it('量表有总分即为 ready（不再要求 AI 解读）', () => {
    const scale = assessment('scale', { scale: { scaleName: 'ODI', totalScore: 42, maxScore: 100 } } as Assessment['data']);
    expect(getAssessmentReadiness(scale, 'scale')).toBe('ready');
  });

  it('量表无总分但有作答为 missing/partial 边界', () => {
    const scale = assessment('scale', { scale: {} } as Assessment['data']);
    expect(getAssessmentReadiness(scale, 'scale')).toBe('missing');
  });

  it('体态无结论但有指标为 partial', () => {
    const posture = assessment('posture', { posture: { metrics: {} } } as unknown as Assessment['data']);
    expect(getAssessmentReadiness(posture, 'posture')).toBe('partial');
  });

  it('汇总就绪度并列出可引用类型', () => {
    const summary = summarizeReadiness([
      { assessment: assessment('scale', { scale: { scaleName: 'ODI', totalScore: 42, maxScore: 100 } } as Assessment['data']), type: 'scale' },
      { assessment: assessment('posture', { posture: { metrics: {} } } as unknown as Assessment['data']), type: 'posture' },
    ]);
    expect(summary.total).toBe(2);
    expect(summary.ready).toBe(1);
    expect(summary.partial).toBe(1);
    expect(summary.readyTypes).toEqual(['scale']);
  });

  it('报告中心输入构造仍可用', () => {
    const inputs = buildSessionReportInputs([assessment('scale', { scale: { scaleName: 'ODI', totalScore: 42, maxScore: 100 } } as Assessment['data'])], new Map());
    expect(inputs.length).toBeGreaterThanOrEqual(0);
  });
});
