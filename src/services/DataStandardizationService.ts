import { Assessment, AssessmentRecord, PostureAssessmentData, RomAssessmentData, MedVoiceAssessmentData } from '../types/assessment';
import { PostureMetrics, PostureIssue } from '../types/posture';

interface StandardizedAssessment {
  id: string;
  patientId: string;
  type: 'posture' | 'rom' | 'medvoice' | 'combined' | 'scale' | 'adams';
  createdAt: number;
  metrics: Record<string, number | string | boolean>;
  issues: Array<{
    type: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
  }>;
  recommendations: string[];
  rawData: any;
}

interface StandardizedRecord {
  id: string;
  patientId: string;
  type: 'front' | 'side' | 'back';
  timestamp: string;
  metrics: Record<string, number>;
  angles: Record<string, number>;
  landmarks: Array<{x: number; y: number}>;
  imageData: string;
  feedback: string;
  improvement: number;
}

export class DataStandardizationService {
  static standardizeAssessment(assessment: Assessment): StandardizedAssessment {
    const standardized: StandardizedAssessment = {
      id: assessment.id,
      patientId: assessment.patientId,
      type: assessment.type,
      createdAt: assessment.createdAt,
      metrics: {},
      issues: [],
      recommendations: [],
      rawData: assessment.data,
    };

    if (assessment.data.posture) {
      this.standardizePostureData(assessment.data.posture, standardized);
    }

    if (assessment.data.rom) {
      this.standardizeRomData(assessment.data.rom, standardized);
    }

    if (assessment.data.medvoice) {
      this.standardizeMedVoiceData(assessment.data.medvoice, standardized);
    }

    return standardized;
  }

  static standardizeRecord(record: AssessmentRecord): StandardizedRecord {
    return {
      id: record.id,
      patientId: record.patientId,
      type: record.assessmentType,
      timestamp: record.timestamp,
      metrics: record.metrics as Record<string, number>,
      angles: record.angles,
      landmarks: Array.isArray(record.landmarks) && record.landmarks.length > 0 && typeof record.landmarks[0] === 'object'
        ? record.landmarks as Array<{x: number; y: number}>
        : this.convertLandmarksArray(record.landmarks),
      imageData: record.imageData,
      feedback: record.feedback || '',
      improvement: record.improvement || 0,
    };
  }

  static calculateMetrics(assessments: Assessment[]): Record<string, number> {
    const metrics: Record<string, number> = {};
    const postureAssessments = assessments.filter(a => a.data.posture);
    const romAssessments = assessments.filter(a => a.data.rom);

    if (postureAssessments.length > 0) {
      const postureMetrics = this.calculatePostureMetrics(postureAssessments);
      Object.assign(metrics, postureMetrics);
    }

    if (romAssessments.length > 0) {
      const romMetrics = this.calculateRomMetrics(romAssessments);
      Object.assign(metrics, romMetrics);
    }

    metrics.assessmentCount = assessments.length;
    metrics.averageConfidence = assessments.reduce((sum, a) => {
      return sum + (a.data.posture?.confidence || 0);
    }, 0) / assessments.length;

    return metrics;
  }

  static generateInsights(assessments: Assessment[]): string[] {
    const insights: string[] = [];
    const metrics = this.calculateMetrics(assessments);

    if (metrics.assessmentCount > 1) {
      insights.push(`共进行了 ${metrics.assessmentCount} 次评估，平均置信度为 ${metrics.averageConfidence?.toFixed(2) || 0}`);
    }

    if (metrics.postureScore) {
      if (metrics.postureScore > 80) {
        insights.push('姿势评估结果良好，整体姿态保持稳定');
      } else if (metrics.postureScore > 60) {
        insights.push('姿势评估结果一般，存在轻度姿态问题');
      } else {
        insights.push('姿势评估结果较差，存在明显姿态问题');
      }
    }

    if (metrics.romScore) {
      if (metrics.romScore > 80) {
        insights.push('关节活动度评估结果良好，关节活动范围正常');
      } else if (metrics.romScore > 60) {
        insights.push('关节活动度评估结果一般，存在轻度活动受限');
      } else {
        insights.push('关节活动度评估结果较差，存在明显活动受限');
      }
    }

    return insights;
  }

  private static standardizePostureData(data: PostureAssessmentData, standardized: StandardizedAssessment) {
    if (data.metrics) {
      Object.entries(data.metrics).forEach(([key, value]) => {
        if (typeof value === 'number') {
          standardized.metrics[`posture_${key}`] = value;
        }
      });
    }

    if (data.issues) {
      data.issues.forEach(issue => {
        standardized.issues.push({
          type: issue.type,
          severity: this.mapSeverity(issue.severity),
          description: issue.description,
        });
      });
    }

    if (data.confidence) {
      standardized.metrics.posture_confidence = data.confidence;
    }
  }

  private static standardizeRomData(data: RomAssessmentData, standardized: StandardizedAssessment) {
    data.items.forEach((item, index) => {
      standardized.metrics[`rom_${item.joint}_${item.direction}`] = item.angle;
    });

    if (data.recommendations) {
      standardized.recommendations.push(...data.recommendations);
    }
  }

  private static standardizeMedVoiceData(data: MedVoiceAssessmentData, standardized: StandardizedAssessment) {
    standardized.metrics.medvoice_session_length = data.transcript.length;
    standardized.rawData.medvoice = data;
  }

  private static convertLandmarksArray(landmarks: any): Array<{x: number; y: number}> {
    if (Array.isArray(landmarks) && landmarks.length % 2 === 0) {
      const result: Array<{x: number; y: number}> = [];
      for (let i = 0; i < landmarks.length; i += 2) {
        result.push({ x: landmarks[i], y: landmarks[i + 1] });
      }
      return result;
    }
    return [];
  }

  private static mapSeverity(severity: string): 'mild' | 'moderate' | 'severe' {
    const severityMap: Record<string, 'mild' | 'moderate' | 'severe'> = {
      mild: 'mild',
      moderate: 'moderate',
      severe: 'severe',
      low: 'mild',
      medium: 'moderate',
      high: 'severe',
    };
    return severityMap[severity.toLowerCase()] || 'moderate';
  }

  private static calculatePostureMetrics(assessments: Assessment[]): Record<string, number> {
    const metrics: Record<string, number> = {};
    const postureData = assessments.map(a => a.data.posture).filter(Boolean) as PostureAssessmentData[];

    if (postureData.length > 0) {
      const confidenceSum = postureData.reduce((sum, data) => sum + (data.confidence || 0), 0);
      metrics.postureConfidence = confidenceSum / postureData.length;

      const issueCounts = postureData.reduce((count, data) => {
        return count + (data.issues?.length || 0);
      }, 0);
      metrics.postureIssueCount = issueCounts / postureData.length;

      metrics.postureScore = this.calculatePostureScore(postureData);
    }

    return metrics;
  }

  private static calculateRomMetrics(assessments: Assessment[]): Record<string, number> {
    const metrics: Record<string, number> = {};
    const romData = assessments.map(a => a.data.rom).filter(Boolean) as RomAssessmentData[];

    if (romData.length > 0) {
      let totalValue = 0;
      let count = 0;

      romData.forEach(data => {
        data.items.forEach(item => {
          totalValue += item.angle;
          count++;
        });
      });

      metrics.romAverage = count > 0 ? totalValue / count : 0;
      metrics.romScore = this.calculateRomScore(romData);
    }

    return metrics;
  }

  private static calculatePostureScore(postureData: PostureAssessmentData[]): number {
    let totalScore = 0;
    postureData.forEach(data => {
      if (data.metrics) {
        const score = this.calculateSinglePostureScore(data.metrics);
        totalScore += score;
      }
    });
    return postureData.length > 0 ? totalScore / postureData.length : 0;
  }

  private static calculateSinglePostureScore(metrics: PostureMetrics): number {
    let score = 100;
    
    if (metrics.headDeviation) score -= Math.abs(metrics.headDeviation) * 2;
    if (metrics.shoulderAngle) score -= Math.abs(metrics.shoulderAngle) * 1.5;
    if (metrics.hipAngle) score -= Math.abs(metrics.hipAngle) * 1.5;
    
    return Math.max(0, Math.min(100, score));
  }

  private static calculateRomScore(romData: RomAssessmentData[]): number {
    let totalScore = 0;
    romData.forEach(data => {
      data.items.forEach(item => {
        const score = this.calculateSingleRomScore(item.angle, item.joint, item.direction);
        totalScore += score;
      });
    });
    const totalItems = romData.reduce((sum, data) => sum + data.items.length, 0);
    return totalItems > 0 ? totalScore / totalItems : 0;
  }

  private static calculateSingleRomScore(value: number, joint: string, movement: string): number {
    const normalRanges: Record<string, Record<string, [number, number]>> = {
      shoulder: {
        flexion: [0, 180],
        extension: [0, 60],
        abduction: [0, 180],
        adduction: [0, 45],
        internal_rotation: [0, 90],
        external_rotation: [0, 90],
      },
      elbow: {
        flexion: [0, 145],
        extension: [0, 0],
      },
      wrist: {
        flexion: [0, 90],
        extension: [0, 70],
      },
      hip: {
        flexion: [0, 120],
        extension: [0, 30],
        abduction: [0, 45],
        adduction: [0, 30],
        internal_rotation: [0, 45],
        external_rotation: [0, 45],
      },
      knee: {
        flexion: [0, 140],
        extension: [0, 0],
      },
      ankle: {
        dorsiflexion: [0, 20],
        plantarflexion: [0, 45],
      },
    };

    const range = normalRanges[joint]?.[movement];
    if (!range) return 50;

    const [min, max] = range;
    const normalRange = max - min;
    const deviation = Math.abs(value - max);
    const score = 100 - (deviation / normalRange) * 100;
    
    return Math.max(0, Math.min(100, score));
  }
}
