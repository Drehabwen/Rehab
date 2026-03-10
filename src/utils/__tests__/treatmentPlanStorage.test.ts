import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TreatmentPlanStorage } from '../treatmentPlanStorage';
import { TreatmentPlanVersion } from '../../types/assessment';
import { APP_CONFIG } from '../../config/appConfig';

const STORAGE_KEY = APP_CONFIG.STORAGE_KEYS.TREATMENT_PLANS;

describe('TreatmentPlanStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveVersions', () => {
    it('应该成功保存版本数据', () => {
      const versions: TreatmentPlanVersion[] = [
        {
          id: 'version_1',
          version: 1,
          content: '测试内容',
          assessmentId: 'assessment_001',
          patientId: 'patient_001',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdBy: 'system',
          isCurrent: true,
        },
      ];

      const result = TreatmentPlanStorage.saveVersions(versions);

      expect(result).toBe(true);
      
      const savedData = localStorage.getItem(STORAGE_KEY);
      expect(savedData).not.toBeNull();
      
      const parsed = JSON.parse(savedData!);
      expect(parsed.version).toBe('1.0');
      expect(parsed.versions).toHaveLength(1);
      expect(parsed.versions[0].content).toBe('测试内容');
    });

    it('应该保存空数组', () => {
      const result = TreatmentPlanStorage.saveVersions([]);
      
      expect(result).toBe(true);
      
      const savedData = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(savedData!);
      expect(parsed.versions).toHaveLength(0);
    });
  });

  describe('loadVersions', () => {
    it('应该成功加载版本数据', () => {
      const versions: TreatmentPlanVersion[] = [
        {
          id: 'version_1',
          version: 1,
          content: '测试内容',
          assessmentId: 'assessment_001',
          patientId: 'patient_001',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdBy: 'system',
          isCurrent: true,
        },
      ];

      TreatmentPlanStorage.saveVersions(versions);
      const loaded = TreatmentPlanStorage.loadVersions();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].content).toBe('测试内容');
    });

    it('应该返回空数组当没有数据时', () => {
      const loaded = TreatmentPlanStorage.loadVersions();
      expect(loaded).toHaveLength(0);
    });

    it('应该清空数据当版本不匹配时', () => {
      const data = {
        version: '0.9',
        versions: [{ id: 'old' }],
        lastUpdated: '2024-01-01T00:00:00.000Z',
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      const loaded = TreatmentPlanStorage.loadVersions();
      expect(loaded).toHaveLength(0);
    });
  });

  describe('clearVersions', () => {
    it('应该清空所有版本数据', () => {
      const versions: TreatmentPlanVersion[] = [
        {
          id: 'version_1',
          version: 1,
          content: '测试内容',
          assessmentId: 'assessment_001',
          patientId: 'patient_001',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdBy: 'system',
          isCurrent: true,
        },
      ];

      TreatmentPlanStorage.saveVersions(versions);
      expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

      TreatmentPlanStorage.clearVersions();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });
  });

  describe('exportData', () => {
    it('应该导出JSON格式数据', () => {
      const versions: TreatmentPlanVersion[] = [
        {
          id: 'version_1',
          version: 1,
          content: '测试内容',
          assessmentId: 'assessment_001',
          patientId: 'patient_001',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdBy: 'system',
          isCurrent: true,
        },
      ];

      TreatmentPlanStorage.saveVersions(versions);
      const exported = TreatmentPlanStorage.exportData();

      const parsed = JSON.parse(exported);
      expect(parsed.version).toBe('1.0');
      expect(parsed.exportDate).toBeDefined();
      expect(parsed.versions).toHaveLength(1);
    });
  });

  describe('importData', () => {
    it('应该成功导入数据', () => {
      const importJson = JSON.stringify({
        version: '1.0',
        exportDate: '2024-01-01T00:00:00.000Z',
        versions: [
          {
            id: 'version_1',
            version: 1,
            content: '导入内容',
            assessmentId: 'assessment_001',
            patientId: 'patient_001',
            createdAt: '2024-01-01T00:00:00.000Z',
            updatedAt: '2024-01-01T00:00:00.000Z',
            createdBy: 'imported',
            isCurrent: true,
          },
        ],
      });

      const result = TreatmentPlanStorage.importData(importJson);
      expect(result).toBe(true);

      const loaded = TreatmentPlanStorage.loadVersions();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].content).toBe('导入内容');
    });

    it('应该拒绝无效格式', () => {
      const invalidJson = JSON.stringify({
        invalid: 'data',
      });

      const result = TreatmentPlanStorage.importData(invalidJson);
      expect(result).toBe(false);
    });

    it('应该处理JSON解析错误', () => {
      const result = TreatmentPlanStorage.importData('invalid json');
      expect(result).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('应该返回存储信息', () => {
      const versions: TreatmentPlanVersion[] = [
        {
          id: 'version_1',
          version: 1,
          content: '测试内容',
          assessmentId: 'assessment_001',
          patientId: 'patient_001',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
          createdBy: 'system',
          isCurrent: true,
        },
      ];

      TreatmentPlanStorage.saveVersions(versions);
      const info = TreatmentPlanStorage.getStorageInfo();

      expect(info.available).toBe(true);
      expect(info.used).toBeGreaterThan(0);
    });

    it('应该返回0当没有数据时', () => {
      const info = TreatmentPlanStorage.getStorageInfo();
      expect(info.used).toBe(0);
    });
  });
});
