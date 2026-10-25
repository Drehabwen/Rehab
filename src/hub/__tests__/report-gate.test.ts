import { describe, expect, it } from 'vitest';
import { evaluateReportGate } from '../report-gate';
import type { VisitTaskSummary, WorkflowModuleSummary } from '../workflow';

const module = (shortTitle: string, required: boolean, done: boolean): WorkflowModuleSummary => ({
  toolId: 'vision3',
  assessmentType: 'posture',
  title: shortTitle,
  shortTitle,
  description: '',
  required,
  status: done ? 'completed' : 'pending',
  assessmentCount: done ? 1 : 0,
  latestAssessment: null,
  latestCreatedAt: null,
  actionLabel: done ? '查看结果' : '开始评估',
});

const task = (modules: WorkflowModuleSummary[]) => ({
  modules,
  reportReady: false,
} as unknown as VisitTaskSummary);

describe('report gate', () => {
  it('必需模块缺失时阻断并列出缺项', () => {
    const gate = evaluateReportGate(task([module('体态', true, true), module('量表', true, false), module('ROM', false, false)]));
    expect(gate.allowed).toBe(false);
    expect(gate.missingRequired).toEqual(['量表']);
    expect(gate.hint).toContain('量表');
  });

  it('必需齐全、可选缺失时放行并提示补录', () => {
    const gate = evaluateReportGate(task([module('体态', true, true), module('量表', true, true), module('ROM', false, false)]));
    expect(gate.allowed).toBe(true);
    expect(gate.optionalPending).toEqual(['ROM']);
    expect(gate.hint).toContain('建议补录');
  });

  it('全部完成时无额外提示', () => {
    const gate = evaluateReportGate(task([module('体态', true, true), module('量表', true, true), module('ROM', false, true)]));
    expect(gate.allowed).toBe(true);
    expect(gate.hint).toBe('可生成报告');
  });
});
