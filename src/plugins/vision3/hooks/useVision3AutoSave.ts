import { useRef, useEffect } from 'react';
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
  const { currentPatient, patients } = usePatientStore();
  const { sessions, startSession } = useSessionStore();
  const { addAssessment, updateAssessment } = useAssessmentStore();
  const { postureReports } = useMeasurementStore();
  const currentAssessmentIdRef = useRef<string | null>(null);

  useEffect(() => {
    const saveAssessment = async () => {
      const hasReport = Boolean(auxiliaryDiagnosis || markdownReport);
      if (step === 'completed' && hasReport && !hasSavedAuxiliaryRef.current) {
        hasSavedAuxiliaryRef.current = true;
        
        try {
          const patientId = currentPatient?.id;
          if (!patientId) return;
          
          let sessionId = sessions.find(s => s.patientId === patientId)?.id;
          if (!sessionId) {
            const newSession = await startSession(patientId);
            sessionId = newSession.id;
          }
          
          // Get the latest report for current view inside useEffect
          const latestReport = postureReports.find(r => r.view === view);
          
          // Use data from latestReport if available, otherwise fall back to wsResult
          const reportMetrics = latestReport?.metrics || wsResult?.metrics;
          const reportIssues = latestReport?.issues || wsResult?.issues;
          const reportMarkdown = latestReport?.markdown || markdownReport || undefined;
          const reportAuxiliary = latestReport?.auxiliaryDiagnosis || auxiliaryDiagnosis || undefined;
          const reportTimeSeries = latestReport?.timeSeries || timeSeriesData || undefined;
          
          console.log('[useVision3AutoSave] Saving assessment with data:', {
            hasMetrics: !!reportMetrics,
            hasIssues: reportIssues && reportIssues.length > 0,
            issuesCount: reportIssues?.length || 0,
            hasMarkdown: !!reportMarkdown,
            hasAuxiliary: !!reportAuxiliary,
            hasTimeSeries: !!reportTimeSeries,
            source: latestReport ? 'latestReport' : 'wsResult'
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
          currentAssessmentIdRef.current = assessment.id;
          if (markdownReport) {
            hasSavedDeepRef.current = true;
          }
          console.log('Auxiliary assessment saved', assessment.id);
        } catch (error) {
          console.error('Failed to save auxiliary assessment:', error);
        }
      }

      if (markdownReport && !hasSavedDeepRef.current && currentAssessmentIdRef.current) {
        hasSavedDeepRef.current = true;
        try {
          // Get the latest report for current view inside useEffect
          const latestReport = postureReports.find(r => r.view === view);
          
          // Use data from latestReport if available, otherwise fall back to props
          const reportMetrics = latestReport?.metrics || wsResult?.metrics;
          const reportIssues = latestReport?.issues || wsResult?.issues;
          const reportMarkdown = latestReport?.markdown || markdownReport;
          const reportAuxiliary = latestReport?.auxiliaryDiagnosis || auxiliaryDiagnosis || undefined;
          const reportTimeSeries = latestReport?.timeSeries || timeSeriesData || undefined;
          
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
          console.log('Assessment updated with deep report');
        } catch (error) {
          console.error('Failed to update assessment with deep report:', error);
        }
      }
    };
    
    saveAssessment();
  }, [step, wsResult, markdownReport, auxiliaryDiagnosis, timeSeriesData, currentPatient, patients, sessions, startSession, addAssessment, updateAssessment, assessmentMode, view, postureReports]);

  useEffect(() => {
    if (step !== 'completed') {
      hasSavedAuxiliaryRef.current = false;
      hasSavedDeepRef.current = false;
      currentAssessmentIdRef.current = null;
    }
  }, [step]);
};
