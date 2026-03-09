import { nanoid } from 'nanoid';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import type { ROMAssessment, ROMData } from '../types';
import { calculateROMScore, calculateROMStatus, jointNameMap, directionNameMap } from '../utils/rom-utils';
import { ROM_TEXTS } from '../constants/uiText';

export const ROMService = {
  async saveAssessment(assessment: Omit<ROMAssessment, 'id' | 'createdAt'>): Promise<ROMAssessment> {
    const newAssessment: ROMAssessment = {
      ...assessment,
      id: nanoid(12),
      createdAt: Date.now(),
    };

    try {
      const { addAssessment } = useAssessmentStore.getState();
      await addAssessment({
        sessionId: newAssessment.sessionId,
        patientId: newAssessment.patientId,
        type: 'rom',
        mode: 'realtime',
        data: {
          rom: {
            items: newAssessment.data,
            summary: ROMService.generateReport(newAssessment),
            recommendations: ROMService.generateRecommendations(newAssessment.data),
          },
        },
        notes: newAssessment.notes,
      });

      return newAssessment;
    } catch (error) {
      console.error('[ROMService] 保存评估失败:', error);
      throw new Error('保存评估失败');
    }
  },

  async loadAssessmentsByPatient(patientId: string): Promise<ROMAssessment[]> {
    try {
      const { assessments } = useAssessmentStore.getState();
      return assessments
        .filter((assessment) => assessment.type === 'rom' && assessment.patientId === patientId)
        .map((assessment) => ({
          id: assessment.id,
          patientId: assessment.patientId,
          sessionId: assessment.sessionId,
          createdAt: assessment.createdAt,
          data: assessment.data.rom?.items || [],
          notes: assessment.notes,
          status: assessment.status,
        }));
    } catch (error) {
      console.error('[ROMService] 加载评估失败:', error);
      return [];
    }
  },

  generateReport(assessment: ROMAssessment): string {
    const score = calculateROMScore(assessment.data);
    const sections = [
      '# 关节活动度评估报告',
      `## 总体评分: ${score}/100`,
      '## 详细数据',
    ];

    assessment.data.forEach((item) => {
      const status = calculateROMStatus(item.joint, item.direction, item.angle);
      sections.push(
        `- ${jointNameMap[item.joint]} ${directionNameMap[item.direction]}: ${item.angle.toFixed(1)}° (${ROM_TEXTS.status[status]})`
      );
    });

    return sections.join('\n');
  },

  generateRecommendations(data: ROMData[]): string[] {
    const recommendations: string[] = [];

    data.forEach((item) => {
      const status = calculateROMStatus(item.joint, item.direction, item.angle);
      if (status === 'limited') {
        recommendations.push(
          `${jointNameMap[item.joint]}${item.side === 'left' ? '左' : '右'}侧${directionNameMap[item.direction]}活动受限，建议进行针对性康复训练`
        );
      }
    });

    return recommendations.length > 0 ? recommendations : ['关节活动度正常，建议保持适当运动'];
  },

  exportAssessment(assessment: ROMAssessment): string {
    return JSON.stringify(assessment, null, 2);
  },

  importAssessment(data: string): ROMAssessment {
    try {
      return JSON.parse(data);
    } catch {
      throw new Error('无效的评估数据');
    }
  },
};
