import type { TreatmentPlanVersion } from '../types/assessment';
import { APP_CONFIG } from '../config/appConfig';

const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.TREATMENT_PLANS;
const STORAGE_VERSION = '1.0';

interface InterventionPlanArchiveData {
  version: string;
  versions: TreatmentPlanVersion[];
  lastUpdated: string;
}

export class InterventionPlanStorage {
  static saveVersions(versions: TreatmentPlanVersion[]): boolean {
    try {
      const archive: InterventionPlanArchiveData = {
        version: STORAGE_VERSION,
        versions,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
      return true;
    } catch (error) {
      console.error('保存干预建议版本失败:', error);
      return false;
    }
  }

  static loadVersions(): TreatmentPlanVersion[] {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      if (!dataStr) {
        return [];
      }

      const archive: InterventionPlanArchiveData = JSON.parse(dataStr);
      if (archive.version !== STORAGE_VERSION) {
        console.warn('干预建议版本不匹配，已清空旧数据。');
        this.clearVersions();
        return [];
      }

      return archive.versions || [];
    } catch (error) {
      console.error('加载干预建议版本失败:', error);
      return [];
    }
  }

  static clearVersions(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('清空干预建议版本失败:', error);
      return false;
    }
  }

  static exportArchive(): string {
    return JSON.stringify(
      {
        version: STORAGE_VERSION,
        exportDate: new Date().toISOString(),
        versions: this.loadVersions(),
      },
      null,
      2,
    );
  }

  static importArchive(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.versions || !Array.isArray(data.versions)) {
        throw new Error('无效的干预建议导入数据。');
      }

      const versions: TreatmentPlanVersion[] = data.versions.map((version: Record<string, unknown>) => ({
        id: String(version.id),
        version: Number(version.version),
        content: String(version.content ?? ''),
        assessmentId: version.assessmentId as string | undefined,
        sessionId: version.sessionId as string | undefined,
        sessionReportId: version.sessionReportId as string | undefined,
        sourceType: (version.sourceType as TreatmentPlanVersion['sourceType']) || (version.sessionReportId ? 'session-report' : 'assessment'),
        patientId: String(version.patientId),
        createdAt: String(version.createdAt),
        updatedAt: String(version.updatedAt),
        createdBy: String(version.createdBy ?? 'imported'),
        tags: Array.isArray(version.tags) ? (version.tags as string[]) : [],
        notes: String(version.notes ?? ''),
        isCurrent: Boolean(version.isCurrent),
      }));

      return this.saveVersions(versions);
    } catch (error) {
      console.error('导入干预建议版本失败:', error);
      return false;
    }
  }

  static getStorageInfo(): { used: number; available: boolean } {
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      return {
        used: dataStr ? new Blob([dataStr]).size : 0,
        available: true,
      };
    } catch {
      return {
        used: 0,
        available: false,
      };
    }
  }

  static exportData(): string {
    return this.exportArchive();
  }

  static importData(jsonStr: string): boolean {
    return this.importArchive(jsonStr);
  }
}

export { InterventionPlanStorage as TreatmentPlanStorage };
