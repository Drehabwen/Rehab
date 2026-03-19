import type { SessionReportInput } from '@/types/report-center';

export interface SessionInsightCard {
  id: string;
  tone: 'blue' | 'amber' | 'violet';
  title: string;
  summary: string;
  evidence: string[];
  action: string;
}

const toneLabels = {
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
};

export const sessionInsightToneClass = (tone: SessionInsightCard['tone']) => toneLabels[tone];

const trimPreview = (value: string | null | undefined, maxLength = 140): string => {
  if (!value) {
    return '暂无有效输入';
  }

  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength)}...`;
};

const missingLabel = (types: string[]) => (types.length > 0 ? types.join(' / ') : '无');

export function buildSessionInsightCards(
  sessionInput: SessionReportInput,
  patientType: 'adult' | 'adolescent' = 'adult',
): SessionInsightCard[] {
  const cards: SessionInsightCard[] = [];
  const posture = sessionInput.outputs.posture;
  const rom = sessionInput.outputs.rom;
  const medvoice = sessionInput.outputs.medvoice;
  const fatigue = sessionInput.outputs.fatigue;

  if (patientType === 'adolescent') {
    cards.push({
      id: 'adolescent-focus',
      tone: 'violet',
      title: '青少年筛查模式已启用',
      summary: '报告将优先关注生长发育期常见的体态异常、负荷风险和复测建议，不输出诊断性结论。',
      evidence: ['筛查对象类型：青少年', '输出重点：风险提示 / 趋势跟踪 / 复测建议'],
      action: '建议在对外报告中保留“筛查结论”与“建议复测时间”，避免使用治疗或诊断话术。',
    });
  }

  if (posture && rom) {
    cards.push({
      id: 'posture-rom',
      tone: 'blue',
      title: '体态表现与活动度可交叉复核',
      summary: '当前会话同时具备体态筛查和 ROM 辅助结果，可以判断受限活动度是否与体态异常同步出现。',
      evidence: [
        `体态状态：${posture.status}`,
        `ROM 状态：${rom.status}`,
      ],
      action: '优先在报告中输出“异常体态 + 相关活动受限 + 建议复测”的组合结论。',
    });
  }

  if (posture && medvoice) {
    cards.push({
      id: 'posture-medvoice',
      tone: 'violet',
      title: '主诉信息可用于解释筛查发现',
      summary: '已采集到问询补充内容，可将学生主诉、不适部位或训练反馈与体态异常一起呈现。',
      evidence: [
        `体态摘要：${posture.status}`,
        `问询摘要：${medvoice.status}`,
      ],
      action: '报告中建议增加“问询补充”区块，帮助老师、家长和复核人员理解异常背景。',
    });
  }

  if (fatigue && posture) {
    cards.push({
      id: 'fatigue-posture',
      tone: 'amber',
      title: '当前筛查可提示负荷相关风险',
      summary: '会话同时存在体态结果与稳定性/疲劳信号，可将其作为复测优先级参考，而不是直接下诊断。',
      evidence: [
        `疲劳状态：${fatigue.status}`,
        `体态状态：${posture.status}`,
      ],
      action: '在报告结论中使用“建议关注”“建议复测”“建议转人工复核”等措辞。',
    });
  }

  if (sessionInput.readiness.readyCount <= 1) {
    cards.push({
      id: 'insufficient-data',
      tone: 'amber',
      title: '当前会话证据维度偏少',
      summary: '可用输入不足两个维度，当前报告更适合作为初筛记录，不适合形成强结论。',
      evidence: [
        `已就绪模块：${sessionInput.readiness.readyCount}/4`,
        `缺失模块：${missingLabel(sessionInput.readiness.missingTypes)}`,
      ],
      action: '建议补齐至少一个辅助维度后再生成正式归档报告。',
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'archive-ready',
      tone: 'blue',
      title: '当前会话已具备归档条件',
      summary: '筛查输入较完整，可以生成正式筛查报告并进入报告归档。',
      evidence: [
        `已就绪模块：${sessionInput.readiness.readyCount}/4`,
        `缺失模块：${missingLabel(sessionInput.readiness.missingTypes)}`,
      ],
      action: '建议生成正式报告，并将结果推送到学生档案与预警复测列表。',
    });
  }

  return cards.slice(0, 3);
}

export function buildSessionDraftReport(sessionInput: SessionReportInput): string {
  const lines: string[] = [
    '# 筛查报告草稿预览',
    '',
    `- 筛查会话：${sessionInput.sessionId}`,
    `- 学生：${sessionInput.patientName || sessionInput.patientId}`,
    `- 已就绪模块：${sessionInput.readiness.readyCount}/4`,
    `- 缺失模块：${missingLabel(sessionInput.readiness.missingTypes)}`,
    '',
    '## 体态筛查',
    trimPreview(sessionInput.outputs.posture?.preview),
    '',
    '## ROM 辅助',
    trimPreview(sessionInput.outputs.rom?.preview),
    '',
    '## 问询补充',
    trimPreview(sessionInput.outputs.medvoice?.preview),
    '',
    '## 稳定性/疲劳参考',
    trimPreview(sessionInput.outputs.fatigue?.preview),
    '',
    '## 使用说明',
    '当前内容是报告中心的归档预览，用于确认本次筛查会话是否已具备生成正式报告的条件。',
    '正式报告应以风险提示、趋势跟踪和复测建议为核心，不输出诊断性结论。',
  ];

  return lines.join('\n');
}
