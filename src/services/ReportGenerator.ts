import { Assessment, AssessmentRecord, TreatmentPlanVersion } from '../types/assessment';
import { DataCenterService } from './DataCenterService';
import { DataStandardizationService } from './DataStandardizationService';
import { LLMReportService } from './LLMReportService';

export type ReportType = 'assessment' | 'treatment' | 'progress' | 'comprehensive';
export type ReportFormat = 'markdown' | 'html' | 'pdf';

interface ReportConfig {
  type: ReportType;
  format: ReportFormat;
  patientId: string;
  assessmentIds?: string[];
  treatmentPlanId?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  includeCharts?: boolean;
  includeRecommendations?: boolean;
  includeRawData?: boolean;
}

interface ReportData {
  id: string;
  patientId: string;
  type: ReportType;
  format: ReportFormat;
  title: string;
  content: string;
  createdAt: number;
  data: {
    assessments: Assessment[];
    treatmentPlans: TreatmentPlanVersion[];
    records: AssessmentRecord[];
    metrics: Record<string, number>;
    insights: string[];
  };
}

export class ReportGenerator {
  static async generateReport(config: ReportConfig): Promise<ReportData> {
    try {
      const data = await this.collectData(config);
      const standardizedData = this.processData(data);
      const reportContent = await this.generateContent(standardizedData, config);
      
      return {
        id: `report_${Date.now()}`,
        patientId: config.patientId,
        type: config.type,
        format: config.format,
        title: this.generateTitle(config, data),
        content: reportContent,
        createdAt: Date.now(),
        data: standardizedData,
      };
    } catch (error) {
      console.error('生成报告失败:', error);
      throw error;
    }
  }

  private static async collectData(config: ReportConfig): Promise<{
    assessments: Assessment[];
    treatmentPlans: TreatmentPlanVersion[];
    records: AssessmentRecord[];
  }> {
    let assessments: Assessment[] = [];
    let treatmentPlans: TreatmentPlanVersion[] = [];
    let records: AssessmentRecord[] = [];

    if (config.assessmentIds) {
      assessments = config.assessmentIds.map(id => {
        const assessment = DataCenterService.getAssessment(id);
        if (!assessment) {
          throw new Error(`评估ID ${id} 不存在`);
        }
        return assessment;
      });
    } else {
      assessments = DataCenterService.loadAssessments(config.patientId);
      
      if (config.timeRange) {
        assessments = assessments.filter(a => 
          a.createdAt >= config.timeRange.start && 
          a.createdAt <= config.timeRange.end
        );
      }
    }

    treatmentPlans = DataCenterService.loadTreatmentPlans(config.patientId);
    if (config.treatmentPlanId) {
      treatmentPlans = treatmentPlans.filter(p => p.id === config.treatmentPlanId);
    }

    records = DataCenterService.loadRecords(config.patientId);
    if (config.timeRange) {
      records = records.filter(r => {
        const timestamp = new Date(r.timestamp).getTime();
        return timestamp >= config.timeRange.start && timestamp <= config.timeRange.end;
      });
    }

    return { assessments, treatmentPlans, records };
  }

  private static processData(data: {
    assessments: Assessment[];
    treatmentPlans: TreatmentPlanVersion[];
    records: AssessmentRecord[];
  }): {
    assessments: Assessment[];
    treatmentPlans: TreatmentPlanVersion[];
    records: AssessmentRecord[];
    metrics: Record<string, number>;
    insights: string[];
  } {
    const metrics = DataStandardizationService.calculateMetrics(data.assessments);
    const insights = DataStandardizationService.generateInsights(data.assessments);

    return {
      ...data,
      metrics,
      insights,
    };
  }

  private static async generateContent(
    data: {
      assessments: Assessment[];
      treatmentPlans: TreatmentPlanVersion[];
      records: AssessmentRecord[];
      metrics: Record<string, number>;
      insights: string[];
    },
    config: ReportConfig
  ): Promise<string> {
    switch (config.type) {
      case 'assessment':
        return await this.generateAssessmentReport(data, config);
      case 'treatment':
        return await this.generateTreatmentReport(data, config);
      case 'progress':
        return await this.generateProgressReport(data, config);
      case 'comprehensive':
        return await this.generateComprehensiveReport(data, config);
      default:
        throw new Error(`不支持的报告类型: ${config.type}`);
    }
  }

  private static async generateAssessmentReport(
    data: any,
    config: ReportConfig
  ): Promise<string> {
    const llmService = new LLMReportService();
    const standardizedAssessments = data.assessments.map(a => 
      DataStandardizationService.standardizeAssessment(a)
    );

    const prompt = `
    作为康复评估专家，请根据以下评估数据生成一份专业的评估报告：

    评估数据：
    ${JSON.stringify(standardizedAssessments, null, 2)}

    评估指标：
    ${JSON.stringify(data.metrics, null, 2)}

    生成要求：
    1. 报告应包括：评估概述、详细发现、问题分析、建议
    2. 使用专业但易于理解的语言
    3. 重点突出异常指标和需要关注的问题
    4. 提供具体的康复建议
    5. 报告格式为${config.format === 'markdown' ? 'Markdown' : 'HTML'}
    `;

    return await llmService.generateReport(prompt, config.format);
  }

  private static async generateTreatmentReport(
    data: any,
    config: ReportConfig
  ): Promise<string> {
    const llmService = new LLMReportService();

    const prompt = `
    作为康复治疗专家，请根据以下治疗计划数据生成一份专业的治疗报告：

    治疗计划：
    ${JSON.stringify(data.treatmentPlans, null, 2)}

    相关评估：
    ${JSON.stringify(data.assessments, null, 2)}

    生成要求：
    1. 报告应包括：治疗计划概述、治疗目标、具体方案、预期效果
    2. 使用专业但易于理解的语言
    3. 详细说明每个治疗步骤的目的和方法
    4. 提供治疗进度跟踪建议
    5. 报告格式为${config.format === 'markdown' ? 'Markdown' : 'HTML'}
    `;

    return await llmService.generateReport(prompt, config.format);
  }

  private static async generateProgressReport(
    data: any,
    config: ReportConfig
  ): Promise<string> {
    const llmService = new LLMReportService();

    const prompt = `
    作为康复评估专家，请根据以下评估数据生成一份进度报告：

    评估数据：
    ${JSON.stringify(data.assessments, null, 2)}

    评估记录：
    ${JSON.stringify(data.records, null, 2)}

    评估指标：
    ${JSON.stringify(data.metrics, null, 2)}

    生成要求：
    1. 报告应包括：进度概述、改善情况、存在问题、后续建议
    2. 使用专业但易于理解的语言
    3. 分析评估数据的变化趋势
    4. 评估当前康复效果
    5. 报告格式为${config.format === 'markdown' ? 'Markdown' : 'HTML'}
    `;

    return await llmService.generateReport(prompt, config.format);
  }

  private static async generateComprehensiveReport(
    data: any,
    config: ReportConfig
  ): Promise<string> {
    const llmService = new LLMReportService();

    const prompt = `
    作为康复医学专家，请根据以下综合数据生成一份全面的康复报告：

    评估数据：
    ${JSON.stringify(data.assessments, null, 2)}

    治疗计划：
    ${JSON.stringify(data.treatmentPlans, null, 2)}

    评估记录：
    ${JSON.stringify(data.records, null, 2)}

    评估指标：
    ${JSON.stringify(data.metrics, null, 2)}

    生成要求：
    1. 报告应包括：患者概况、评估结果、治疗方案、康复进度、未来建议
    2. 使用专业但易于理解的语言
    3. 综合分析所有数据，提供整体康复状况评估
    4. 针对不同方面提供具体建议
    5. 报告格式为${config.format === 'markdown' ? 'Markdown' : 'HTML'}
    `;

    return await llmService.generateReport(prompt, config.format);
  }

  private static generateTitle(config: ReportConfig, data: any): string {
    const date = new Date().toISOString().split('T')[0];
    
    switch (config.type) {
      case 'assessment':
        return `评估报告 - ${date}`;
      case 'treatment':
        return `治疗计划报告 - ${date}`;
      case 'progress':
        return `康复进度报告 - ${date}`;
      case 'comprehensive':
        return `综合康复报告 - ${date}`;
      default:
        return `康复报告 - ${date}`;
    }
  }

  static saveReport(report: ReportData): boolean {
    try {
      const reports = this.loadReports();
      reports.push(report);
      localStorage.setItem('rehab_reports', JSON.stringify(reports));
      return true;
    } catch (error) {
      console.error('保存报告失败:', error);
      return false;
    }
  }

  static loadReports(patientId?: string): ReportData[] {
    try {
      const reportsStr = localStorage.getItem('rehab_reports');
      if (!reportsStr) return [];

      const reports = JSON.parse(reportsStr) as ReportData[];
      if (patientId) {
        return reports.filter(r => r.patientId === patientId);
      }
      return reports;
    } catch (error) {
      console.error('加载报告失败:', error);
      return [];
    }
  }

  static getReport(id: string): ReportData | null {
    const reports = this.loadReports();
    return reports.find(r => r.id === id) || null;
  }

  static deleteReport(id: string): boolean {
    try {
      const reports = this.loadReports();
      const filtered = reports.filter(r => r.id !== id);
      localStorage.setItem('rehab_reports', JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('删除报告失败:', error);
      return false;
    }
  }
}
