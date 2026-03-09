import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AssessmentRecordStorage } from '../assessmentRecordStorage';
import type { AssessmentRecord } from '../../types/assessment';

describe('AssessmentRecordStorage', () => {
  const patientId = 'test_patient';
  
  beforeEach(() => {
    AssessmentRecordStorage.clearRecords(patientId);
  });

  afterEach(() => {
    AssessmentRecordStorage.clearRecords(patientId);
  });

  describe('saveRecord', () => {
    it('应该成功保存评估记录', () => {
      const record: AssessmentRecord = {
        id: 'assessment_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [0.5, 0.5, 0.6, 0.6],
        angles: { head: 15.5 },
        metrics: { shoulder: 2.3 },
      };

      const result = AssessmentRecordStorage.saveRecord(record);
      expect(result).toBe(true);

      const loaded = AssessmentRecordStorage.loadRecords(patientId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('assessment_001');
    });

    it('应该更新已存在的记录', () => {
      const record: AssessmentRecord = {
        id: 'assessment_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [0.5, 0.5],
        angles: {},
        metrics: {},
      };

      AssessmentRecordStorage.saveRecord(record);

      const updated = { ...record, feedback: '测试反馈' };
      AssessmentRecordStorage.saveRecord(updated);

      const loaded = AssessmentRecordStorage.loadRecords(patientId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].feedback).toBe('测试反馈');
    });
  });

  describe('loadRecords', () => {
    it('应该成功加载评估记录', () => {
      const record: AssessmentRecord = {
        id: 'assessment_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [],
        angles: {},
        metrics: {},
      };

      AssessmentRecordStorage.saveRecord(record);
      const loaded = AssessmentRecordStorage.loadRecords(patientId);

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('assessment_001');
    });

    it('应该返回空数组当没有数据时', () => {
      const loaded = AssessmentRecordStorage.loadRecords(patientId);
      expect(loaded).toHaveLength(0);
    });
  });

  describe('getRecord', () => {
    it('应该成功获取指定记录', () => {
      const record: AssessmentRecord = {
        id: 'assessment_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [],
        angles: {},
        metrics: {},
      };

      AssessmentRecordStorage.saveRecord(record);
      const loaded = AssessmentRecordStorage.getRecord('assessment_001', patientId);

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('assessment_001');
    });

    it('应该返回null当记录不存在时', () => {
      const loaded = AssessmentRecordStorage.getRecord('nonexistent', patientId);
      expect(loaded).toBeNull();
    });
  });

  describe('deleteRecord', () => {
    it('应该成功删除记录', () => {
      const record: AssessmentRecord = {
        id: 'assessment_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [],
        angles: {},
        metrics: {},
      };

      AssessmentRecordStorage.saveRecord(record);
      expect(AssessmentRecordStorage.loadRecords(patientId)).toHaveLength(1);

      const result = AssessmentRecordStorage.deleteRecord('assessment_001', patientId);
      expect(result).toBe(true);
      expect(AssessmentRecordStorage.loadRecords(patientId)).toHaveLength(0);
    });
  });

  describe('clearRecords', () => {
    it('应该清空所有记录', () => {
      const record: AssessmentRecord = {
        id: 'assessment_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [],
        angles: {},
        metrics: {},
      };

      AssessmentRecordStorage.saveRecord(record);
      expect(AssessmentRecordStorage.loadRecords(patientId)).toHaveLength(1);

      AssessmentRecordStorage.clearRecords(patientId);
      expect(AssessmentRecordStorage.loadRecords(patientId)).toHaveLength(0);
    });
  });

  describe('exportData', () => {
    it('应该成功导出数据', () => {
      const record: AssessmentRecord = {
        id: 'assessment_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [],
        angles: {},
        metrics: {},
      };

      AssessmentRecordStorage.saveRecord(record);
      const exported = AssessmentRecordStorage.exportData(patientId);

      const parsed = JSON.parse(exported);
      expect(parsed.patientId).toBe(patientId);
      expect(parsed.records).toHaveLength(1);
    });
  });

  describe('importData', () => {
    it('应该成功导入数据', () => {
      const importJson = JSON.stringify({
        version: '1.0',
        patientId: 'import_patient',
        exportDate: '2024-01-01T00:00:00.000Z',
        records: [
          {
            id: 'import_001',
            timestamp: '2024-01-01T00:00:00.000Z',
            assessmentType: 'front',
            imageData: 'data:image/jpeg;base64,test',
            landmarks: [],
            angles: {},
            metrics: {},
          },
        ],
      });

      const result = AssessmentRecordStorage.importData(importJson, patientId);
      expect(result).toBe(true);

      const loaded = AssessmentRecordStorage.loadRecords(patientId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].patientId).toBe(patientId);
    });

    it('应该拒绝无效格式', () => {
      const invalidJson = JSON.stringify({
        invalid: 'data',
      });

      const result = AssessmentRecordStorage.importData(invalidJson, patientId);
      expect(result).toBe(false);
    });
  });

  describe('getStorageInfo', () => {
    it('应该返回存储信息', () => {
      const record: AssessmentRecord = {
        id: 'assessment_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [],
        angles: {},
        metrics: {},
      };

      AssessmentRecordStorage.saveRecord(record);
      const info = AssessmentRecordStorage.getStorageInfo(patientId);

      expect(info.available).toBe(true);
      expect(info.count).toBe(1);
      expect(info.used).toBeGreaterThan(0);
    });

    it('应该返回0当没有数据时', () => {
      const info = AssessmentRecordStorage.getStorageInfo(patientId);
      expect(info.used).toBe(0);
      expect(info.count).toBe(0);
    });
  });

  describe('validateImageSize', () => {
    it('应该验证图像大小', () => {
      const smallImage = 'data:image/jpeg;base64,' + 'a'.repeat(100);
      const largeImage = 'data:image/jpeg;base64,' + 'a'.repeat(600000);

      expect(AssessmentRecordStorage.validateImageSize(smallImage)).toBe(true);
      expect(AssessmentRecordStorage.validateImageSize(largeImage)).toBe(false);
    });
  });

  describe('cleanupOldRecords', () => {
    it('应该清理旧记录', () => {
      const oldRecord: AssessmentRecord = {
        id: 'old_001',
        timestamp: '2024-01-01T00:00:00.000Z',
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [],
        angles: {},
        metrics: {},
      };

      const newRecord: AssessmentRecord = {
        id: 'new_001',
        timestamp: new Date().toISOString(),
        patientId,
        assessmentType: 'front',
        imageData: 'data:image/jpeg;base64,test',
        landmarks: [],
        angles: {},
        metrics: {},
      };

      AssessmentRecordStorage.saveRecord(oldRecord);
      AssessmentRecordStorage.saveRecord(newRecord);

      const deletedCount = AssessmentRecordStorage.cleanupOldRecords(patientId, 1);
      expect(deletedCount).toBe(1);

      const loaded = AssessmentRecordStorage.loadRecords(patientId);
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('new_001');
    });
  });
});
