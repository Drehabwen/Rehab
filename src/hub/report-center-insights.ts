import type { SessionReportInput } from '@/types/report-center';

export interface SessionInsightCard {
  id: string;
  tone: 'blue' | 'amber' | 'violet';
  title: string;
  summary: string;
  evidence: string[];
  action: string;
}

const trimPreview = (value: string | null | undefined, maxLength = 140): string => {
  if (!value) {
    return '暂无输入';
  }

  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) {
    return compact;
  }

  return `${compact.slice(0, maxLength)}...`;
};

export function buildSessionInsightCards(sessionInput: SessionReportInput): SessionInsightCard[] {
  const cards: SessionInsightCard[] = [];
  const posture = sessionInput.outputs.posture;
  const rom = sessionInput.outputs.rom;
  const medvoice = sessionInput.outputs.medvoice;
  const adams = sessionInput.outputs.adams;

  if (adams && adams.sourceAssessment.data.adams) {
    const deg = adams.sourceAssessment.data.adams.atrDegrees;
    if (deg >= 7) {
      cards.push({
        id: 'adams-high-risk',
        tone: 'amber',
        title: '🚨 脊柱侧弯高危黄色警报',
        summary: `患者 ATR 旋转角已达 ${deg}°，估计 Cobb 角可能已超出安全界限。综合报告中应强制注明转诊提示。`,
        evidence: [
          `躯干旋转 ATR ${deg}°`,
          `脊柱大致形态: ${
            adams.sourceAssessment.data.adams.spineCurveEstimate === 's-shape'
              ? 'S 形弯曲'
              : adams.sourceAssessment.data.adams.spineCurveEstimate === 'c-shape-left'
              ? '左 C 形'
              : adams.sourceAssessment.data.adams.spineCurveEstimate === 'c-shape-right'
              ? '右 C 形'
              : '对称直线'
          }`,
        ],
        action: '建议康复师立即引导家长前往三甲医院小儿骨科拍摄全脊柱 X 光片进行确诊，以确定是否需要佩戴支具。',
      });
    }
  }

  if (posture && rom) {
    cards.push({
      id: 'posture-rom',
      tone: 'blue',
      title: '体态与 ROM 已具备交叉复核条件',
      summary: '客观姿态结果和关节活动度结果已经进入同一次接诊，可在综合报告里同时判断对位异常与活动受限是否存在一致性。',
      evidence: [
        `体态 ${posture.status === 'ready' ? '已就绪' : '部分到位'}`,
        `ROM ${rom.status === 'ready' ? '已就绪' : '部分到位'}`,
      ],
      action: '下一步可在同一份综合报告中联读姿态异常、代偿链 and ROM 限制，不再分散在两个模块里判断。',
    });
  }

  if (posture && medvoice) {
    cards.push({
      id: 'posture-voice',
      tone: 'violet',
      title: '症状描述已可与体态证据对照',
      summary: '主诉/现病史和体态评估已经进入同一接诊上下文，可以在综合报告中判断主观不适与客观姿态异常是否同向。',
      evidence: [
        `语音病历 ${medvoice.status === 'ready' ? '已结构化' : '仅转写'}`,
        `体态报告 ${posture.status === 'ready' ? '已就绪' : '部分到位'}`,
      ],
      action: '综合报告应优先解释“症状出现在哪些动作或姿势负荷下”，而不是只重复单模块结论。',
    });
  }

  if (medvoice && !rom) {
    cards.push({
      id: 'missing-rom',
      tone: 'amber',
      title: '仍缺少 ROM 证据层',
      summary: '已经有语音病历或体态输入，但缺少关节活动度数据时，综合报告对功能受限的判断仍偏经验性。',
      evidence: ['ROM 输入缺失', `当前已到位 ${sessionInput.readiness.readyCount}/5`],
      action: '若患者主诉涉及疼痛、僵硬、活动受限，建议补 ROM 评估后再生成综合报告。',
    });
  }

  if (medvoice && !sessionInput.outputs.scale) {
    cards.push({
      id: 'missing-scale',
      tone: 'amber',
      title: '缺少量表客观评分层',
      summary: '已经有语音主诉，但缺少日常生活能力、平衡或肌力等临床量化评分时，难以支撑客观多维预后对比。',
      evidence: ['量表评估缺失', `当前已到位 ${sessionInput.readiness.readyCount}/5`],
      action: '建议根据接诊情况，补充 ADL自理能力（MBI）或平衡（Berg）等量表评估。',
    });
  }

  if (sessionInput.readiness.readyCount <= 1) {
    cards.push({
      id: 'insufficient-context',
      tone: 'amber',
      title: '综合上下文仍偏薄',
      summary: '当前进入报告中心的输入不足两类，综合结论容易退化成单模块扩写，不适合直接当成最终全局报告。',
      evidence: [`已就绪 ${sessionInput.readiness.readyCount}/5`, `缺失 ${sessionInput.readiness.missingTypes.join(' / ') || '无'}`],
      action: '建议至少补齐另一类评估输入，再进入综合报告生成。',
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'ready',
      tone: 'blue',
      title: '综合输入已具备编排条件',
      summary: '当前接诊的核心输入已经收齐，报告中心可以进入综合报告生成与跨输入洞察阶段。',
      evidence: [`已就绪 ${sessionInput.readiness.readyCount}/5`, `缺失 ${sessionInput.readiness.missingTypes.join(' / ') || '无'}`],
      action: '下一步可从报告中心统一生成综合报告，并将结果衔接到治疗方案。',
    });
  }

  return cards.slice(0, 3);
}

export function buildSessionDraftReport(sessionInput: SessionReportInput): string {
  const lines: string[] = [
    `# 综合报告编排预览`,
    ``,
    `- 接诊：${sessionInput.sessionId}`,
    `- 患者：${sessionInput.patientName || sessionInput.patientId}`,
    `- 已就绪输入：${sessionInput.readiness.readyCount}/5`,
    `- 缺失输入：${sessionInput.readiness.missingTypes.join(' / ') || '无'}`,
    ``,
    `## 体态评估输入`,
    trimPreview(sessionInput.outputs.posture?.preview),
    ``,
    `## 亚当斯脊柱侧弯筛查输入`,
    trimPreview(sessionInput.outputs.adams?.preview),
    ``,
    `## ROM 输入`,
    trimPreview(sessionInput.outputs.rom?.preview),
    ``,
    `## 语音病历输入`,
    trimPreview(sessionInput.outputs.medvoice?.preview),
    ``,
    `## 量表评估输入`,
    trimPreview(sessionInput.outputs.scale?.preview),
    ``,
    `## 综合编排说明`,
    `当前内容为报告中心的编排预览，用于确认 posture、adams、ROM、语音病历、量表评估是否进入同一次接诊上下文。`,
    `后续真正的综合 LLM 报告将只从这里发起，并基于这些输入统一生成。`,
  ];

  return lines.join('\n');
}
