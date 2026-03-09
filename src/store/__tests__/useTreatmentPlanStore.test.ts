import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useTreatmentPlanStore } from '../useTreatmentPlanStore';
import { TreatmentPlanApi } from '../../api/treatmentPlanApi';
import { APP_CONFIG } from '../../config/appConfig';
import type { AssessmentRecord, TreatmentPlanVersion } from '../../types/assessment';

// Mock API
vi.mock('../../api/treatmentPlanApi', () => ({
  TreatmentPlanApi: {
    generateStream: vi.fn(),
    generate: vi.fn(),
  },
}));

describe('useTreatmentPlanStore', () => {
  beforeEach(() => {
    const { clearContent, setError } = useTreatmentPlanStore.getState();
    clearContent();
    setError(null);
    useTreatmentPlanStore.setState({
      versions: [],
      currentVersionId: null,
      comparingVersions: [null, null]
    });
    vi.clearAllMocks();
  });

  const createTestRecord = (id: string): AssessmentRecord => ({
    id,
    timestamp: '2024-01-01T00:00:00.000Z',
    patientId: APP_CONFIG.CURRENT_PATIENT_ID,
    assessmentType: 'front' as const,
    imageData: 'data:image/jpeg;base64,test',
    landmarks: [],
    angles: {},
    metrics: {},
  });

  const createTestVersion = (id: string, version: number): TreatmentPlanVersion => ({
    id,
    version,
    content: '治疗计划内容',
    assessmentId: '',
    patientId: APP_CONFIG.CURRENT_PATIENT_ID,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    createdBy: APP_CONFIG.DEFAULT_THERAPIST_ID,
    isCurrent: true,
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useTreatmentPlanStore.getState();
      expect(state.currentContent).toBe('');
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBeNull();
      expect(state.versions).toEqual([]);
    });
  });

  describe('generatePlan', () => {
    it('应该成功生成治疗计划', async () => {
      const mockChunks = ['治疗', '计划', '内容'];
      let chunkIndex = 0;

      vi.mocked(TreatmentPlanApi.generateStream).mockImplementation(
        async (assessmentId, patientId, onChunk) => {
          for (const chunk of mockChunks) {
            onChunk(chunk);
          }
        }
      );

      const store = useTreatmentPlanStore.getState();
      await store.generatePlan('assessment_001', 'patient_001');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.currentContent).toBe('治疗计划内容');
      expect(newState.isGenerating).toBe(false);
      expect(newState.error).toBeNull();
    });

    it('应该在生成时设置 isGenerating 为 true', async () => {
      vi.mocked(TreatmentPlanApi.generateStream).mockImplementation(
        async () => {
          const state = useTreatmentPlanStore.getState();
          expect(state.isGenerating).toBe(true);
        }
      );

      const store = useTreatmentPlanStore.getState();
      await store.generatePlan('assessment_001', 'patient_001');
    });

    it('应该处理 API 错误', async () => {
      vi.mocked(TreatmentPlanApi.generateStream).mockRejectedValue(
        new Error('API 错误')
      );

      const store = useTreatmentPlanStore.getState();
      await store.generatePlan('assessment_001', 'patient_001');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.error).toBe('API 错误');
      expect(newState.isGenerating).toBe(false);
    });

    it('应该处理非 Error 类型的错误', async () => {
      vi.mocked(TreatmentPlanApi.generateStream).mockRejectedValue('字符串错误');

      const store = useTreatmentPlanStore.getState();
      await store.generatePlan('assessment_001', 'patient_001');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.error).toBe('生成治疗计划失败');
    });

    it('应该在开始时清空当前内容', async () => {
      // 先设置一些内容
      useTreatmentPlanStore.setState({ currentContent: '旧内容' });

      vi.mocked(TreatmentPlanApi.generateStream).mockImplementation(
        async () => {
          const state = useTreatmentPlanStore.getState();
          expect(state.currentContent).toBe('');
        }
      );

      const store = useTreatmentPlanStore.getState();
      await store.generatePlan('assessment_001', 'patient_001');
    });

    it('应该累积多个 chunks', async () => {
      const chunks = ['第', '二', '周', '训', '练'];

      vi.mocked(TreatmentPlanApi.generateStream).mockImplementation(
        async (assessmentId, patientId, onChunk) => {
          for (const chunk of chunks) {
            onChunk(chunk);
          }
        }
      );

      const store = useTreatmentPlanStore.getState();
      await store.generatePlan('assessment_001', 'patient_001');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.currentContent).toBe('第二周训练');
    });
  });

  describe('clearContent', () => {
    it('应该清空当前内容', () => {
      useTreatmentPlanStore.setState({ currentContent: '一些内容' });

      const store = useTreatmentPlanStore.getState();
      store.clearContent();

      const newState = useTreatmentPlanStore.getState();
      expect(newState.currentContent).toBe('');
    });

    it('应该清空错误信息', () => {
      useTreatmentPlanStore.setState({ error: '错误信息' });

      const store = useTreatmentPlanStore.getState();
      store.clearContent();

      const newState = useTreatmentPlanStore.getState();
      expect(newState.error).toBeNull();
    });
  });

  describe('setError', () => {
    it('应该设置错误信息', () => {
      const store = useTreatmentPlanStore.getState();
      store.setError('新的错误');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.error).toBe('新的错误');
    });

    it('应该清除错误信息', () => {
      useTreatmentPlanStore.setState({ error: '错误信息' });

      const store = useTreatmentPlanStore.getState();
      store.setError(null);

      const newState = useTreatmentPlanStore.getState();
      expect(newState.error).toBeNull();
    });
  });

  describe('linkAssessment', () => {
    it('应该成功关联评估记录到治疗计划', () => {
      const assessmentRecord = createTestRecord('assessment_001');
      const treatmentPlanVersion = createTestVersion('version_001', 1);

      useTreatmentPlanStore.setState({
        versions: [treatmentPlanVersion],
        assessmentRecords: [assessmentRecord],
      });

      const store = useTreatmentPlanStore.getState();
      store.linkAssessment('version_001', 'assessment_001');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.versions[0].assessmentId).toBe('assessment_001');
      expect(newState.versions[0].assessmentData).toEqual(assessmentRecord);
    });

    it('应该更新评估记录的 treatmentPlanId', () => {
      const assessmentRecord = createTestRecord('assessment_001');
      const treatmentPlanVersion = createTestVersion('version_001', 1);

      useTreatmentPlanStore.setState({
        versions: [treatmentPlanVersion],
        assessmentRecords: [assessmentRecord],
      });

      const store = useTreatmentPlanStore.getState();
      store.linkAssessment('version_001', 'assessment_001');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.assessmentRecords[0].treatmentPlanId).toBe('version_001');
    });

    it('应该设置 linkedAssessmentId', () => {
      const assessmentRecord = createTestRecord('assessment_001');
      const treatmentPlanVersion = createTestVersion('version_001', 1);

      useTreatmentPlanStore.setState({
        versions: [treatmentPlanVersion],
        assessmentRecords: [assessmentRecord],
      });

      const store = useTreatmentPlanStore.getState();
      store.linkAssessment('version_001', 'assessment_001');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.linkedAssessmentId).toBe('assessment_001');
    });
  });

  describe('setCurrentVersion', () => {
    it('应该成功设置当前版本', () => {
      const store = useTreatmentPlanStore.getState();
      store.setCurrentVersion('version_001');

      const newState = useTreatmentPlanStore.getState();
      expect(newState.currentVersionId).toBe('version_001');
    });
  });
});
