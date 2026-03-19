import type { AssessmentRecord } from '../types/assessment';
import { APP_CONFIG } from '../config/appConfig';

const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.ASSESSMENT_RECORDS;
const STORAGE_VERSION = '1.0';
const MAX_IMAGE_SIZE = APP_CONFIG.STORAGE_LIMITS.MAX_IMAGE_SIZE;
const STORAGE_WARNING_THRESHOLD = APP_CONFIG.STORAGE_LIMITS.WARNING_THRESHOLD;
const STORAGE_CRITICAL_THRESHOLD = APP_CONFIG.STORAGE_LIMITS.CRITICAL_THRESHOLD;
const MAX_RECORDS_COUNT = APP_CONFIG.STORAGE_LIMITS.MAX_RECORDS_COUNT;

interface ScreeningRecordArchiveData {
  version: string;
  records: AssessmentRecord[];
  lastUpdated: string;
}

export class ScreeningRecordStorage {
  static saveRecord(record: AssessmentRecord): boolean {
    try {
      const records = this.loadRecords(record.patientId);
      const existingIndex = records.findIndex((item) => item.id === record.id);

      if (existingIndex >= 0) {
        records[existingIndex] = record;
      } else {
        if (records.length >= MAX_RECORDS_COUNT) {
          console.warn(`筛查记录数量已达上限 (${MAX_RECORDS_COUNT})，建议先清理旧记录。`);
          return false;
        }
        records.push(record);
      }

      const archive: ScreeningRecordArchiveData = {
        version: STORAGE_VERSION,
        records,
        lastUpdated: new Date().toISOString(),
      };

      const dataStr = JSON.stringify(archive);
      const dataSize = new Blob([dataStr]).size;

      if (dataSize > STORAGE_CRITICAL_THRESHOLD) {
        console.error(`本地筛查记录存储已超上限 (${(dataSize / 1024 / 1024).toFixed(2)}MB)。`);
        return false;
      }

      if (dataSize > STORAGE_WARNING_THRESHOLD) {
        console.warn(`本地筛查记录存储接近上限 (${(dataSize / 1024 / 1024).toFixed(2)}MB)。`);
      }

      localStorage.setItem(`${STORAGE_KEY}_${record.patientId}`, dataStr);
      return true;
    } catch (error) {
      console.error('保存筛查记录失败:', error);
      return false;
    }
  }

  static loadRecords(patientId: string): AssessmentRecord[] {
    try {
      const dataStr = localStorage.getItem(`${STORAGE_KEY}_${patientId}`);
      if (!dataStr) {
        return [];
      }

      const archive: ScreeningRecordArchiveData = JSON.parse(dataStr);
      if (archive.version !== STORAGE_VERSION) {
        console.warn('筛查记录版本不匹配，已清空旧记录。');
        this.clearRecords(patientId);
        return [];
      }

      return archive.records || [];
    } catch (error) {
      console.error('加载筛查记录失败:', error);
      return [];
    }
  }

  static getRecord(id: string, patientId: string): AssessmentRecord | null {
    const records = this.loadRecords(patientId);
    return records.find((item) => item.id === id) ?? null;
  }

  static deleteRecord(id: string, patientId: string): boolean {
    try {
      const filteredRecords = this.loadRecords(patientId).filter((item) => item.id !== id);
      const archive: ScreeningRecordArchiveData = {
        version: STORAGE_VERSION,
        records: filteredRecords,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(`${STORAGE_KEY}_${patientId}`, JSON.stringify(archive));
      return true;
    } catch (error) {
      console.error('删除筛查记录失败:', error);
      return false;
    }
  }

  static clearRecords(patientId: string): boolean {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${patientId}`);
      return true;
    } catch (error) {
      console.error('清空筛查记录失败:', error);
      return false;
    }
  }

  static exportArchive(patientId: string): string {
    return JSON.stringify(
      {
        version: STORAGE_VERSION,
        patientId,
        exportDate: new Date().toISOString(),
        records: this.loadRecords(patientId),
      },
      null,
      2,
    );
  }

  static importArchive(jsonStr: string, patientId: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('无效的筛查记录导入数据。');
      }

      const records: AssessmentRecord[] = data.records.map((record: Record<string, unknown>) => ({
        id: String(record.id),
        timestamp: String(record.timestamp),
        patientId,
        assessmentType: record.assessmentType as AssessmentRecord['assessmentType'],
        imageData: record.imageData as AssessmentRecord['imageData'],
        landmarks: Array.isArray(record.landmarks) ? (record.landmarks as AssessmentRecord['landmarks']) : [],
        angles: (record.angles as AssessmentRecord['angles']) || {},
        metrics: (record.metrics as AssessmentRecord['metrics']) || {},
        treatmentPlanId: record.treatmentPlanId as string | undefined,
        feedback: record.feedback as string | undefined,
        improvement: record.improvement as number | undefined,
      }));

      const archive: ScreeningRecordArchiveData = {
        version: STORAGE_VERSION,
        records,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(`${STORAGE_KEY}_${patientId}`, JSON.stringify(archive));
      return true;
    } catch (error) {
      console.error('导入筛查记录失败:', error);
      return false;
    }
  }

  static getStorageInfo(patientId: string): {
    used: number;
    count: number;
    available: boolean;
    warningLevel: 'normal' | 'warning' | 'critical';
    usedPercentage: number;
  } {
    try {
      const dataStr = localStorage.getItem(`${STORAGE_KEY}_${patientId}`);
      if (!dataStr) {
        return {
          used: 0,
          count: 0,
          available: true,
          warningLevel: 'normal',
          usedPercentage: 0,
        };
      }

      const archive: ScreeningRecordArchiveData = JSON.parse(dataStr);
      const used = new Blob([dataStr]).size;
      let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';

      if (used > STORAGE_CRITICAL_THRESHOLD) {
        warningLevel = 'critical';
      } else if (used > STORAGE_WARNING_THRESHOLD) {
        warningLevel = 'warning';
      }

      return {
        used,
        count: archive.records.length,
        available: warningLevel !== 'critical',
        warningLevel,
        usedPercentage: Math.min(100, (used / STORAGE_CRITICAL_THRESHOLD) * 100),
      };
    } catch {
      return {
        used: 0,
        count: 0,
        available: false,
        warningLevel: 'normal',
        usedPercentage: 0,
      };
    }
  }

  static validateImageSize(base64: string): boolean {
    return new Blob([base64]).size <= MAX_IMAGE_SIZE;
  }

  static cleanupOldRecords(patientId: string, keepDays = 30): number {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);

      const records = this.loadRecords(patientId);
      const filteredRecords = records.filter((record) => new Date(record.timestamp) >= cutoffDate);
      const archive: ScreeningRecordArchiveData = {
        version: STORAGE_VERSION,
        records: filteredRecords,
        lastUpdated: new Date().toISOString(),
      };

      localStorage.setItem(`${STORAGE_KEY}_${patientId}`, JSON.stringify(archive));
      return records.length - filteredRecords.length;
    } catch (error) {
      console.error('清理旧筛查记录失败:', error);
      return 0;
    }
  }

  static exportData(patientId: string): string {
    return this.exportArchive(patientId);
  }

  static importData(jsonStr: string, patientId: string): boolean {
    return this.importArchive(jsonStr, patientId);
  }
}

export { ScreeningRecordStorage as AssessmentRecordStorage };
