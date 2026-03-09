import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useAssessmentRecordStore } from '../useAssessmentRecordStore';
import { APP_CONFIG } from '../../config/appConfig';
import type { AssessmentRecord } from '../../types/assessment';

describe('useAssessmentRecordStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAssessmentRecordStore.getState().clearRecords();
  });

  afterEach(() => {
    localStorage.clear();
    useAssessmentRecordStore.getState().clearRecords();
  });

  const createTestRecord = (id: string): AssessmentRecord => ({
    id,
    timestamp: '2024-01-01T00:00:00.000Z',
    patientId: APP_CONFIG.CURRENT_PATIENT_ID,
    assessmentType: 'front',
    imageData: 'data:image/jpeg;base64,test',
    landmarks: [],
    angles: {},
    metrics: {},
  });

  describe('初始状态', () => {
    it('应该初始化为空状态', () => {
      const state = useAssessmentRecordStore.getState();
      expect(state.records).toHaveLength(0);
      expect(state.currentRecord).toBeNull();
    });
  });

  describe('addRecord', () => {
    it('应该成功添加评估记录', () => {
      const record = createTestRecord('assessment_001');
      record.landmarks = [0.5, 0.5];
      record.angles = { head: 15.5 };
      record.metrics = { shoulder: 2.3 };

      useAssessmentRecordStore.getState().addRecord(record);

      const state = useAssessmentRecordStore.getState();
      expect(state.records).toHaveLength(1);
      expect(state.records[0].id).toBe('assessment_001');
      expect(state.currentRecord?.id).toBe('assessment_001');
    });

    it('应该将新记录设置为当前记录', () => {
      const record1 = createTestRecord('assessment_001');
      record1.assessmentType = 'front';
      record1.imageData = 'data:image/jpeg;base64,test1';

      const record2 = createTestRecord('assessment_002');
      record2.assessmentType = 'side';
      record2.imageData = 'data:image/jpeg;base64,test2';

      useAssessmentRecordStore.getState().addRecord(record1);
      useAssessmentRecordStore.getState().addRecord(record2);

      const state = useAssessmentRecordStore.getState();
      expect(state.currentRecord?.id).toBe('assessment_002');
    });
  });

  describe('updateRecord', () => {
    it('应该成功更新记录', () => {
      const record = createTestRecord('assessment_001');
      useAssessmentRecordStore.getState().addRecord(record);
      useAssessmentRecordStore.getState().updateRecord('assessment_001', {
        feedback: '测试反馈',
        improvement: 10,
      });

      const state = useAssessmentRecordStore.getState();
      expect(state.records[0].feedback).toBe('测试反馈');
      expect(state.records[0].improvement).toBe(10);
    });

    it('应该更新当前记录', () => {
      const record = createTestRecord('assessment_001');
      useAssessmentRecordStore.getState().addRecord(record);
      useAssessmentRecordStore.getState().updateRecord('assessment_001', {
        feedback: '测试反馈',
      });

      const state = useAssessmentRecordStore.getState();
      expect(state.currentRecord?.feedback).toBe('测试反馈');
    });

    it('应该不影响其他记录', () => {
      const record1 = createTestRecord('assessment_001');
      record1.imageData = 'data:image/jpeg;base64,test1';

      const record2 = createTestRecord('assessment_002');
      record2.assessmentType = 'side';
      record2.imageData = 'data:image/jpeg;base64,test2';

      useAssessmentRecordStore.getState().addRecord(record1);
      useAssessmentRecordStore.getState().addRecord(record2);
      useAssessmentRecordStore.getState().updateRecord('assessment_001', {
        feedback: '反馈1',
      });

      const state = useAssessmentRecordStore.getState();
      expect(state.records[0].feedback).toBe('反馈1');
      expect(state.records[1].feedback).toBeUndefined();
    });

    it('应该持久化更新到 localStorage', () => {
      const record = createTestRecord('assessment_001');
      useAssessmentRecordStore.getState().addRecord(record);
      useAssessmentRecordStore.getState().updateRecord('assessment_001', {
        feedback: '持久化测试',
      });

      const storedData = localStorage.getItem('assessment_records_' + APP_CONFIG.CURRENT_PATIENT_ID);
      expect(storedData).not.toBeNull();
      
      const parsedData = JSON.parse(storedData!);
      expect(parsedData.records[0].feedback).toBe('持久化测试');
    });
  });

  describe('deleteRecord', () => {
    it('应该成功删除记录', () => {
      const record = createTestRecord('assessment_001');
      useAssessmentRecordStore.getState().addRecord(record);
      expect(useAssessmentRecordStore.getState().records).toHaveLength(1);

      useAssessmentRecordStore.getState().deleteRecord('assessment_001');
      expect(useAssessmentRecordStore.getState().records).toHaveLength(0);
    });

    it('应该清除当前记录如果删除的是当前记录', () => {
      const record = createTestRecord('assessment_001');
      useAssessmentRecordStore.getState().addRecord(record);
      expect(useAssessmentRecordStore.getState().currentRecord).not.toBeNull();

      useAssessmentRecordStore.getState().deleteRecord('assessment_001');
      expect(useAssessmentRecordStore.getState().currentRecord).toBeNull();
    });

    it('应该不影响其他记录', () => {
      const record1 = createTestRecord('assessment_001');
      record1.imageData = 'data:image/jpeg;base64,test1';

      const record2 = createTestRecord('assessment_002');
      record2.assessmentType = 'side';
      record2.imageData = 'data:image/jpeg;base64,test2';

      useAssessmentRecordStore.getState().addRecord(record1);
      useAssessmentRecordStore.getState().addRecord(record2);
      useAssessmentRecordStore.getState().deleteRecord('assessment_001');

      const state = useAssessmentRecordStore.getState();
      expect(state.records).toHaveLength(1);
      expect(state.records[0].id).toBe('assessment_002');
    });
  });

  describe('setCurrentRecord', () => {
    it('应该成功设置当前记录', () => {
      const record1 = createTestRecord('assessment_001');
      record1.imageData = 'data:image/jpeg;base64,test1';

      const record2 = createTestRecord('assessment_002');
      record2.assessmentType = 'side';
      record2.imageData = 'data:image/jpeg;base64,test2';

      useAssessmentRecordStore.getState().addRecord(record1);
      useAssessmentRecordStore.getState().addRecord(record2);
      useAssessmentRecordStore.getState().setCurrentRecord('assessment_001');

      const state = useAssessmentRecordStore.getState();
      expect(state.currentRecord?.id).toBe('assessment_001');
    });

    it('应该设置为null如果记录不存在', () => {
      useAssessmentRecordStore.getState().setCurrentRecord('nonexistent');

      const state = useAssessmentRecordStore.getState();
      expect(state.currentRecord).toBeNull();
    });
  });

  describe('clearRecords', () => {
    it('应该清空所有记录', () => {
      const record = createTestRecord('assessment_001');
      useAssessmentRecordStore.getState().addRecord(record);
      expect(useAssessmentRecordStore.getState().records).toHaveLength(1);

      useAssessmentRecordStore.getState().clearRecords();
      const state = useAssessmentRecordStore.getState();
      expect(state.records).toHaveLength(0);
      expect(state.currentRecord).toBeNull();
    });
  });
});
