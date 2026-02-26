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
  markdownReport?: string | null;
  auxiliaryReport?: string | null;
  timeSeriesData?: TemporalAnalysis['timeSeries'] | null;
}

export const useVision3AutoSave = ({
  step,
  wsResult,
  assessmentMode,
  view,
  markdownReport,
  auxiliaryReport,
  timeSeriesData
}: UseVision3AutoSaveProps) => {
  const hasSavedAuxiliaryRef = useRef(false);
  const hasSavedDeepRef = useRef(false);
  const { currentPatient, patients } = usePatientStore();
  const { sessions, startSession } = useSessionStore();
  const { addAssessment, updateAssessment } = useAssessmentStore();
  const currentAssessmentIdRef = useRef<string | null>(null);

  useEffect(() => {
    const saveAssessment = async () => {
      // Step 1: Save auxiliary report as soon as it's available
      if (step === 'completed' && auxiliaryReport && !hasSavedAuxiliaryRef.current) {
        hasSavedAuxiliaryRef.current = true;
        
        try {
          const patientId = currentPatient?.id || patients[0]?.id;
          if (!patientId) return;
          
          let sessionId = sessions.find(s => s.patientId === patientId)?.id;
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
                view: view,
                metrics: wsResult?.metrics,
                issues: wsResult?.issues,
                confidence: 0.85,
                auxiliaryReport: auxiliaryReport,
                timeSeries: timeSeriesData || undefined
              }
            }
          });
          currentAssessmentIdRef.current = assessment.id;
          console.log('Auxiliary assessment saved', assessment.id);
        } catch (error) {
          console.error('Failed to save auxiliary assessment:', error);
        }
      }

      // Step 2: Update with deep report when it arrives
      if (markdownReport && !hasSavedDeepRef.current && currentAssessmentIdRef.current) {
        hasSavedDeepRef.current = true;
        try {
          await updateAssessment(currentAssessmentIdRef.current, {
            data: {
              posture: {
                mode: assessmentMode,
                view: view,
                metrics: wsResult?.metrics,
                issues: wsResult?.issues,
                confidence: 0.85,
                markdownReport: markdownReport,
                auxiliaryReport: auxiliaryReport || undefined,
                timeSeries: timeSeriesData || undefined
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
  }, [step, wsResult, markdownReport, auxiliaryReport, timeSeriesData, currentPatient, patients, sessions, startSession, addAssessment, updateAssessment, assessmentMode, view]);

  useEffect(() => {
    if (step !== 'completed') {
      hasSavedAuxiliaryRef.current = false;
      hasSavedDeepRef.current = false;
      currentAssessmentIdRef.current = null;
    }
  }, [step]);
};
