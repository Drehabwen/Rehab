import { useRef, useEffect } from 'react';
import { PostureMetrics, PostureIssue } from '@/hooks/usePostureWS';
import { usePatientStore } from '@/store/usePatientStore';
import { useSessionStore } from '@/store/useSessionStore';
import { useAssessmentStore } from '@/store/useAssessmentStore';
import type { TemporalAnalysis } from '@/lib/posture-processor';
import { AssessmentMode } from '../components/Vision3CameraStage';

interface UseVision3AutoSaveProps {
  step: string;
  wsResult: { metrics: PostureMetrics; issues: PostureIssue[] } | null;
  assessmentMode: AssessmentMode;
  view: 'front' | 'side' | 'back';
  /** 深度报告 - LLM解析的报告 */
  markdownReport?: string | null;
  /** 基础报告 - 根据规则得出的结论 */
  auxiliaryDiagnosis?: string | null;
  timeSeriesData?: TemporalAnalysis['timeSeries'] | null;
}

export const useVision3AutoSave = ({
  step,
  wsResult,
  assessmentMode,
  view,
  markdownReport,
  auxiliaryDiagnosis,
  timeSeriesData
}: UseVision3AutoSaveProps) => {
  const hasSavedAuxiliaryRef = useRef(false);
  const hasSavedDeepRef = useRef(false);
  const isSavingAuxiliaryRef = useRef(false);
  const isSavingDeepRef = useRef(false);
  const { currentPatient, patients } = usePatientStore();
  const { currentSession, sessions, startSession } = useSessionStore();
  const { addAssessment, updateAssessment, currentAssessment } = useAssessmentStore();
  const currentAssessmentIdRef = useRef<string | null>(null);

  useEffect(() => {
    const saveAssessment = async () => {
      const hasReport = Boolean(auxiliaryDiagnosis || markdownReport);
      const patientId = currentPatient?.id;
      if (!patientId) return;

      if (
        step === 'completed'
        && hasReport
        && !hasSavedAuxiliaryRef.current
        && !isSavingAuxiliaryRef.current
      ) {
        try {
          isSavingAuxiliaryRef.current = true;
          
          let sessionId =
            (currentSession?.patientId === patientId ? currentSession.id : undefined)
            ?? sessions.find((session) => session.patientId === patientId)?.id;
          if (!sessionId) {
            const newSession = await startSession(patientId);
            sessionId = newSession.id;
          }
          
          const existingPosture = currentAssessment?.patientId === patientId ? currentAssessment?.data?.posture : undefined;
          
          // Merge incoming props with existing posture assessment data if present
          const reportMetrics = wsResult?.metrics || existingPosture?.metrics;
          const reportIssues = wsResult?.issues || existingPosture?.issues;
          const reportMarkdown = markdownReport || existingPosture?.markdownReport || undefined;
          const reportAuxiliary = auxiliaryDiagnosis || existingPosture?.auxiliaryDiagnosis || undefined;
          const reportTimeSeries = timeSeriesData || existingPosture?.timeSeries || undefined;
          
          console.log('[useVision3AutoSave] Saving assessment with data:', {
            hasMetrics: !!reportMetrics,
            hasIssues: reportIssues && reportIssues.length > 0,
            issuesCount: reportIssues?.length || 0,
            hasMarkdown: !!reportMarkdown,
            hasAuxiliary: !!reportAuxiliary,
            hasTimeSeries: !!reportTimeSeries,
            hasExistingPosture: !!existingPosture
          });
          
          const assessment = await addAssessment({
            sessionId,
            patientId,
            type: 'posture',
            mode: assessmentMode,
            data: {
              posture: {
                mode: assessmentMode,
                view: view,
                metrics: reportMetrics,
                issues: reportIssues,
                confidence: 0.85,
                auxiliaryDiagnosis: reportAuxiliary,
                markdownReport: reportMarkdown,
                timeSeries: reportTimeSeries
              }
            }
          });
          hasSavedAuxiliaryRef.current = true;
          currentAssessmentIdRef.current = assessment.id;
          if (markdownReport) {
            hasSavedDeepRef.current = true;
          }
          console.log('Auxiliary assessment saved', assessment.id);
        } catch (error) {
          console.error('Failed to save auxiliary assessment:', error);
        } finally {
          isSavingAuxiliaryRef.current = false;
        }
      }

      if (
        markdownReport
        && !hasSavedDeepRef.current
        && currentAssessmentIdRef.current
        && !isSavingDeepRef.current
      ) {
        isSavingDeepRef.current = true;
        try {
          const existingPosture = currentAssessment?.patientId === patientId ? currentAssessment?.data?.posture : undefined;
          
          const reportMetrics = wsResult?.metrics || existingPosture?.metrics;
          const reportIssues = wsResult?.issues || existingPosture?.issues;
          const reportMarkdown = markdownReport || existingPosture?.markdownReport;
          const reportAuxiliary = auxiliaryDiagnosis || existingPosture?.auxiliaryDiagnosis || undefined;
          const reportTimeSeries = timeSeriesData || existingPosture?.timeSeries || undefined;
          
          await updateAssessment(currentAssessmentIdRef.current, {
            data: {
              posture: {
                mode: assessmentMode,
                view: view,
                metrics: reportMetrics,
                issues: reportIssues,
                confidence: 0.85,
                markdownReport: reportMarkdown,
                auxiliaryDiagnosis: reportAuxiliary,
                timeSeries: reportTimeSeries
              }
            }
          });
          hasSavedDeepRef.current = true;
          console.log('Assessment updated with deep report');
        } catch (error) {
          console.error('Failed to update assessment with deep report:', error);
        } finally {
          isSavingDeepRef.current = false;
        }
      }
    };
    
    saveAssessment();
  }, [step, wsResult, markdownReport, auxiliaryDiagnosis, timeSeriesData, currentPatient, patients, currentSession, sessions, startSession, addAssessment, updateAssessment, assessmentMode, view, currentAssessment]);

  useEffect(() => {
    if (step !== 'completed') {
      hasSavedAuxiliaryRef.current = false;
      hasSavedDeepRef.current = false;
      isSavingAuxiliaryRef.current = false;
      isSavingDeepRef.current = false;
      currentAssessmentIdRef.current = null;
    }
  }, [step]);
};
