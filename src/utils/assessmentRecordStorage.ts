import { AssessmentRecord } from '../types/assessment';
import { APP_CONFIG } from '../config/appConfig';

const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.ASSESSMENT_RECORDS;
const STORAGE_VERSION = '1.0';
const MAX_IMAGE_SIZE = APP_CONFIG.STORAGE_LIMITS.MAX_IMAGE_SIZE;
const STORAGE_WARNING_THRESHOLD = APP_CONFIG.STORAGE_LIMITS.WARNING_THRESHOLD;
const STORAGE_CRITICAL_THRESHOLD = APP_CONFIG.STORAGE_LIMITS.CRITICAL_THRESHOLD;
const MAX_RECORDS_COUNT = APP_CONFIG.STORAGE_LIMITS.MAX_RECORDS_COUNT;

interface StorageData {
  version: string;
  records: AssessmentRecord[];
  lastUpdated: string;
}

export class AssessmentRecordStorage {
  static saveRecord(record: AssessmentRecord): boolean {
    try {
      const records = this.loadRecords(record.patientId);
      const existingIndex = records.findIndex(r => r.id === record.id);
      
      if (existingIndex >= 0) {
        records[existingIndex] = record;
      } else {
        if (records.length >= MAX_RECORDS_COUNT) {
          console.warn(`评估记录数量已达上限 (${MAX_RECORDS_COUNT})，建议清理旧记录`);
          return false;
        }
        records.push(record);
      }
      
      const data: StorageData = {
        version: STORAGE_VERSION,
        records,
        lastUpdated: new Date().toISOString(),
      };
      
      const dataStr = JSON.stringify(data);
      const dataSize = new Blob([dataStr]).size;
      
      if (dataSize > STORAGE_CRITICAL_THRESHOLD) {
        console.error(`存储容量已达临界值 (${(dataSize / 1024 / 1024).toFixed(2)}MB)，无法保存`);
        return false;
      }
      
      if (dataSize > STORAGE_WARNING_THRESHOLD) {
        console.warn(`存储容量接近上限 (${(dataSize / 1024 / 1024).toFixed(2)}MB)，建议清理旧记录`);
      }
      
      localStorage.setItem(`${STORAGE_KEY}_${record.patientId}`, dataStr);
      return true;
    } catch (error) {
      console.error('保存评估记录失败:', error);
      return false;
    }
  }

  static loadRecords(patientId: string): AssessmentRecord[] {
    try {
      const dataStr = localStorage.getItem(`${STORAGE_KEY}_${patientId}`);
      if (!dataStr) return [];

      const data: StorageData = JSON.parse(dataStr);
      
      if (data.version !== STORAGE_VERSION) {
        console.warn('评估记录数据格式不匹配，将清空数据');
        this.clearRecords(patientId);
        return [];
      }

      return data.records || [];
    } catch (error) {
      console.error('加载评估记录失败:', error);
      return [];
    }
  }

  static getRecord(id: string, patientId: string): AssessmentRecord | null {
    const records = this.loadRecords(patientId);
    return records.find(r => r.id === id) || null;
  }

  static deleteRecord(id: string, patientId: string): boolean {
    try {
      const records = this.loadRecords(patientId);
      const filtered = records.filter(r => r.id !== id);
      
      const data: StorageData = {
        version: STORAGE_VERSION,
        records: filtered,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(`${STORAGE_KEY}_${patientId}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('删除评估记录失败:', error);
      return false;
    }
  }

  static clearRecords(patientId: string): boolean {
    try {
      localStorage.removeItem(`${STORAGE_KEY}_${patientId}`);
      return true;
    } catch (error) {
      console.error('清空评估记录失败:', error);
      return false;
    }
  }

  static exportData(patientId: string): string {
    const records = this.loadRecords(patientId);
    const exportData = {
      version: STORAGE_VERSION,
      patientId,
      exportDate: new Date().toISOString(),
      records,
    };
    return JSON.stringify(exportData, null, 2);
  }

  static importData(jsonStr: string, patientId: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      
      if (!data.records || !Array.isArray(data.records)) {
        throw new Error('无效的数据格式');
      }

      const records: AssessmentRecord[] = data.records.map((r: any) => ({
        id: r.id,
        timestamp: r.timestamp,
        patientId,
        assessmentType: r.assessmentType,
        imageData: r.imageData,
        landmarks: r.landmarks || [],
        angles: r.angles || {},
        metrics: r.metrics || {},
        treatmentPlanId: r.treatmentPlanId,
        feedback: r.feedback,
        improvement: r.improvement,
      }));

      const storageData: StorageData = {
        version: STORAGE_VERSION,
        records,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(`${STORAGE_KEY}_${patientId}`, JSON.stringify(storageData));
      return true;
    } catch (error) {
      console.error('导入评估记录失败:', error);
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
      if (!dataStr) return { 
        used: 0, 
        count: 0, 
        available: true,
        warningLevel: 'normal',
        usedPercentage: 0
      };

      const data: StorageData = JSON.parse(dataStr);
      const used = dataStr ? new Blob([dataStr]).size : 0;
      
      let warningLevel: 'normal' | 'warning' | 'critical' = 'normal';
      if (used > STORAGE_CRITICAL_THRESHOLD) {
        warningLevel = 'critical';
      } else if (used > STORAGE_WARNING_THRESHOLD) {
        warningLevel = 'warning';
      }
      
      const usedPercentage = (used / STORAGE_CRITICAL_THRESHOLD) * 100;
      
      return { 
        used, 
        count: data.records.length, 
        available: warningLevel !== 'critical',
        warningLevel,
        usedPercentage: Math.min(100, usedPercentage)
      };
    } catch (error) {
      return { 
        used: 0, 
        count: 0, 
        available: false,
        warningLevel: 'normal',
        usedPercentage: 0
      };
    }
  }

  static validateImageSize(base64: string): boolean {
    const size = new Blob([base64]).size;
    return size <= MAX_IMAGE_SIZE;
  }

  static cleanupOldRecords(patientId: string, keepDays: number = 30): number {
    try {
      const records = this.loadRecords(patientId);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - keepDays);
      
      const filtered = records.filter(r => new Date(r.timestamp) >= cutoffDate);
      
      const data: StorageData = {
        version: STORAGE_VERSION,
        records: filtered,
        lastUpdated: new Date().toISOString(),
      };
      localStorage.setItem(`${STORAGE_KEY}_${patientId}`, JSON.stringify(data));
      
      return records.length - filtered.length;
    } catch (error) {
      console.error('清理旧记录失败:', error);
      return 0;
    }
  }
}
