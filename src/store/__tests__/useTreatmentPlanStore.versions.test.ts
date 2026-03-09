import { describe, it, expect, beforeEach } from 'vitest';
import { useTreatmentPlanStore } from '../useTreatmentPlanStore';
import type { TreatmentPlanVersion } from '../../types/assessment';

describe('useTreatmentPlanStore - 版本管理', () => {
  beforeEach(() => {
    // 重置状态
    const { clearContent } = useTreatmentPlanStore.getState();
    clearContent();
    // 清空版本列表
    useTreatmentPlanStore.setState({
      versions: [],
      currentVersionId: null,
      comparingVersions: [null, null]
    });
  });

  describe('初始状态', () => {
    it('应该有正确的初始状态', () => {
      const state = useTreatmentPlanStore.getState();
      
      expect(state.versions).toEqual([]);
      expect(state.currentVersionId).toBeNull();
      expect(state.comparingVersions).toEqual([null, null]);
    });
  });

  describe('saveVersion', () => {
    it('应该保存新版本', () => {
      const { saveVersion } = useTreatmentPlanStore.getState();
      
      saveVersion('治疗计划内容', 'assessment_001', 'patient_001');
      
      const state = useTreatmentPlanStore.getState();
      expect(state.versions).toHaveLength(1);
      expect(state.versions[0].content).toBe('治疗计划内容');
      expect(state.versions[0].isCurrent).toBe(true);
    });

    it('应该自动递增版本号', () => {
      const { saveVersion } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      saveVersion('版本2', 'assessment_001', 'patient_001');
      
      const state = useTreatmentPlanStore.getState();
      expect(state.versions).toHaveLength(2);
      expect(state.versions[0].version).toBe(1);
      expect(state.versions[1].version).toBe(2);
    });

    it('应该将旧版本标记为非当前', () => {
      const { saveVersion } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      saveVersion('版本2', 'assessment_001', 'patient_001');
      
      const state = useTreatmentPlanStore.getState();
      expect(state.versions[0].isCurrent).toBe(false);
      expect(state.versions[1].isCurrent).toBe(true);
    });
  });

  describe('switchVersion', () => {
    it('应该切换到指定版本', () => {
      const { saveVersion, switchVersion } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      const versionId = useTreatmentPlanStore.getState().versions[0].id;
      
      switchVersion(versionId);
      
      const state = useTreatmentPlanStore.getState();
      expect(state.currentVersionId).toBe(versionId);
      expect(state.currentContent).toBe('版本1');
    });

    it('应该更新当前版本标记', () => {
      const { saveVersion, switchVersion } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      saveVersion('版本2', 'assessment_001', 'patient_001');
      
      // 切换到第一个版本（versions[0]）
      const firstVersionId = useTreatmentPlanStore.getState().versions[0].id;
      switchVersion(firstVersionId);
      
      const state = useTreatmentPlanStore.getState();
      // 切换后，versions[0] 应该是当前版本
      expect(state.versions[0].isCurrent).toBe(true);
      expect(state.versions[1].isCurrent).toBe(false);
    });
  });

  describe('deleteVersion', () => {
    it('应该删除指定版本', () => {
      const { saveVersion, deleteVersion } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      saveVersion('版本2', 'assessment_001', 'patient_001');
      
      const versionId = useTreatmentPlanStore.getState().versions[0].id;
      deleteVersion(versionId);
      
      const state = useTreatmentPlanStore.getState();
      expect(state.versions).toHaveLength(1);
      expect(state.versions[0].content).toBe('版本2');
    });

    it('删除当前版本时应切换到最新版本', () => {
      const { saveVersion, deleteVersion } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      saveVersion('版本2', 'assessment_001', 'patient_001');
      
      const currentVersionId = useTreatmentPlanStore.getState().currentVersionId;
      deleteVersion(currentVersionId!);
      
      const state = useTreatmentPlanStore.getState();
      expect(state.currentContent).toBe('版本1');
      expect(state.versions[0].isCurrent).toBe(true);
    });

    it('删除所有版本时应清空当前内容', () => {
      const { saveVersion, deleteVersion } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      
      const versionId = useTreatmentPlanStore.getState().versions[0].id;
      deleteVersion(versionId);
      
      const state = useTreatmentPlanStore.getState();
      expect(state.versions).toHaveLength(0);
      expect(state.currentVersionId).toBeNull();
      expect(state.currentContent).toBe('');
    });
  });

  describe('updateVersionTags', () => {
    it('应该更新版本标签', () => {
      const { saveVersion, updateVersionTags } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      const versionId = useTreatmentPlanStore.getState().versions[0].id;
      
      updateVersionTags(versionId, ['康复', '肩部']);
      
      const state = useTreatmentPlanStore.getState();
      expect(state.versions[0].tags).toEqual(['康复', '肩部']);
    });
  });

  describe('updateVersionNotes', () => {
    it('应该更新版本备注', () => {
      const { saveVersion, updateVersionNotes } = useTreatmentPlanStore.getState();
      
      saveVersion('版本1', 'assessment_001', 'patient_001');
      const versionId = useTreatmentPlanStore.getState().versions[0].id;
      
      updateVersionNotes(versionId, '第一次生成');
      
      const state = useTreatmentPlanStore.getState();
      expect(state.versions[0].notes).toBe('第一次生成');
    });
  });

  describe('startCompare', () => {
    it('应该开始版本对比', () => {
      const { startCompare } = useTreatmentPlanStore.getState();
      
      startCompare('version_1', 'version_2');
      
      const state = useTreatmentPlanStore.getState();
      expect(state.comparingVersions).toEqual(['version_1', 'version_2']);
    });
  });

  describe('endCompare', () => {
    it('应该结束版本对比', () => {
      const { startCompare, endCompare } = useTreatmentPlanStore.getState();
      
      startCompare('version_1', 'version_2');
      endCompare();
      
      const state = useTreatmentPlanStore.getState();
      expect(state.comparingVersions).toEqual([null, null]);
    });
  });
});
