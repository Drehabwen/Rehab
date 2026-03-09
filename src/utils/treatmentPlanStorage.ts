import { TreatmentPlanVersion } from '../types/assessment';
import { APP_CONFIG } from '../config/appConfig';

const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.TREATMENT_PLANS;
const STORAGE_VERSION = '1.0';

interface StorageData {
  version: string;
  versions: TreatmentPlanVersion[];
  lastUpdated: string;
}

export class TreatmentPlanStorage {
  static saveVersions(versions: TreatmentPlanVersion[]): boolean {
    try {
      const data: StorageData = {
        version: STORAGE_VERSION,
        versions,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('保存版本数据失败:', error);
      return false;
    }
  }

  static loadVersions(): TreatmentPlanVersion[] {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) return [];

      const data: StorageData = JSON.parse(dataStr);
      
      if (data.version !== STORAGE_VERSION) {
        console.warn('版本数据格式不匹配，将清空数据');
        this.clearVersions();
        return [];
      }

      return data.versions || [];
    } catch (error) {
      console.error('加载版本数据失败:', error);
      return [];
    }
  }

  static clearVersions(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('清空版本数据失败:', error);
      return false;
    }
  }

  static exportData(): string {
    const versions = this.loadVersions();
    const exportData = {
      version: STORAGE_VERSION,
      exportDate: new Date().toISOString(),
      versions,
    };
    return JSON.stringify(exportData, null, 2);
  }

  static importData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      
      if (!data.versions || !Array.isArray(data.versions)) {
        throw new Error('无效的数据格式');
      }

      const versions: TreatmentPlanVersion[] = data.versions.map((v: any) => ({
        id: v.id,
        version: v.version,
        content: v.content,
        assessmentId: v.assessmentId,
        sessionId: v.sessionId,
        sessionReportId: v.sessionReportId,
        sourceType: v.sourceType || (v.sessionReportId ? 'session-report' : 'assessment'),
        patientId: v.patientId,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        createdBy: v.createdBy || 'imported',
        tags: v.tags || [],
        notes: v.notes || '',
        isCurrent: v.isCurrent || false,
      }));

      return this.saveVersions(versions);
    } catch (error) {
      console.error('导入版本数据失败:', error);
      return false;
    }
  }

  static getStorageInfo(): { used: number; available: boolean } {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      const used = data ? new Blob([data]).size : 0;
      return { used, available: true };
    } catch (error) {
      return { used: 0, available: false };
    }
  }
}
