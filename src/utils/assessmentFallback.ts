import { PostureMetrics, PostureIssue } from '@/types/posture';

export interface FallbackReport {
  markdown: string;
  issues: PostureIssue[];
  metrics: PostureMetrics;
}

export interface FallbackOptions {
  reason: 'websocket_failed' | 'llm_timeout' | 'llm_error' | 'no_data';
  view: 'front' | 'side' | 'back';
  assessmentType: 'standard' | 'quick';
  metrics?: PostureMetrics;
}

export class AssessmentFallbackHandler {
  private static generateQuickReport(options: FallbackOptions): FallbackReport {
    const { reason, view, assessmentType, metrics } = options;
    
    const title = this.getTitle(reason);
    const warning = this.getWarning(reason, assessmentType);
    const analysis = this.getBasicAnalysis(view, metrics);
    
    const markdown = `### 体态评估报告（降级模式）

${warning}

## ${title}

${analysis}

## 建议

${this.getRecommendations(view, metrics)}

---

**注意**：此报告由系统自动生成，可能不如 AI 分析准确。如需更详细的评估，请重试或联系技术支持。`;

    return {
      markdown,
      issues: analysis.issues,
      metrics: metrics || this.getDefaultMetrics()
    };
  }

  private static getTitle(reason: FallbackOptions['reason']): string {
    const titles = {
      websocket_failed: '网络连接失败',
      llm_timeout: '分析超时',
      llm_error: '分析服务异常',
      no_data: '数据采集失败'
    };
    return titles[reason];
  }

  private static getWarning(reason: FallbackOptions['reason'], assessmentType: 'standard' | 'quick'): string {
    const warnings = {
      websocket_failed: '> **⚠️ 网络连接失败**：无法连接到分析服务器，已使用备用方案生成报告。',
      llm_timeout: '> **⚠️ 分析超时**：AI 分析服务响应超时，已使用备用方案生成报告。',
      llm_error: '> **⚠️ 分析服务异常**：AI 分析服务遇到错误，已使用备用方案生成报告。',
      no_data: '> **⚠️ 数据采集失败**：未收到有效的体态数据，请重新拍摄。'
    };

    let warning = warnings[reason];
    
    if (assessmentType === 'quick') {
      warning += '\n\n> **ℹ️ 提示**：快速评估模式仅基于单视角数据，建议进行完整评估以获得更准确的诊断。';
    }

    return warning;
  }

  private static getBasicAnalysis(view: 'front' | 'side' | 'back', metrics?: PostureMetrics): {
    issues: PostureIssue[];
    analysisText: string;
  } {
    const issues: PostureIssue[] = [];
    const analysisParts: string[] = [];

    if (metrics) {
      if (metrics.shoulderAngle !== null && metrics.shoulderAngle !== undefined) {
        const shoulderStatus = this.getShoulderStatus(metrics.shoulderAngle);
        analysisParts.push(`- 肩膀平衡度：${shoulderStatus.text}`);
        if (shoulderStatus.issue) {
          issues.push(shoulderStatus.issue);
        }
      }

      if (metrics.headDeviation !== null && metrics.headDeviation !== undefined) {
        const headStatus = this.getHeadDeviationStatus(metrics.headDeviation);
        analysisParts.push(`- 头部偏移：${headStatus.text}`);
        if (headStatus.issue) {
          issues.push(headStatus.issue);
        }
      }

      if (metrics.headForward !== null && metrics.headForward !== undefined) {
        const headForwardStatus = this.getHeadForwardStatus(metrics.headForward);
        analysisParts.push(`- 头前伸：${headForwardStatus.text}`);
        if (headForwardStatus.issue) {
          issues.push(headForwardStatus.issue);
        }
      }

      if (metrics.hipAngle !== null && metrics.hipAngle !== undefined) {
        const hipStatus = this.getHipStatus(metrics.hipAngle);
        analysisParts.push(`- 骨盆平衡：${hipStatus.text}`);
        if (hipStatus.issue) {
          issues.push(hipStatus.issue);
        }
      }
    } else {
      analysisParts.push('- 数据不足，无法进行详细分析');
    }

    return {
      issues,
      analysisText: analysisParts.join('\n')
    };
  }

  private static getShoulderStatus(angle: number): { text: string; issue?: PostureIssue } {
    if (Math.abs(angle) < 3) {
      return { text: '正常' };
    } else if (Math.abs(angle) < 6) {
      return {
        text: '轻微不平衡',
        issue: {
          id: 'shoulder_imbalance',
          type: 'alignment',
          severity: 'mild',
          title: '肩膀轻微不平衡',
          description: '左右肩膀高度存在轻微差异',
          recommendation: '注意保持正确坐姿，避免单侧承重'
        }
      };
    } else {
      return {
        text: '明显不平衡',
        issue: {
          id: 'shoulder_imbalance',
          type: 'alignment',
          severity: 'moderate',
          title: '肩膀明显不平衡',
          description: '左右肩膀高度存在明显差异',
          recommendation: '建议进行专业评估，可能需要矫正训练'
        }
      };
    }
  }

  private static getHeadDeviationStatus(deviation: number): { text: string; issue?: PostureIssue } {
    if (Math.abs(deviation) < 2) {
      return { text: '正常' };
    } else if (Math.abs(deviation) < 4) {
      return {
        text: '轻微偏移',
        issue: {
          id: 'head_deviation',
          type: 'alignment',
          severity: 'mild',
          title: '头部轻微偏移',
          description: '头部相对于身体中线存在轻微偏移',
          recommendation: '注意保持头部中立位，避免长时间侧倾'
        }
      };
    } else {
      return {
        text: '明显偏移',
        issue: {
          id: 'head_deviation',
          type: 'alignment',
          severity: 'moderate',
          title: '头部明显偏移',
          description: '头部相对于身体中线存在明显偏移',
          recommendation: '建议进行专业评估，可能需要矫正训练'
        }
      };
    }
  }

  private static getHeadForwardStatus(forward: number): { text: string; issue?: PostureIssue } {
    if (forward < 3) {
      return { text: '正常' };
    } else if (forward < 6) {
      return {
        text: '轻微前倾',
        issue: {
          id: 'head_forward',
          type: 'forward_head',
          severity: 'mild',
          title: '头部轻微前倾',
          description: '头部相对于身体重心存在轻微前倾',
          recommendation: '注意调整屏幕高度，保持头部中立位'
        }
      };
    } else {
      return {
        text: '明显前倾',
        issue: {
          id: 'head_forward',
          type: 'forward_head',
          severity: 'moderate',
          title: '头部明显前倾',
          description: '头部相对于身体重心存在明显前倾',
          recommendation: '建议进行专业评估，可能需要矫正训练'
        }
      };
    }
  }

  private static getHipStatus(angle: number): { text: string; issue?: PostureIssue } {
    if (Math.abs(angle) < 3) {
      return { text: '正常' };
    } else if (Math.abs(angle) < 6) {
      return {
        text: '轻微不平衡',
        issue: {
          id: 'hip_imbalance',
          type: 'alignment',
          severity: 'mild',
          title: '骨盆轻微不平衡',
          description: '骨盆存在轻微倾斜',
          recommendation: '注意保持正确站姿，避免单腿承重'
        }
      };
    } else {
      return {
        text: '明显不平衡',
        issue: {
          id: 'hip_imbalance',
          type: 'alignment',
          severity: 'moderate',
          title: '骨盆明显不平衡',
          description: '骨盆存在明显倾斜',
          recommendation: '建议进行专业评估，可能需要矫正训练'
        }
      };
    }
  }

  private static getRecommendations(view: 'front' | 'side' | 'back', metrics?: PostureMetrics): string {
    const recommendations: string[] = [];

    recommendations.push('1. 保持正确的坐姿和站姿');
    recommendations.push('2. 定期进行肩颈放松练习');
    recommendations.push('3. 调整工作环境，确保屏幕与视线平齐');

    if (metrics) {
      if (metrics.headForward !== null && metrics.headForward > 3) {
        recommendations.push('4. 每日进行颈部拉伸练习，缓解头前伸');
      }
      if (metrics.shoulderAngle !== null && Math.abs(metrics.shoulderAngle) > 3) {
        recommendations.push('5. 避免单侧承重，注意双侧平衡');
      }
    }

    return recommendations.join('\n');
  }

  private static getDefaultMetrics(): PostureMetrics {
    return {
      shoulderAngle: 0,
      hipAngle: 0,
      headDeviation: 0,
      headForward: 0,
      shoulderRounded: 0,
      headPitch: 0,
      headYaw: 0,
      headRoll: 0,
      head_axes: []
    };
  }

  public static generateFallbackReport(options: FallbackOptions): FallbackReport {
    return this.generateQuickReport(options);
  }
}

export default AssessmentFallbackHandler;
