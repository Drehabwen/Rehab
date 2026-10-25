import type { VisitTaskSummary } from './workflow';

export interface ReportGate {
  /** 是否允许生成/进入报告 */
  allowed: boolean;
  /** 缺失的必需模块（中文短名），供 UI 提示 */
  missingRequired: string[];
  /** 可选模块中未完成的部分，仅作提示，不阻断 */
  optionalPending: string[];
  /** 建议的下一步动作文案 */
  hint: string;
}

/**
 * 报告门禁：只有必需模块全部完成才允许出报告。
 * 可选模块（ROM / 问诊）未完成时只提示补录，不阻断流程。
 */
export function evaluateReportGate(task: VisitTaskSummary): ReportGate {
  const missingRequired = task.modules
    .filter((module) => module.required && module.status !== 'completed')
    .map((module) => module.shortTitle);
  const optionalPending = task.modules
    .filter((module) => !module.required && module.status !== 'completed')
    .map((module) => module.shortTitle);

  const allowed = missingRequired.length === 0;
  const hint = allowed
    ? optionalPending.length > 0
      ? `可生成报告；建议补录可选评估：${optionalPending.join('、')}`
      : '可生成报告'
    : `完成必需评估后才能生成报告：${missingRequired.join('、')}`;

  return { allowed, missingRequired, optionalPending, hint };
}
