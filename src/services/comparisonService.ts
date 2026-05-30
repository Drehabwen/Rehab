import { Assessment } from '@/types/assessment';
import { db } from '@/lib/db';

/**
 * 对比服务层
 * 负责数据访问和业务逻辑，解耦 Store 之间的直接依赖
 */
export const ComparisonService = {
  /**
   * 加载患者的所有评估记录
   */
  async loadAssessmentsByPatient(patientId: string): Promise<Assessment[]> {
    if (!patientId) {
      throw new Error('患者 ID 不能为空');
    }

    try {
      const assessments = await db.assessments
        .where('patientId')
        .equals(patientId)
        .reverse()
        .sortBy('createdAt');

      return assessments;
    } catch (error) {
      console.error('[ComparisonService] 加载评估记录失败:', error);
      throw new Error('加载评估记录失败');
    }
  },

  /**
   * 加载对比数据
   * 验证评估记录是否属于该患者
   */
  async loadComparisonData(
    patientId: string,
    baselineId: string,
    currentId: string
  ): Promise<{ baseline: Assessment; current: Assessment }> {
    // 参数验证
    if (!patientId || !baselineId || !currentId) {
      throw new Error('缺少必要参数');
    }

    if (baselineId === currentId) {
      throw new Error('基线评估和当前评估不能相同');
    }

    try {
      // 加载该患者的所有评估记录
      const assessments = await this.loadAssessmentsByPatient(patientId);

      if (assessments.length === 0) {
        throw new Error('该患者暂无评估记录');
      }

      // 查找基线评估和当前评估
      const baseline = assessments.find(a => a.id === baselineId);
      const current = assessments.find(a => a.id === currentId);

      // 验证评估记录是否存在且属于该患者
      if (!baseline) {
        throw new Error('基线评估记录不存在或不属于该患者');
      }

      if (!current) {
        throw new Error('当前评估记录不存在或不属于该患者');
      }

      // 验证评估状态
      if (baseline.status !== 'completed') {
        throw new Error('基线评估尚未完成');
      }

      if (current.status !== 'completed') {
        throw new Error('当前评估尚未完成');
      }

      return { baseline, current };
    } catch (error) {
      console.error('[ComparisonService] 加载对比数据失败:', error);
      throw error;
    }
  },

  /**
   * 获取基线评估
   * 优先返回标记为基线的评估，否则返回最早的完成评估
   */
  async getBaselineAssessment(patientId: string): Promise<Assessment | null> {
    try {
      const assessments = await this.loadAssessmentsByPatient(patientId);
      
      // 过滤已完成的评估
      const completedAssessments = assessments.filter(a => a.status === 'completed');
      
      if (completedAssessments.length === 0) {
        return null;
      }

      // 优先返回标记为基线的评估
      const markedBaseline = completedAssessments.find(a => a.isBaseline);
      if (markedBaseline) {
        return markedBaseline;
      }

      // 否则返回最早的完成评估（数组最后一个，因为是倒序）
      return completedAssessments[completedAssessments.length - 1];
    } catch (error) {
      console.error('[ComparisonService] 获取基线评估失败:', error);
      return null;
    }
  },

  /**
   * 获取最新的评估
   */
  async getLatestAssessment(patientId: string): Promise<Assessment | null> {
    try {
      const assessments = await this.loadAssessmentsByPatient(patientId);
      
      // 过滤已完成的评估
      const completedAssessments = assessments.filter(a => a.status === 'completed');
      
      if (completedAssessments.length === 0) {
        return null;
      }

      // 返回最新的完成评估（数组第一个，因为是倒序）
      return completedAssessments[0];
    } catch (error) {
      console.error('[ComparisonService] 获取最新评估失败:', error);
      return null;
    }
  },

  /**
   * 标记评估为基线
   */
  async markAsBaseline(assessmentId: string): Promise<void> {
    if (!assessmentId) {
      throw new Error('评估 ID 不能为空');
    }

    try {
      await db.assessments.update(assessmentId, { isBaseline: true });
    } catch (error) {
      console.error('[ComparisonService] 标记基线评估失败:', error);
      throw new Error('标记基线评估失败');
    }
  },

  /**
   * 取消基线标记
   */
  async unmarkAsBaseline(assessmentId: string): Promise<void> {
    if (!assessmentId) {
      throw new Error('评估 ID 不能为空');
    }

    try {
      await db.assessments.update(assessmentId, { isBaseline: false });
    } catch (error) {
      console.error('[ComparisonService] 取消基线标记失败:', error);
      throw new Error('取消基线标记失败');
    }
  },

  /**
   * 加载趋势数据
   */
  async loadTrendData(patientId: string): Promise<Array<{
    timestamp: number;
    date: string;
    metrics: Record<string, number>;
  }>> {
    try {
      const assessments = await this.loadAssessmentsByPatient(patientId);
      
      const trendData = assessments
        .filter(a => (a.type === 'posture' || a.type === 'combined') && a.status === 'completed')
        .map(a => ({
          timestamp: a.createdAt,
          date: new Date(a.createdAt).toLocaleDateString('zh-CN'),
          metrics: a.data.posture?.metrics || {}
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      return trendData;
    } catch (error) {
      console.error('[ComparisonService] 加载趋势数据失败:', error);
      throw new Error('加载趋势数据失败');
    }
  }
};
