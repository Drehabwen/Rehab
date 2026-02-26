import { PostureMetrics, PostureIssue } from '@/types/posture';

export interface VisualAnnotation {
  type: 'line' | 'point' | 'angle' | 'text';
  points: { x: number; y: number }[];
  color?: string;
  label?: string;
  dashed?: boolean;
  dash?: number[];
  lineWidth?: number;
}

export interface AnalysisResult {
  metrics: PostureMetrics;
  issues: PostureIssue[];
  annotations?: VisualAnnotation[];
  stability?: {
    sd: number;
    score: number;
  };
  timestamp: number;
}

/**
 * Generates a rule-based auxiliary report from analysis metrics and issues.
 * This provides immediate feedback while waiting for LLM deep analysis.
 */
export function generateAuxiliaryReport(data: AnalysisResult): string {
  const { metrics, issues } = data;
  let report = `### 🩺 辅助诊断报告 (基于规则引擎)\n\n`;
  
  report += `#### 📊 生物力学指标\n`;
  Object.entries(metrics).forEach(([key, value]) => {
    // Only include numeric metrics that aren't coordinate arrays
    if (typeof value === 'number' && key !== 'head_axes') {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
      const unit = key.toLowerCase().includes('angle') ? '°' : '';
      report += `- **${label}**: ${value.toFixed(1)}${unit}\n`;
    }
  });

  if (issues && issues.length > 0) {
    report += `\n#### ⚠️ 检测到的问题\n`;
    issues.forEach(issue => {
      const severityIcon = issue.severity === 'severe' ? '🔴' : issue.severity === 'moderate' ? '🟡' : '🔵';
      report += `- ${severityIcon} **${issue.title}**: ${issue.description}\n`;
      if (issue.recommendation) {
        report += `  - *建议*: ${issue.recommendation}\n`;
      }
    });
  } else {
    report += `\n✅ **未检测到明显的体态问题**。保持良好的坐姿和运动习惯！\n`;
  }

  report += `\n---\n*注：此报告由规则引擎自动生成，仅供参考。点击“深度分析”以获取 AI 详细评估。*`;
  return report;
}
