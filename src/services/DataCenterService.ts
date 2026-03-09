import { Assessment, AssessmentRecord, TreatmentPlanVersion } from '../types/assessment';
import { AssessmentRecordStorage } from '../utils/assessmentRecordStorage';
import { APP_CONFIG } from '../config/appConfig';

interface DataCenterStorage {
  assessments: Assessment[];
  treatmentPlans: TreatmentPlanVersion[];
  records: AssessmentRecord[];
  lastUpdated: string;
  version: string;
}

interface DataStatistics {
  totalAssessments: number;
  totalRecords: number;
  totalTreatmentPlans: number;
  storageUsed: number;
  storageAvailable: boolean;
  recentAssessments: Assessment[];
}

export class DataCenterService {
  private static STORAGE_KEY = 'rehab_data_center';
  private static VERSION = '1.0';

  static saveAssessment(assessment: Assessment): boolean {
    try {
      const data = this.loadData();
      const existingIndex = data.assessments.findIndex(a => a.id === assessment.id);
      
      if (existingIndex >= 0) {
        data.assessments[existingIndex] = assessment;
      } else {
        data.assessments.push(assessment);
      }
      
      data.lastUpdated = new Date().toISOString();
      return this.saveData(data);
    } catch (error) {
      console.error('保存评估数据失败:', error);
      return false;
    }
  }

  static saveTreatmentPlan(plan: TreatmentPlanVersion): boolean {
    try {
      const data = this.loadData();
      const existingIndex = data.treatmentPlans.findIndex(p => p.id === plan.id);
      
      if (existingIndex >= 0) {
        data.treatmentPlans[existingIndex] = plan;
      } else {
        data.treatmentPlans.push(plan);
      }
      
      data.lastUpdated = new Date().toISOString();
      return this.saveData(data);
    } catch (error) {
      console.error('保存治疗计划失败:', error);
      return false;
    }
  }

  static saveRecord(record: AssessmentRecord): boolean {
    try {
      const data = this.loadData();
      const existingIndex = data.records.findIndex(r => r.id === record.id);
      
      if (existingIndex >= 0) {
        data.records[existingIndex] = record;
      } else {
        data.records.push(record);
      }
      
      data.lastUpdated = new Date().toISOString();
      return this.saveData(data);
    } catch (error) {
      console.error('保存评估记录失败:', error);
      return false;
    }
  }

  static loadAssessments(patientId?: string): Assessment[] {
    const data = this.loadData();
    if (patientId) {
      return data.assessments.filter(a => a.patientId === patientId);
    }
    return data.assessments;
  }

  static loadTreatmentPlans(patientId?: string): TreatmentPlanVersion[] {
    const data = this.loadData();
    if (patientId) {
      return data.treatmentPlans.filter(p => p.patientId === patientId);
    }
    return data.treatmentPlans;
  }

  static loadRecords(patientId?: string): AssessmentRecord[] {
    const data = this.loadData();
    if (patientId) {
      return data.records.filter(r => r.patientId === patientId);
    }
    return data.records;
  }

  static getAssessment(id: string): Assessment | null {
    const data = this.loadData();
    return data.assessments.find(a => a.id === id) || null;
  }

  static getTreatmentPlan(id: string): TreatmentPlanVersion | null {
    const data = this.loadData();
    return data.treatmentPlans.find(p => p.id === id) || null;
  }

  static getRecord(id: string): AssessmentRecord | null {
    const data = this.loadData();
    return data.records.find(r => r.id === id) || null;
  }

  static deleteAssessment(id: string): boolean {
    try {
      const data = this.loadData();
      data.assessments = data.assessments.filter(a => a.id !== id);
      data.lastUpdated = new Date().toISOString();
      return this.saveData(data);
    } catch (error) {
      console.error('删除评估数据失败:', error);
      return false;
    }
  }

  static deleteTreatmentPlan(id: string): boolean {
    try {
      const data = this.loadData();
      data.treatmentPlans = data.treatmentPlans.filter(p => p.id !== id);
      data.lastUpdated = new Date().toISOString();
      return this.saveData(data);
    } catch (error) {
      console.error('删除治疗计划失败:', error);
      return false;
    }
  }

  static deleteRecord(id: string): boolean {
    try {
      const data = this.loadData();
      data.records = data.records.filter(r => r.id !== id);
      data.lastUpdated = new Date().toISOString();
      return this.saveData(data);
    } catch (error) {
      console.error('删除评估记录失败:', error);
      return false;
    }
  }

  static getStatistics(patientId?: string): DataStatistics {
    const data = this.loadData();
    let assessments = data.assessments;
    let records = data.records;
    let treatmentPlans = data.treatmentPlans;

    if (patientId) {
      assessments = assessments.filter(a => a.patientId === patientId);
      records = records.filter(r => r.patientId === patientId);
      treatmentPlans = treatmentPlans.filter(p => p.patientId === patientId);
    }

    const storageUsed = this.getStorageUsed();
    const storageAvailable = storageUsed < APP_CONFIG.STORAGE_LIMITS.CRITICAL_THRESHOLD;

    const recentAssessments = [...assessments]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5);

    return {
      totalAssessments: assessments.length,
      totalRecords: records.length,
      totalTreatmentPlans: treatmentPlans.length,
      storageUsed,
      storageAvailable,
      recentAssessments,
    };
  }

  static exportData(patientId?: string): string {
    const data = this.loadData();
    let exportData = { ...data };

    if (patientId) {
      exportData = {
        ...data,
        assessments: data.assessments.filter(a => a.patientId === patientId),
        records: data.records.filter(r => r.patientId === patientId),
        treatmentPlans: data.treatmentPlans.filter(p => p.patientId === patientId),
      };
    }

    return JSON.stringify({
      ...exportData,
      exportDate: new Date().toISOString(),
    }, null, 2);
  }

  static importData(jsonStr: string): boolean {
    try {
      const importedData = JSON.parse(jsonStr);
      const currentData = this.loadData();

      if (importedData.assessments) {
        currentData.assessments = [
          ...currentData.assessments,
          ...importedData.assessments,
        ];
      }

      if (importedData.records) {
        currentData.records = [
          ...currentData.records,
          ...importedData.records,
        ];
      }

      if (importedData.treatmentPlans) {
        currentData.treatmentPlans = [
          ...currentData.treatmentPlans,
          ...importedData.treatmentPlans,
        ];
      }

      currentData.lastUpdated = new Date().toISOString();
      return this.saveData(currentData);
    } catch (error) {
      console.error('导入数据失败:', error);
      return false;
    }
  }

  static clearData(patientId?: string): boolean {
    try {
      if (patientId) {
        const data = this.loadData();
        data.assessments = data.assessments.filter(a => a.patientId !== patientId);
        data.records = data.records.filter(r => r.patientId !== patientId);
        data.treatmentPlans = data.treatmentPlans.filter(p => p.patientId !== patientId);
        data.lastUpdated = new Date().toISOString();
        return this.saveData(data);
      } else {
        localStorage.removeItem(this.STORAGE_KEY);
        return true;
      }
    } catch (error) {
      console.error('清空数据失败:', error);
      return false;
    }
  }

  private static loadData(): DataCenterStorage {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      if (!dataStr) {
        return this.getDefaultData();
      }

      const data = JSON.parse(dataStr);
      if (data.version !== this.VERSION) {
        console.warn('数据中心版本不匹配，使用默认数据');
        return this.getDefaultData();
      }

      return {
        assessments: data.assessments || [],
        treatmentPlans: data.treatmentPlans || [],
        records: data.records || [],
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        version: data.version || this.VERSION,
      };
    } catch (error) {
      console.error('加载数据中心失败:', error);
      return this.getDefaultData();
    }
  }

  private static saveData(data: DataCenterStorage): boolean {
    try {
      const dataStr = JSON.stringify(data);
      const dataSize = new Blob([dataStr]).size;

      if (dataSize > APP_CONFIG.STORAGE_LIMITS.CRITICAL_THRESHOLD) {
        console.error('数据中心存储容量已达临界值');
        return false;
      }

      localStorage.setItem(this.STORAGE_KEY, dataStr);
      return true;
    } catch (error) {
      console.error('保存数据中心失败:', error);
      return false;
    }
  }

  private static getDefaultData(): DataCenterStorage {
    return {
      assessments: [],
      treatmentPlans: [],
      records: [],
      lastUpdated: new Date().toISOString(),
      version: this.VERSION,
    };
  }

  private static getStorageUsed(): number {
    try {
      const dataStr = localStorage.getItem(this.STORAGE_KEY);
      return dataStr ? new Blob([dataStr]).size : 0;
    } catch (error) {
      return 0;
    }
  }
}
