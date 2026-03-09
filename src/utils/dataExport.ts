import { AssessmentRecordStorage } from './assessmentRecordStorage';
import { TreatmentPlanStorage } from './treatmentPlanStorage';
import type { AssessmentRecord, TreatmentPlanVersion } from '../types/assessment';

export interface PatientDataExport {
  version: string;
  patientId: string;
  exportDate: string;
  assessments: AssessmentRecord[];
  treatmentPlans: TreatmentPlanVersion[];
  metadata: {
    assessmentCount: number;
    treatmentPlanCount: number;
    totalSize: number;
  };
}

export const exportPatientData = (patientId: string): string => {
  const assessments = AssessmentRecordStorage.loadRecords(patientId);
  const treatmentPlans = TreatmentPlanStorage.loadVersions();
  
  const exportData: PatientDataExport = {
    version: '1.0',
    patientId,
    exportDate: new Date().toISOString(),
    assessments,
    treatmentPlans,
    metadata: {
      assessmentCount: assessments.length,
      treatmentPlanCount: treatmentPlans.length,
      totalSize: 0,
    },
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  exportData.metadata.totalSize = new Blob([jsonString]).size;
  
  return JSON.stringify(exportData, null, 2);
};

export const importPatientData = (jsonStr: string, patientId: string): boolean => {
  try {
    const data = JSON.parse(jsonStr);
    
    if (!data.assessments || !Array.isArray(data.assessments)) {
      throw new Error('无效的评估数据格式');
    }
    
    if (!data.treatmentPlans || !Array.isArray(data.treatmentPlans)) {
      throw new Error('无效的治疗计划数据格式');
    }
    
    const assessments: AssessmentRecord[] = data.assessments.map((r: any) => ({
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
    
    const treatmentPlans: TreatmentPlanVersion[] = data.treatmentPlans.map((p: any) => ({
      id: p.id,
      version: p.version,
      content: p.content,
      assessmentId: p.assessmentId,
      patientId,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      createdBy: p.createdBy,
      tags: p.tags,
      notes: p.notes,
      isCurrent: p.isCurrent,
    }));
    
    const success1 = AssessmentRecordStorage.importData(
      JSON.stringify({
        version: '1.0',
        patientId,
        exportDate: new Date().toISOString(),
        records: assessments,
      }),
      patientId
    );
    
    const success2 = TreatmentPlanStorage.importData(
      JSON.stringify({
        version: '1.0',
        versions: treatmentPlans,
        lastUpdated: new Date().toISOString(),
      })
    );
    
    return success1 && success2;
  } catch (error) {
    console.error('导入患者数据失败:', error);
    return false;
  }
};

export const downloadPatientData = (patientId: string, filename?: string): void => {
  const data = exportPatientData(patientId);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `patient_data_${patientId}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const uploadPatientData = (file: File, patientId: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importPatientData(content, patientId);
      resolve(success);
    };
    reader.onerror = () => {
      console.error('文件读取失败');
      resolve(false);
    };
    reader.readAsText(file);
  });
};

export const validatePatientData = (jsonStr: string): { valid: boolean; error?: string } => {
  try {
    const data = JSON.parse(jsonStr);
    
    if (!data.version) {
      return { valid: false, error: '缺少版本信息' };
    }
    
    if (!data.assessments || !Array.isArray(data.assessments)) {
      return { valid: false, error: '无效的评估数据' };
    }
    
    if (!data.treatmentPlans || !Array.isArray(data.treatmentPlans)) {
      return { valid: false, error: '无效的治疗计划数据' };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : '数据解析失败' 
    };
  }
};

export const getPatientDataSummary = (patientId: string): {
  assessmentCount: number;
  treatmentPlanCount: number;
  totalSize: number;
  lastAssessmentDate: string | null;
  lastTreatmentPlanDate: string | null;
} => {
  const assessments = AssessmentRecordStorage.loadRecords(patientId);
  const treatmentPlans = TreatmentPlanStorage.loadVersions();
  
  const lastAssessment = assessments.length > 0 
    ? assessments[assessments.length - 1]
    : null;
  const lastTreatmentPlan = treatmentPlans.length > 0
    ? treatmentPlans[treatmentPlans.length - 1]
    : null;
  
  const assessmentStorage = AssessmentRecordStorage.getStorageInfo(patientId);
  const treatmentPlanStorage = TreatmentPlanStorage.getStorageInfo();
  
  return {
    assessmentCount: assessments.length,
    treatmentPlanCount: treatmentPlans.length,
    totalSize: assessmentStorage.used + treatmentPlanStorage.used,
    lastAssessmentDate: lastAssessment?.timestamp || null,
    lastTreatmentPlanDate: lastTreatmentPlan?.updatedAt || null,
  };
};
