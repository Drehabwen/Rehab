import { PostureIssue, PostureMetrics } from '@/types/posture';

export interface ReportInsightCard {
  id: string;
  tone: 'violet' | 'amber' | 'blue';
  eyebrow: string;
  title: string;
  summary: string;
  action: string;
  evidence: string[];
}

interface BuildReportInsightCardsOptions {
  metrics?: PostureMetrics | null;
  issues?: PostureIssue[] | null;
  auxiliaryDiagnosis?: string | null;
  markdownReport?: string | null;
}

interface BuildImmediateBasicReportOptions {
  metrics?: PostureMetrics | null;
  issues?: PostureIssue[] | null;
}

const severityRank: Record<PostureIssue['severity'], number> = {
  severe: 3,
  moderate: 2,
  mild: 1,
};

const metricSignalDefinitions = [
  {
    key: 'headForward' as const,
    label: '\u5934\u9888\u524d\u5f15',
    threshold: 3,
    evidence: (value: number) => `\u5934\u9888\u524d\u5f15 ${value.toFixed(1)}\u00b0`,
    action: '\u4f18\u5148\u8c03\u6574\u5c4f\u5e55\u9ad8\u5ea6\u548c\u4e45\u5750\u59ff\u52bf\uff0c\u518d\u914d\u5408\u9888\u80f8\u6bb5\u4f38\u5c55\u3002',
  },
  {
    key: 'shoulderAngle' as const,
    label: '\u80a9\u5e26\u4e0d\u5bf9\u79f0',
    threshold: 2,
    evidence: (value: number) => `\u9ad8\u4f4e\u80a9 ${Math.abs(value).toFixed(1)}\u00b0`,
    action: '\u6ce8\u610f\u53cc\u4fa7\u8d1f\u91cd\u5747\u8861\uff0c\u51cf\u5c11\u5355\u4fa7\u80cc\u5305\u6216\u4fa7\u8eab\u652f\u6491\u3002',
  },
  {
    key: 'hipAngle' as const,
    label: '\u9aa8\u76c6\u4ee3\u507f',
    threshold: 2,
    evidence: (value: number) => `\u9aa8\u76c6\u503e\u659c ${Math.abs(value).toFixed(1)}\u00b0`,
    action: '\u5173\u6ce8\u7ad9\u7acb\u627f\u91cd\u5e73\u8861\uff0c\u53ef\u5148\u8865\u5145\u9acb\u5468\u7a33\u5b9a\u4e0e\u9ac2\u8179\u63a7\u5236\u8bad\u7ec3\u3002',
  },
  {
    key: 'headRoll' as const,
    label: '\u5934\u90e8\u4fa7\u503e',
    threshold: 2,
    evidence: (value: number) => `\u5934\u90e8\u4fa7\u503e ${Math.abs(value).toFixed(1)}\u00b0`,
    action: '\u590d\u6d4b\u65f6\u5148\u6821\u6b63\u5934\u9888\u4e2d\u7acb\u4f4d\uff0c\u5173\u6ce8\u662f\u5426\u4e0e\u80a9\u5e26\u6216\u9aa8\u76c6\u4ee3\u507f\u540c\u65f6\u51fa\u73b0\u3002',
  },
  {
    key: 'headYaw' as const,
    label: '\u5934\u9888\u65cb\u8f6c',
    threshold: 2,
    evidence: (value: number) => `\u5934\u9888\u65cb\u8f6c ${Math.abs(value).toFixed(1)}\u00b0`,
    action: '\u68c0\u67e5\u5de5\u4f5c\u4f4d\u89c6\u7ebf\u548c\u64cd\u4f5c\u4f4d\u7f6e\uff0c\u51cf\u5c11\u957f\u65f6\u95f4\u504f\u5934\u4ee3\u507f\u3002',
  },
];

const normalizeText = (line: string) =>
  line
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[-*+]\s*/, '')
    .replace(/^\d+\.\s*/, '')
    .replace(/^>\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .trim();

const collectReportSnippets = (text?: string | null) => {
  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map(normalizeText)
    .filter((line) => line.length >= 10)
    .filter((line) => !line.includes('\u6df1\u5ea6\u5206\u6790') && !line.includes('\u8f85\u52a9\u8bca\u65ad'))
    .slice(0, 3);
};

const buildMetricSignals = (metrics?: PostureMetrics | null) => {
  if (!metrics) {
    return [];
  }

  return metricSignalDefinitions
    .map((definition) => {
      const rawValue = metrics[definition.key];
      if (typeof rawValue !== 'number' || !Number.isFinite(rawValue) || Math.abs(rawValue) < definition.threshold) {
        return null;
      }

      return {
        key: definition.key,
        label: definition.label,
        threshold: definition.threshold,
        evidence: definition.evidence(rawValue),
        action: definition.action,
        magnitude: Math.abs(rawValue),
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => b.magnitude - a.magnitude);
};

const chooseDominantIssue = (issues: PostureIssue[]) =>
  [...issues].sort((a, b) => severityRank[b.severity] - severityRank[a.severity])[0];

const getSignalSeverity = (magnitude: number, threshold: number): PostureIssue['severity'] => {
  if (magnitude >= threshold * 2.2) {
    return 'severe';
  }

  if (magnitude >= threshold * 1.45) {
    return 'moderate';
  }

  return 'mild';
};

const buildImmediateIssueTitle = (label: string, severity: PostureIssue['severity']) => {
  if (severity === 'severe') {
    return `${label}偏移明显`;
  }

  if (severity === 'moderate') {
    return `${label}需要优先关注`;
  }

  return `${label}存在轻度偏移`;
};

export const inferImmediateIssues = (metrics?: PostureMetrics | null): PostureIssue[] => {
  return buildMetricSignals(metrics)
    .slice(0, 3)
    .map((signal) => {
      const severity = getSignalSeverity(signal.magnitude, signal.threshold);
      return {
        id: `immediate-${signal.key}`,
        type: signal.key,
        severity,
        title: buildImmediateIssueTitle(signal.label, severity),
        description: `当前量化结果提示 ${signal.evidence}，可作为本次快评的优先关注点。`,
        recommendation: signal.action,
      };
    });
};

export const buildImmediateBasicReport = ({
  metrics,
  issues,
}: BuildImmediateBasicReportOptions): string | null => {
  const safeIssues = issues && issues.length > 0 ? issues : inferImmediateIssues(metrics);
  const metricSignals = buildMetricSignals(metrics);
  const dominantIssue = safeIssues.length > 0 ? chooseDominantIssue(safeIssues) : null;
  const hasMetricPayload = Boolean(
    metrics && Object.values(metrics).some((value) => typeof value === 'number' && Number.isFinite(value)),
  );

  if (!dominantIssue && metricSignals.length === 0 && !hasMetricPayload) {
    return null;
  }

  const lines = [
    '### 即时基础结论',
    '',
  ];

  if (dominantIssue) {
    lines.push(`- 当前最需要优先关注的问题：${dominantIssue.title}`);
    lines.push(`- 表现：${dominantIssue.description}`);
  } else if (metricSignals[0]) {
    lines.push(`- 当前最突出的姿势偏移：${metricSignals[0].label}`);
    lines.push(`- 量化表现：${metricSignals[0].evidence}`);
  }

  if (metricSignals.length > 1) {
    lines.push(`- 联动信号：${metricSignals.slice(0, 3).map((signal) => signal.evidence).join('；')}`);
  }

  if (!dominantIssue && metricSignals.length === 0) {
    lines.push('- 当前未见需要优先警示的高风险姿态异常。');
    lines.push('- 本次评估已完成基础量化采集，可结合现场症状和复测需求继续随访。');
  }

  lines.push('');
  lines.push('### 建议动作');
  lines.push(
    dominantIssue?.recommendation
      || metricSignals[0]?.action
      || '建议保持当前训练与日常姿势管理；如后续症状变化，可前往报告中心继续查看汇总报告或安排复测。',
  );

  return lines.join('\n');
};

const issueMatchesSignal = (
  issue: PostureIssue,
  signal: ReturnType<typeof buildMetricSignals>[number],
) => {
  const normalizedText = `${issue.id} ${issue.type} ${issue.title} ${issue.description}`.toLowerCase();

  if (signal.key === 'headForward') {
    return normalizedText.includes('forward_head') || normalizedText.includes('\u524d\u5f15');
  }

  if (signal.key === 'shoulderAngle') {
    return normalizedText.includes('shoulder') || normalizedText.includes('\u80a9');
  }

  if (signal.key === 'hipAngle') {
    return normalizedText.includes('hip') || normalizedText.includes('\u9aa8\u76c6');
  }

  if (signal.key === 'headRoll') {
    return normalizedText.includes('\u4fa7\u503e') || normalizedText.includes('roll');
  }

  if (signal.key === 'headYaw') {
    return normalizedText.includes('\u65cb\u8f6c') || normalizedText.includes('yaw');
  }

  return false;
};

export const buildReportInsightCards = ({
  metrics,
  issues,
  auxiliaryDiagnosis,
  markdownReport,
}: BuildReportInsightCardsOptions): ReportInsightCard[] => {
  const safeIssues = issues || [];
  const reportSnippets = [
    ...collectReportSnippets(markdownReport),
    ...collectReportSnippets(auxiliaryDiagnosis),
  ];
  const metricSignals = buildMetricSignals(metrics);
  const cards: ReportInsightCard[] = [];

  const dominantIssue = safeIssues.length > 0 ? chooseDominantIssue(safeIssues) : null;
  if (dominantIssue) {
    const matchedSignal = metricSignals.find((signal) => issueMatchesSignal(dominantIssue, signal));

    cards.push({
      id: 'priority-focus',
      tone: dominantIssue.severity === 'severe' ? 'amber' : 'violet',
      eyebrow: '\u4f18\u5148\u5e72\u9884',
      title: `${dominantIssue.title}\u9700\u8981\u4f18\u5148\u5904\u7406`,
      summary: reportSnippets[0]
        ? `\u62a5\u544a\u4e2d\u5df2\u51fa\u73b0\u4e0e\u8be5\u95ee\u9898\u76f8\u5173\u7684\u7ed3\u8bba\uff0c\u76ee\u524d\u8981\u5148\u9501\u5b9a\u8fd9\u4e2a\u98ce\u9669\u70b9\u3002`
        : '\u5f53\u524d\u98ce\u9669\u9879\u91cc\uff0c\u8fd9\u4e2a\u95ee\u9898\u5bf9\u59ff\u52bf\u8d1f\u8377\u548c\u540e\u7eed\u4ee3\u507f\u5f71\u54cd\u6700\u76f4\u63a5\u3002',
      action: dominantIssue.recommendation,
      evidence: [
        dominantIssue.description,
        matchedSignal?.evidence,
        reportSnippets[0],
      ].filter((item): item is string => Boolean(item)),
    });
  }

  if (metricSignals.length >= 2) {
    const primarySignals = metricSignals.slice(0, 3);
    cards.push({
      id: 'compensation-chain',
      tone: 'amber',
      eyebrow: '\u8054\u52a8\u6d1e\u5bdf',
      title: '\u5f02\u5e38\u53ef\u80fd\u5df2\u7ecf\u5f62\u6210\u4ee3\u507f\u94fe',
      summary: `\u5f53\u524d\u5f02\u5e38\u4e3b\u8981\u96c6\u4e2d\u5728${primarySignals.map((signal) => signal.label).join('\u3001')}\uff0c\u8bf4\u660e\u4e0d\u50cf\u662f\u5355\u4e00\u5c40\u90e8\u95ee\u9898\uff0c\u66f4\u50cf\u662f\u59ff\u52bf\u94fe\u8def\u7684\u8054\u52a8\u4ee3\u507f\u3002`,
      action: primarySignals[0].action,
      evidence: [
        ...primarySignals.map((signal) => signal.evidence),
        reportSnippets[1],
      ].filter((item): item is string => Boolean(item)),
    });
  }

  if (safeIssues.length > 0 || reportSnippets.length > 0 || metricSignals.length > 0) {
    cards.push({
      id: 'follow-up',
      tone: 'blue',
      eyebrow: '\u590d\u6d4b\u8282\u594f',
      title: '\u5efa\u8bae\u6309\u201c\u5e72\u9884\u540e\u590d\u6d4b\u201d\u7684\u65b9\u5f0f\u8ddf\u8fdb',
      summary: markdownReport
        ? '\u6df1\u5ea6\u62a5\u544a\u5df2\u7ecf\u56de\u4f20\uff0c\u53ef\u5c06\u5f53\u524d\u5173\u952e\u98ce\u9669\u4f5c\u4e3a\u540e\u7eed\u590d\u8bc4\u7684\u5bf9\u7167\u70b9\u3002'
        : '\u867d\u7136\u8fd8\u6ca1\u6709\u53ef\u7528\u7684\u6df1\u5ea6 LLM \u62a5\u544a\uff0c\u4f46\u5df2\u6709\u57fa\u7840\u62a5\u544a\u3001\u95ee\u9898\u5217\u8868\u548c\u6307\u6807\u53ef\u4ee5\u7528\u6765\u5b9a\u4e49\u590d\u6d4b\u91cd\u70b9\u3002',
      action: '\u4f18\u5148\u56f4\u7ed5\u6700\u7a81\u51fa\u7684 1-2 \u4e2a\u98ce\u9669\u70b9\u5b89\u6392\u77ed\u671f\u5e72\u9884\uff0c\u5e72\u9884\u540e\u7528\u540c\u4e00\u89c6\u89d2\u91cd\u65b0\u62cd\u6444\uff0c\u5bf9\u6bd4\u6307\u6807\u548c\u95ee\u9898\u53d8\u5316\u3002',
      evidence: [
        safeIssues.length > 0 ? `\u5df2\u63a5\u6536 ${safeIssues.length} \u6761\u98ce\u9669\u9879` : null,
        metricSignals.length > 0 ? `\u5df2\u63a5\u6536 ${metricSignals.length} \u4e2a\u53ef\u7528\u5f02\u5e38\u6307\u6807` : null,
        reportSnippets[2] || reportSnippets[0],
      ].filter((item): item is string => Boolean(item)),
    });
  }

  if (cards.length === 0) {
    cards.push({
      id: 'maintenance',
      tone: 'blue',
      eyebrow: '\u7ef4\u6301\u5efa\u8bae',
      title: '\u5f53\u524d\u672a\u89c1\u660e\u663e\u9ad8\u98ce\u9669\uff0c\u4f46\u4ecd\u5efa\u8bae\u5b9a\u671f\u590d\u6d4b',
      summary: '\u76ee\u524d\u56de\u4f20\u6570\u636e\u6ca1\u6709\u663e\u793a\u96c6\u4e2d\u7684\u9ad8\u98ce\u9669\u59ff\u52bf\u95ee\u9898\uff0c\u9002\u5408\u4ee5\u7ef4\u6301\u548c\u9884\u9632\u4e3a\u4e3b\u3002',
      action: '\u4fdd\u6301\u89c4\u5f8b\u6d3b\u52a8\uff0c\u5982\u679c\u5de5\u4f5c\u59ff\u52bf\u6216\u75c7\u72b6\u53d1\u751f\u53d8\u5316\uff0c\u518d\u8fdb\u884c\u590d\u6d4b\u3002',
      evidence: ['\u5f53\u524d\u62a5\u544a\u4e2d\u672a\u89c1\u660e\u663e\u7684\u9ad8\u98ce\u9669\u6307\u5411\u3002'],
    });
  }

  return cards.slice(0, 3);
};

