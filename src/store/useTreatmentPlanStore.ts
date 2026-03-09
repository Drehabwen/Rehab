import { create } from 'zustand';
import { TreatmentPlanApi } from '../api';
import type { TreatmentPlanVersion, AssessmentRecord } from '../types/assessment';
import { TreatmentPlanStorage } from '../utils/treatmentPlanStorage';
import { AssessmentRecordStorage } from '../utils/assessmentRecordStorage';
import { APP_CONFIG } from '../config/appConfig';

interface TreatmentPlanState {
  // 状态
  currentContent: string;
  isGenerating: boolean;
  error: string | null;
  versions: TreatmentPlanVersion[];
  currentVersionId: string | null;
  comparingVersions: [string | null, string | null];
  assessmentRecords: AssessmentRecord[];
  linkedAssessmentId: string | null;
  
  // 操作
  generatePlan: (assessmentId: string, patientId: string) => Promise<void>;
  clearContent: () => void;
  setError: (error: string | null) => void;
  
  // 版本管理
  saveVersion: (content: string, assessmentId: string, patientId: string) => void;
  switchVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  updateVersionTags: (versionId: string, tags: string[]) => void;
  updateVersionNotes: (versionId: string, notes: string) => void;
  
  // 版本对比
  startCompare: (versionId1: string, versionId2: string) => void;
  endCompare: () => void;
  
  // 评估关联
  linkAssessment: (planId: string, assessmentId: string) => void;
  loadAssessmentRecords: (patientId: string) => void;
  setLinkedAssessment: (assessmentId: string | null) => void;
  setCurrentVersion: (versionId: string) => void;
}

export const useTreatmentPlanStore = create<TreatmentPlanState>((set, get) => {
  const savedVersions = TreatmentPlanStorage.loadVersions();
  const currentVersion = savedVersions.find(v => v.isCurrent);
  const patientId = APP_CONFIG.CURRENT_PATIENT_ID;
  const savedAssessmentRecords = AssessmentRecordStorage.loadRecords(patientId);
  
  return {
    // 初始状态
    currentContent: currentVersion?.content || '',
    isGenerating: false,
    error: null,
    versions: savedVersions,
    currentVersionId: currentVersion?.id || null,
    comparingVersions: [null, null],
    assessmentRecords: savedAssessmentRecords,
    linkedAssessmentId: currentVersion?.assessmentId || null,
  
  // 生成治疗计划
  generatePlan: async (assessmentId, patientId) => {
    set({ isGenerating: true, error: null, currentContent: '' });
    
    try {
      let fullContent = '';
      
      await TreatmentPlanApi.generateStream(
        assessmentId,
        patientId,
        (chunk) => {
          // 直接追加内容，不重新渲染整个组件
          fullContent += chunk;
          set((state) => ({ 
            currentContent: state.currentContent + chunk 
          }));
        }
      );
      
      // 生成完成后自动保存版本
      set((state) => {
        const newVersion: TreatmentPlanVersion = {
          id: `version_${Date.now()}_${state.versions.length + 1}`,
          version: state.versions.length + 1,
          content: fullContent,
          assessmentId,
          patientId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: 'system',
          isCurrent: true
        };
        
        // 将其他版本标记为非当前
        const updatedVersions = state.versions.map(v => ({
          ...v,
          isCurrent: false
        }));
        
        return {
          versions: [...updatedVersions, newVersion],
          currentVersionId: newVersion.id
        };
      });
      
      // 保存到本地存储
      TreatmentPlanStorage.saveVersions(get().versions);
      
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '生成治疗计划失败' 
      });
    } finally {
      set({ isGenerating: false });
    }
  },
  
  // 清除内容
  clearContent: () => set({ currentContent: '', error: null }),
  
  // 设置错误
  setError: (error) => set({ error }),
  
  // 版本管理
  saveVersion: (content, assessmentId, patientId) => set((state) => {
    const newVersion: TreatmentPlanVersion = {
      id: `version_${Date.now()}_${state.versions.length + 1}`,
      version: state.versions.length + 1,
      content,
      assessmentId,
      patientId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'system',
      isCurrent: true
    };
    
    const updatedVersions = state.versions.map(v => ({
      ...v,
      isCurrent: false
    }));
    
    const newVersions = [...updatedVersions, newVersion];
    
    // 保存到本地存储
    TreatmentPlanStorage.saveVersions(newVersions);
    
    return {
      versions: newVersions,
      currentVersionId: newVersion.id,
      currentContent: content
    };
  }),
  
  switchVersion: (versionId) => set((state) => {
    const version = state.versions.find(v => v.id === versionId);
    if (!version) return state;
    
    const newVersions = state.versions.map(v => ({
      ...v,
      isCurrent: v.id === versionId
    }));
    
    // 保存到本地存储
    TreatmentPlanStorage.saveVersions(newVersions);
    
    return {
      currentVersionId: versionId,
      currentContent: version.content,
      versions: newVersions
    };
  }),
  
  deleteVersion: (versionId) => set((state) => {
    const filteredVersions = state.versions.filter(v => v.id !== versionId);
    
    let newCurrentVersionId = state.currentVersionId;
    let newCurrentContent = state.currentContent;
    
    if (versionId === state.currentVersionId) {
      if (filteredVersions.length > 0) {
        const latestVersion = filteredVersions[filteredVersions.length - 1];
        newCurrentVersionId = latestVersion.id;
        newCurrentContent = latestVersion.content;
      } else {
        newCurrentVersionId = null;
        newCurrentContent = '';
      }
    }
    
    const finalVersions = filteredVersions.map(v => ({
      ...v,
      isCurrent: v.id === newCurrentVersionId
    }));
    
    // 保存到本地存储
    TreatmentPlanStorage.saveVersions(finalVersions);
    
    return {
      versions: finalVersions,
      currentVersionId: newCurrentVersionId,
      currentContent: newCurrentContent
    };
  }),
  
  updateVersionTags: (versionId, tags) => set((state) => {
    const newVersions = state.versions.map(v => 
      v.id === versionId ? { ...v, tags, updatedAt: new Date().toISOString() } : v
    );
    
    // 保存到本地存储
    TreatmentPlanStorage.saveVersions(newVersions);
    
    return { versions: newVersions };
  }),
  
  updateVersionNotes: (versionId, notes) => set((state) => {
    const newVersions = state.versions.map(v => 
      v.id === versionId ? { ...v, notes, updatedAt: new Date().toISOString() } : v
    );
    
    // 保存到本地存储
    TreatmentPlanStorage.saveVersions(newVersions);
    
    return { versions: newVersions };
  }),
  
  // 版本对比
  startCompare: (versionId1, versionId2) => set({
    comparingVersions: [versionId1, versionId2]
  }),
  
  endCompare: () => set({
    comparingVersions: [null, null]
  }),
  
  // 评估关联
  linkAssessment: (planId, assessmentId) => set((state) => {
    const newVersions = state.versions.map(v => {
      if (v.id === planId) {
        const assessmentRecord = state.assessmentRecords.find(r => r.id === assessmentId);
        return {
          ...v,
          assessmentId,
          assessmentData: assessmentRecord,
          updatedAt: new Date().toISOString()
        };
      }
      return v;
    });
    
    const newAssessmentRecords = state.assessmentRecords.map(r => {
      if (r.id === assessmentId) {
        return { ...r, treatmentPlanId: planId };
      }
      return r;
    });
    
    TreatmentPlanStorage.saveVersions(newVersions);
    
    const updatedRecord = newAssessmentRecords.find(r => r.id === assessmentId);
    if (updatedRecord) {
      AssessmentRecordStorage.saveRecord(updatedRecord);
    }
    
    return {
      versions: newVersions,
      assessmentRecords: newAssessmentRecords,
      linkedAssessmentId: assessmentId
    };
  }),
  
  loadAssessmentRecords: (patientId) => {
    const records = AssessmentRecordStorage.loadRecords(patientId);
    set({ assessmentRecords: records });
  },
  
  setLinkedAssessment: (assessmentId) => set({
    linkedAssessmentId: assessmentId
  }),
  
  setCurrentVersion: (versionId) => set({
    currentVersionId: versionId
  }),
  };
});
