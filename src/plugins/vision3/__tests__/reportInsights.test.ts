import { describe, expect, it } from 'vitest';
import { buildImmediateBasicReport, buildReportInsightCards } from '../report-insights';

describe('buildReportInsightCards', () => {
  it('builds visible insight cards from report text, issues, and metrics', () => {
    const cards = buildReportInsightCards({
      metrics: {
        headForward: 5.2,
        shoulderAngle: 3.1,
      },
      issues: [
        {
          id: 'head_forward',
          type: 'forward_head',
          severity: 'moderate',
          title: '\u5934\u524d\u5f15',
          description: '\u5934\u90e8\u76f8\u5bf9\u8eba\u5e72\u524d\u79fb\u660e\u663e\uff0c\u9888\u80a9\u8d1f\u8377\u5347\u9ad8\u3002',
          recommendation: '\u5148\u8c03\u6574\u5de5\u4f5c\u4f4d\u89c6\u7ebf\uff0c\u518d\u914d\u5408\u9888\u80f8\u6bb5\u4f38\u5c55\u3002',
        },
      ],
      auxiliaryDiagnosis: '\u57fa\u7840\u62a5\u544a\u63d0\u793a\u5934\u9888\u524d\u5f15\u4e0e\u80a9\u5e26\u4e0d\u5bf9\u79f0\u540c\u65f6\u5b58\u5728\u3002',
      markdownReport: '### \u6df1\u5ea6\u62a5\u544a\n\u5f53\u524d\u5f02\u5e38\u66f4\u50cf\u662f\u5934\u9888-\u80a9\u5e26\u94fe\u8def\u7684\u8054\u52a8\u4ee3\u507f\u3002',
    });

    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards[0].title).toContain('\u5934\u524d\u5f15');
    expect(cards[0].action).toContain('\u5de5\u4f5c\u4f4d');
    expect(cards[0].evidence.join(' ')).toContain('\u524d\u5f15');
    expect(cards.some((card) => card.title.includes('\u4ee3\u507f'))).toBe(true);
  });

  it('falls back to a maintenance card when no high-risk evidence is available', () => {
    const cards = buildReportInsightCards({
      metrics: {
        headForward: 1.2,
        shoulderAngle: 0.8,
      },
      issues: [],
      auxiliaryDiagnosis: '\u672a\u89c1\u660e\u663e\u5f02\u5e38\u3002',
      markdownReport: null,
    });

    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe('maintenance');
  });

  it('builds an immediate basic report from issues and metrics when auxiliary text is not ready yet', () => {
    const report = buildImmediateBasicReport({
      metrics: {
        headForward: 5.2,
        shoulderAngle: 3.1,
      },
      issues: [
        {
          id: 'head_forward',
          type: 'forward_head',
          severity: 'moderate',
          title: '头前引',
          description: '头部前移明显，颈肩负荷升高。',
          recommendation: '先调整工位视线，再配合颈胸段伸展。',
        },
      ],
    });

    expect(report).toContain('即时基础结论');
    expect(report).toContain('头前引');
    expect(report).toContain('建议动作');
  });
});
