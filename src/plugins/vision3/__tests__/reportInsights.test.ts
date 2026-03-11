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
          title: '头前引',
          description: '头部相对躯干前移明显，颈肩负荷升高。',
          recommendation: '先调整工作位视线，再配合颈胸段伸展。',
        },
      ],
      auxiliaryDiagnosis: '基础报告提示头颈前引与肩带不对称同时存在。',
      markdownReport: '### 深度报告\n当前异常更像是头颈-肩带链路的联动代偿。',
    });

    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards[0].title).toContain('头前引');
    expect(cards[0].action).toContain('工作位');
    expect(cards[0].evidence.join(' ')).toContain('前引');
    expect(cards.some((card) => card.title.includes('代偿'))).toBe(true);
  });

  it('falls back to a maintenance card when no high-risk evidence is available', () => {
    const cards = buildReportInsightCards({
      metrics: {
        headForward: 1.2,
        shoulderAngle: 0.8,
      },
      issues: [],
      auxiliaryDiagnosis: '未见明显异常。',
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
          recommendation: '先调整工作位视线，再配合颈胸段伸展。',
        },
      ],
    });

    expect(report).toContain('即时基础结论');
    expect(report).toContain('头前引');
    expect(report).toContain('建议动作');
  });

  it('still builds a readable basic report when no high-risk issue is detected', () => {
    const report = buildImmediateBasicReport({
      metrics: {
        headForward: 1.2,
        shoulderAngle: 0.8,
        hipAngle: 0.6,
      },
      issues: [],
    });

    expect(report).toContain('即时基础结论');
    expect(report).toContain('未见需要优先警示的高风险姿态异常');
    expect(report).toContain('建议动作');
  });
});
