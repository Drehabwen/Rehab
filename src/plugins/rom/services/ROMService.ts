import { nanoid } from 'nanoid';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import type { ROMAssessment, ROMData } from '../types';
import { calculateROMScore, calculateROMStatus, jointNameMap, directionNameMap } from '../utils/rom-utils';
import { ROM_TEXTS } from '../constants/uiText';

export const ROMService = {
  /**
   * 保存 ROM 评估数据到数据中心
   */
  async saveAssessment(assessment: Omit<ROMAssessment, 'id' | 'createdAt'>): Promise<ROMAssessment> {
    const newAssessment: ROMAssessment = {
      ...assessment,
      id: nanoid(12),
      createdAt: Date.now(),
    };
    
    try {
      // 保存到数据中心
      const { addAssessment } = useAssessmentStore.getState();
      addAssessment({
        sessionId: newAssessment.sessionId,
        patientId: newAssessment.patientId,
        type: 'rom',
        mode: 'realtime',
        data: {
          rom: {
            items: newAssessment.data,
            summary: ROMService.generateReport(newAssessment),
            recommendations: ROMService.generateRecommendations(newAssessment.data)
          }
        },
        notes: newAssessment.notes
      });
      
      return newAssessment;
    } catch (error) {
      console.error('[ROMService] 保存评估失败:', error);
      throw new Error('保存评估失败');
    }
  },
  
  /**
   * 加载患者的 ROM 评估记录
   */
  async loadAssessmentsByPatient(patientId: string): Promise<ROMAssessment[]> {
    try {
      const { assessments } = useAssessmentStore.getState();
      return assessments
        .filter(a => a.type === 'rom' && a.patientId === patientId)
        .map(a => ({
          id: a.id,
          patientId: a.patientId,
          sessionId: a.sessionId,
          createdAt: a.createdAt,
          data: a.data.rom?.items || [],
          notes: a.notes,
          status: a.status
        }));
    } catch (error) {
      console.error('[ROMService] 加载评估失败:', error);
      return [];
    }
  },
  
  /**
   * 生成 ROM 报告
   */
  generateReport(assessment: ROMAssessment): string {
    const { data } = assessment;
    const score = calculateROMScore(data);
    
    const sections = [
      '# 关节活动度评估报告',
      `## 总体评分: ${score}/100`,
      '## 详细数据',
    ];
    
    data.forEach(item => {
      const status = calculateROMStatus(item.joint, item.direction, item.angle);
      sections.push(`- ${jointNameMap[item.joint]} ${directionNameMap[item.direction]}: ${item.angle.toFixed(1)}° (${ROM_TEXTS.status[status]})`);
    });
    
    return sections.join('\n');
  },
  
  /**
   * 生成康复建议
   */
  generateRecommendations(data: ROMData[]): string[] {
    const recommendations: string[] = [];
    
    // 基于评估数据生成建议
    data.forEach(item => {
      const status = calculateROMStatus(item.joint, item.direction, item.angle);
      if (status === 'limited') {
        recommendations.push(`${jointNameMap[item.joint]}${item.side === 'left' ? '左' : '右'}${directionNameMap[item.direction]}活动受限，建议进行针对性康复训练`);
      }
    });
    
    return recommendations.length > 0 ? recommendations : ['关节活动度正常，建议保持适当运动'];
  },
  
  /**
   * 导出 ROM 评估数据
   */
  exportAssessment(assessment: ROMAssessment): string {
    return JSON.stringify(assessment, null, 2);
  },
  
  /**
   * 导入 ROM 评估数据
   */
  importAssessment(data: string): ROMAssessment {
    try {
      const assessment = JSON.parse(data);
      return assessment;
    } catch (error) {
      throw new Error('无效的评估数据');
    }
  },
};
