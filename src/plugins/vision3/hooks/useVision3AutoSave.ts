import { useEffect, useRef } from 'react';
import { PostureMetrics, PostureIssue } from '@/hooks/usePostureWS';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import type { TemporalAnalysis } from '@/lib/posture-processor';
import { AssessmentMode } from '../components/Vision3CameraStage';

interface UseVision3AutoSaveProps {
  step: string;
  wsResult: { metrics: PostureMetrics; issues: PostureIssue[] } | null;
  assessmentMode: AssessmentMode;
  view: 'front' | 'side' | 'back';
  markdownReport?: string | null;
  auxiliaryDiagnosis?: string | null;
  timeSeriesData?: TemporalAnalysis['timeSeries'] | null;
  immediateQuickResult?: { metrics: PostureMetrics; issues: PostureIssue[]; timestamp: number } | null;
  immediateQuickReport?: string | null;
  immediateQuickTimeSeries?: TemporalAnalysis['timeSeries'] | null;
}

interface PersistedPosturePayload {
  metrics?: PostureMetrics;
  issues?: PostureIssue[];
  markdownReport?: string;
  auxiliaryDiagnosis?: string;
  timeSeries?: TemporalAnalysis['timeSeries'];
}

const hasStructuredMetrics = (metrics?: PostureMetrics | null) =>
  Boolean(
    metrics && Object.values(metrics).some((value) => typeof value === 'number' && Number.isFinite(value)),
  );

export const useVision3AutoSave = ({
  step,
  wsResult,
  assessmentMode,
  view,
  markdownReport,
  auxiliaryDiagnosis,
  timeSeriesData,
  immediateQuickResult,
  immediateQuickReport,
  immediateQuickTimeSeries,
}: UseVision3AutoSaveProps) => {
  const isCreatingAssessmentRef = useRef(false);
  const isUpdatingAssessmentRef = useRef(false);
  const persistedSnapshotRef = useRef<string | null>(null);
  const currentAssessmentIdRef = useRef<string | null>(null);
  const { currentPatient } = usePatientStore();
  const { currentSession, sessions, startSession } = useSessionStore();
  const { addAssessment, updateAssessment } = useAssessmentStore();
  const { postureReports } = useMeasurementStore();

  const pickLatestReport = () => (
    postureReports.find((report) => report.view === view && (report.markdown || report.auxiliaryDiagnosis || report.metrics || (report.issues?.length ?? 0) > 0))
    ?? postureReports.find((report) => report.markdown || report.auxiliaryDiagnosis || report.metrics || (report.issues?.length ?? 0) > 0)
    ?? null
  );

  useEffect(() => {
    const persistAssessment = async () => {
      if (step !== 'completed') {
        return;
      }

      const patientId = currentPatient?.id;
      if (!patientId) {
        return;
      }

      const latestReport = pickLatestReport();
      const reportMetrics = wsResult?.metrics || immediateQuickResult?.metrics || latestReport?.metrics;
      const reportIssues = wsResult?.issues || immediateQuickResult?.issues || latestReport?.issues;
      const reportMarkdown = markdownReport || latestReport?.markdown || undefined;
      const reportAuxiliary = auxiliaryDiagnosis || immediateQuickReport || latestReport?.auxiliaryDiagnosis || undefined;
      const reportTimeSeries = timeSeriesData || immediateQuickTimeSeries || latestReport?.timeSeries || undefined;

      const hasPersistablePayload = Boolean(
        reportMarkdown
        || reportAuxiliary
        || hasStructuredMetrics(reportMetrics)
        || (reportIssues?.length ?? 0) > 0,
      );

      if (!hasPersistablePayload) {
        return;
      }

      const posturePayload: PersistedPosturePayload = {
        metrics: reportMetrics,
        issues: reportIssues,
        markdownReport: reportMarkdown,
        auxiliaryDiagnosis: reportAuxiliary,
        timeSeries: reportTimeSeries,
      };
      const snapshot = JSON.stringify(posturePayload);

      if (!currentAssessmentIdRef.current) {
        if (isCreatingAssessmentRef.current) {
          return;
        }

        try {
          isCreatingAssessmentRef.current = true;

          let sessionId =
            (currentSession?.patientId === patientId ? currentSession.id : undefined)
            ?? sessions.find((session) => session.patientId === patientId)?.id;

          if (!sessionId) {
            const newSession = await startSession(patientId);
            sessionId = newSession.id;
          }

          const assessment = await addAssessment({
            sessionId,
            patientId,
            type: 'posture',
            mode: assessmentMode,
            data: {
              posture: {
                mode: assessmentMode,
                view,
                metrics: reportMetrics,
                issues: reportIssues,
                confidence: 0.85,
                auxiliaryDiagnosis: reportAuxiliary,
                markdownReport: reportMarkdown,
                timeSeries: reportTimeSeries,
              },
            },
          });

          currentAssessmentIdRef.current = assessment.id;
          persistedSnapshotRef.current = snapshot;
          console.log('[useVision3AutoSave] Saved posture assessment', assessment.id);
        } catch (error) {
          console.error('Failed to save posture assessment:', error);
        } finally {
          isCreatingAssessmentRef.current = false;
        }

        return;
      }

      if (snapshot === persistedSnapshotRef.current || isUpdatingAssessmentRef.current) {
        return;
      }

      try {
        isUpdatingAssessmentRef.current = true;

        await updateAssessment(currentAssessmentIdRef.current, {
          data: {
            posture: {
              mode: assessmentMode,
              view,
              metrics: reportMetrics,
              issues: reportIssues,
              confidence: 0.85,
              markdownReport: reportMarkdown,
              auxiliaryDiagnosis: reportAuxiliary,
              timeSeries: reportTimeSeries,
            },
          },
        });

        persistedSnapshotRef.current = snapshot;
        console.log('[useVision3AutoSave] Updated posture assessment', currentAssessmentIdRef.current);
      } catch (error) {
        console.error('Failed to update posture assessment:', error);
      } finally {
        isUpdatingAssessmentRef.current = false;
      }
    };

    void persistAssessment();
  }, [
    step,
    wsResult,
    immediateQuickResult,
    markdownReport,
    auxiliaryDiagnosis,
    immediateQuickReport,
    timeSeriesData,
    immediateQuickTimeSeries,
    currentPatient,
    currentSession,
    sessions,
    startSession,
    addAssessment,
    updateAssessment,
    assessmentMode,
    view,
    postureReports,
  ]);

  useEffect(() => {
    if (step !== 'completed') {
      isCreatingAssessmentRef.current = false;
      isUpdatingAssessmentRef.current = false;
      persistedSnapshotRef.current = null;
      currentAssessmentIdRef.current = null;
    }
  }, [step]);
};
