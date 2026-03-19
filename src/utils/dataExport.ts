import type { AssessmentRecord, TreatmentPlanVersion } from '../types/assessment';
import { ScreeningRecordStorage } from './assessmentRecordStorage';
import { InterventionPlanStorage } from './treatmentPlanStorage';

export interface PatientArchiveExport {
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

export const exportPatientArchive = (patientId: string): string => {
  const assessments = ScreeningRecordStorage.loadRecords(patientId);
  const treatmentPlans = InterventionPlanStorage.loadVersions();

  const exportData: PatientArchiveExport = {
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

export const importPatientArchive = (jsonStr: string, patientId: string): boolean => {
  try {
    const data = JSON.parse(jsonStr);

    if (!data.assessments || !Array.isArray(data.assessments)) {
      throw new Error('无效的筛查记录数据。');
    }

    if (!data.treatmentPlans || !Array.isArray(data.treatmentPlans)) {
      throw new Error('无效的干预建议数据。');
    }

    const assessments: AssessmentRecord[] = data.assessments.map((record: Record<string, unknown>) => ({
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

    const treatmentPlans: TreatmentPlanVersion[] = data.treatmentPlans.map((plan: Record<string, unknown>) => ({
      id: String(plan.id),
      version: Number(plan.version),
      content: String(plan.content ?? ''),
      assessmentId: plan.assessmentId as string | undefined,
      sessionId: plan.sessionId as string | undefined,
      sessionReportId: plan.sessionReportId as string | undefined,
      sourceType: (plan.sourceType as TreatmentPlanVersion['sourceType']) || (plan.sessionReportId ? 'session-report' : 'assessment'),
      patientId,
      createdAt: String(plan.createdAt),
      updatedAt: String(plan.updatedAt),
      createdBy: String(plan.createdBy ?? 'imported'),
      tags: Array.isArray(plan.tags) ? (plan.tags as string[]) : [],
      notes: String(plan.notes ?? ''),
      isCurrent: Boolean(plan.isCurrent),
    }));

    const recordsImported = ScreeningRecordStorage.importArchive(
      JSON.stringify({
        version: '1.0',
        patientId,
        exportDate: new Date().toISOString(),
        records: assessments,
      }),
      patientId,
    );

    const plansImported = InterventionPlanStorage.importArchive(
      JSON.stringify({
        version: '1.0',
        versions: treatmentPlans,
        lastUpdated: new Date().toISOString(),
      }),
    );

    return recordsImported && plansImported;
  } catch (error) {
    console.error('导入患者归档失败:', error);
    return false;
  }
};

export const downloadPatientArchive = (patientId: string, filename?: string): void => {
  const data = exportPatientArchive(patientId);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename || `patient_archive_${patientId}_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

export const uploadPatientArchive = (file: File, patientId: string): Promise<boolean> =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      resolve(importPatientArchive(content, patientId));
    };
    reader.onerror = () => {
      console.error('读取归档文件失败。');
      resolve(false);
    };
    reader.readAsText(file);
  });

export const validatePatientArchive = (jsonStr: string): { valid: boolean; error?: string } => {
  try {
    const data = JSON.parse(jsonStr);

    if (!data.version) {
      return { valid: false, error: '缺少版本信息。' };
    }

    if (!data.assessments || !Array.isArray(data.assessments)) {
      return { valid: false, error: '缺少有效的筛查记录。' };
    }

    if (!data.treatmentPlans || !Array.isArray(data.treatmentPlans)) {
      return { valid: false, error: '缺少有效的干预建议。' };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : '归档数据解析失败。',
    };
  }
};

export const getPatientArchiveSummary = (patientId: string): {
  assessmentCount: number;
  treatmentPlanCount: number;
  totalSize: number;
  lastAssessmentDate: string | null;
  lastTreatmentPlanDate: string | null;
} => {
  const assessments = ScreeningRecordStorage.loadRecords(patientId);
  const treatmentPlans = InterventionPlanStorage.loadVersions();
  const lastAssessment = assessments.length > 0 ? assessments[assessments.length - 1] : null;
  const lastTreatmentPlan = treatmentPlans.length > 0 ? treatmentPlans[treatmentPlans.length - 1] : null;
  const assessmentStorage = ScreeningRecordStorage.getStorageInfo(patientId);
  const treatmentPlanStorage = InterventionPlanStorage.getStorageInfo();

  return {
    assessmentCount: assessments.length,
    treatmentPlanCount: treatmentPlans.length,
    totalSize: assessmentStorage.used + treatmentPlanStorage.used,
    lastAssessmentDate: lastAssessment?.timestamp || null,
    lastTreatmentPlanDate: lastTreatmentPlan?.updatedAt || null,
  };
};

export type PatientDataExport = PatientArchiveExport;
export const exportPatientData = exportPatientArchive;
export const importPatientData = importPatientArchive;
export const downloadPatientData = downloadPatientArchive;
export const uploadPatientData = uploadPatientArchive;
export const validatePatientData = validatePatientArchive;
export const getPatientDataSummary = getPatientArchiveSummary;
