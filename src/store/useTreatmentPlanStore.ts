import { create } from 'zustand';
import { TreatmentPlanApi } from '../api/treatmentPlanApi';
import type { SessionTreatmentPlanRequest } from '../api/treatmentPlanApi';
import type { AssessmentRecord, TreatmentPlanVersion } from '../types/assessment';
import { TreatmentPlanStorage } from '../utils/treatmentPlanStorage';
import { AssessmentRecordStorage } from '../utils/assessmentRecordStorage';
import { APP_CONFIG } from '../config/appConfig';

interface TreatmentPlanState {
  currentContent: string;
  isGenerating: boolean;
  error: string | null;
  versions: TreatmentPlanVersion[];
  currentVersionId: string | null;
  comparingVersions: [string | null, string | null];
  assessmentRecords: AssessmentRecord[];
  linkedAssessmentId: string | null;
  linkedSessionId: string | null;
  linkedSessionReportId: string | null;
  generatePlan: (assessmentId: string, patientId: string) => Promise<void>;
  generatePlanFromSessionReport: (payload: SessionTreatmentPlanRequest) => Promise<void>;
  clearContent: () => void;
  setError: (error: string | null) => void;
  saveVersion: (content: string, assessmentId: string, patientId: string) => void;
  saveSessionReportVersion: (content: string, payload: SessionTreatmentPlanRequest) => void;
  switchVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  updateVersionTags: (versionId: string, tags: string[]) => void;
  updateVersionNotes: (versionId: string, notes: string) => void;
  startCompare: (versionId1: string | null, versionId2: string | null) => void;
  endCompare: () => void;
  linkAssessment: (planId: string, assessmentId: string) => void;
  loadAssessmentRecords: (patientId: string) => void;
  setLinkedAssessment: (assessmentId: string | null) => void;
  setLinkedSessionReport: (sessionId: string | null, sessionReportId: string | null) => void;
  setCurrentVersion: (versionId: string) => void;
}

function buildVersionBase(versionCount: number, content: string, patientId: string): TreatmentPlanVersion {
  const now = new Date().toISOString();
  return {
    id: `version_${Date.now()}_${versionCount + 1}`,
    version: versionCount + 1,
    content,
    patientId,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system',
    isCurrent: true,
  };
}

export const useTreatmentPlanStore = create<TreatmentPlanState>((set, get) => {
  const savedVersions = TreatmentPlanStorage.loadVersions();
  const currentVersion = savedVersions.find((version) => version.isCurrent);
  const patientId = APP_CONFIG.CURRENT_PATIENT_ID;
  const savedAssessmentRecords = AssessmentRecordStorage.loadRecords(patientId);

  return {
    currentContent: currentVersion?.content || '',
    isGenerating: false,
    error: null,
    versions: savedVersions,
    currentVersionId: currentVersion?.id || null,
    comparingVersions: [null, null],
    assessmentRecords: savedAssessmentRecords,
    linkedAssessmentId: currentVersion?.assessmentId || null,
    linkedSessionId: currentVersion?.sessionId || null,
    linkedSessionReportId: currentVersion?.sessionReportId || null,

    generatePlan: async (assessmentId, patientId) => {
      set({
        isGenerating: true,
        error: null,
        currentContent: '',
        linkedAssessmentId: assessmentId,
        linkedSessionId: null,
        linkedSessionReportId: null,
      });

      try {
        let fullContent = '';
        await TreatmentPlanApi.generateStream(assessmentId, patientId, (chunk) => {
          fullContent += chunk;
          set((state) => ({
            currentContent: state.currentContent + chunk,
          }));
        });

        set((state) => {
          const nextVersion: TreatmentPlanVersion = {
            ...buildVersionBase(state.versions.length, fullContent, patientId),
            assessmentId,
            sourceType: 'assessment',
          };
          const versions = state.versions.map((version) => ({ ...version, isCurrent: false })).concat(nextVersion);
          return {
            versions,
            currentVersionId: nextVersion.id,
            linkedAssessmentId: assessmentId,
            linkedSessionId: null,
            linkedSessionReportId: null,
          };
        });

        TreatmentPlanStorage.saveVersions(get().versions);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '生成康复建议失败',
        });
      } finally {
        set({ isGenerating: false });
      }
    },

    generatePlanFromSessionReport: async (payload) => {
      set({
        isGenerating: true,
        error: null,
        currentContent: '',
        linkedAssessmentId: null,
        linkedSessionId: payload.sessionId,
        linkedSessionReportId: payload.sessionReportId,
      });

      try {
        let fullContent = '';
        await TreatmentPlanApi.generateStreamFromSessionReport(payload, (chunk) => {
          fullContent += chunk;
          set((state) => ({
            currentContent: state.currentContent + chunk,
          }));
        });

        set((state) => {
          const nextVersion: TreatmentPlanVersion = {
            ...buildVersionBase(state.versions.length, fullContent, payload.patientId),
            sessionId: payload.sessionId,
            sessionReportId: payload.sessionReportId,
            sourceType: 'session-report',
          };
          const versions = state.versions.map((version) => ({ ...version, isCurrent: false })).concat(nextVersion);
          return {
            versions,
            currentVersionId: nextVersion.id,
            linkedAssessmentId: null,
            linkedSessionId: payload.sessionId,
            linkedSessionReportId: payload.sessionReportId,
          };
        });

        TreatmentPlanStorage.saveVersions(get().versions);
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '生成康复建议失败',
        });
      } finally {
        set({ isGenerating: false });
      }
    },

    clearContent: () => set({ currentContent: '', error: null }),

    setError: (error) => set({ error }),

    saveVersion: (content, assessmentId, patientId) =>
      set((state) => {
        const nextVersion: TreatmentPlanVersion = {
          ...buildVersionBase(state.versions.length, content, patientId),
          assessmentId,
          sourceType: 'assessment',
        };
        const versions = state.versions.map((version) => ({ ...version, isCurrent: false })).concat(nextVersion);
        TreatmentPlanStorage.saveVersions(versions);
        return {
          versions,
          currentVersionId: nextVersion.id,
          currentContent: content,
          linkedAssessmentId: assessmentId,
          linkedSessionId: null,
          linkedSessionReportId: null,
        };
      }),

    saveSessionReportVersion: (content, payload) =>
      set((state) => {
        const nextVersion: TreatmentPlanVersion = {
          ...buildVersionBase(state.versions.length, content, payload.patientId),
          sessionId: payload.sessionId,
          sessionReportId: payload.sessionReportId,
          sourceType: 'session-report',
        };
        const versions = state.versions.map((version) => ({ ...version, isCurrent: false })).concat(nextVersion);
        TreatmentPlanStorage.saveVersions(versions);
        return {
          versions,
          currentVersionId: nextVersion.id,
          currentContent: content,
          linkedAssessmentId: null,
          linkedSessionId: payload.sessionId,
          linkedSessionReportId: payload.sessionReportId,
        };
      }),

    switchVersion: (versionId) =>
      set((state) => {
        const version = state.versions.find((item) => item.id === versionId);
        if (!version) return state;

        const versions = state.versions.map((item) => ({
          ...item,
          isCurrent: item.id === versionId,
        }));

        TreatmentPlanStorage.saveVersions(versions);

        return {
          versions,
          currentVersionId: versionId,
          currentContent: version.content,
          linkedAssessmentId: version.assessmentId || null,
          linkedSessionId: version.sessionId || null,
          linkedSessionReportId: version.sessionReportId || null,
        };
      }),

    deleteVersion: (versionId) =>
      set((state) => {
        const versions = state.versions.filter((version) => version.id !== versionId);
        const nextCurrent = versionId === state.currentVersionId ? versions[versions.length - 1] : versions.find((version) => version.id === state.currentVersionId) || null;
        const finalVersions = versions.map((version) => ({
          ...version,
          isCurrent: version.id === nextCurrent?.id,
        }));

        TreatmentPlanStorage.saveVersions(finalVersions);

        return {
          versions: finalVersions,
          currentVersionId: nextCurrent?.id || null,
          currentContent: nextCurrent?.content || '',
          linkedAssessmentId: nextCurrent?.assessmentId || null,
          linkedSessionId: nextCurrent?.sessionId || null,
          linkedSessionReportId: nextCurrent?.sessionReportId || null,
        };
      }),

    updateVersionTags: (versionId, tags) =>
      set((state) => {
        const versions = state.versions.map((version) =>
          version.id === versionId ? { ...version, tags, updatedAt: new Date().toISOString() } : version,
        );
        TreatmentPlanStorage.saveVersions(versions);
        return { versions };
      }),

    updateVersionNotes: (versionId, notes) =>
      set((state) => {
        const versions = state.versions.map((version) =>
          version.id === versionId ? { ...version, notes, updatedAt: new Date().toISOString() } : version,
        );
        TreatmentPlanStorage.saveVersions(versions);
        return { versions };
      }),

    startCompare: (versionId1, versionId2) => set({ comparingVersions: [versionId1, versionId2] }),

    endCompare: () => set({ comparingVersions: [null, null] }),

    linkAssessment: (planId, assessmentId) =>
      set((state) => {
        const versions = state.versions.map((version) => {
          if (version.id !== planId) {
            return version;
          }

          const assessmentRecord = state.assessmentRecords.find((record) => record.id === assessmentId);
          return {
            ...version,
            assessmentId,
            assessmentData: assessmentRecord,
            updatedAt: new Date().toISOString(),
          };
        });

        const assessmentRecords = state.assessmentRecords.map((record) =>
          record.id === assessmentId ? { ...record, treatmentPlanId: planId } : record,
        );

        TreatmentPlanStorage.saveVersions(versions);

        const updatedRecord = assessmentRecords.find((record) => record.id === assessmentId);
        if (updatedRecord) {
          AssessmentRecordStorage.saveRecord(updatedRecord);
        }

        return {
          versions,
          assessmentRecords,
          linkedAssessmentId: assessmentId,
          linkedSessionId: null,
          linkedSessionReportId: null,
        };
      }),

    loadAssessmentRecords: (patientId) => {
      set({ assessmentRecords: AssessmentRecordStorage.loadRecords(patientId) });
    },

    setLinkedAssessment: (assessmentId) =>
      set({
        linkedAssessmentId: assessmentId,
        linkedSessionId: null,
        linkedSessionReportId: null,
      }),

    setLinkedSessionReport: (sessionId, sessionReportId) =>
      set({
        linkedAssessmentId: null,
        linkedSessionId: sessionId,
        linkedSessionReportId: sessionReportId,
      }),

    setCurrentVersion: (versionId) => set({ currentVersionId: versionId }),
  };
});
