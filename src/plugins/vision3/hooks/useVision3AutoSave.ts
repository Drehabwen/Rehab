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
  const hasSavedRef = useRef(false);
  const { currentPatient, patients } = usePatientStore();
  const { sessions, startSession } = useSessionStore();
  const { addAssessment } = useAssessmentStore();

  useEffect(() => {
    const saveAssessment = async () => {
      // Save if completed AND we have either WS results OR a markdown report
      if (step === 'completed' && (wsResult || markdownReport || auxiliaryReport) && !hasSavedRef.current) {
        hasSavedRef.current = true;
        
        try {
          let patientId = currentPatient?.id;
          
          if (!patientId) {
            if (patients.length > 0) {
              patientId = patients[0].id;
            }
          }
          
          if (!patientId) {
            console.log('No patient found, skipping assessment save');
            return;
          }
          
          let sessionId: string | undefined;
          const patientSessions = sessions.filter(s => s.patientId === patientId);
          if (patientSessions.length > 0) {
            sessionId = patientSessions[0].id;
          }
          
          if (!sessionId) {
            const newSession = await startSession(patientId);
            sessionId = newSession.id;
          }
          
          await addAssessment({
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
                markdownReport: markdownReport || auxiliaryReport || undefined,
                timeSeries: timeSeriesData || undefined
              }
            }
          });
          
          console.log('Assessment saved successfully', { hasWsResult: !!wsResult, hasMarkdownReport: !!markdownReport });
        } catch (error) {
          console.error('Failed to save assessment:', error);
        }
      }
    };
    
    saveAssessment();
  }, [step, wsResult, markdownReport, auxiliaryReport, timeSeriesData, currentPatient, patients, sessions, startSession, addAssessment, assessmentMode, view]);

  useEffect(() => {
    if (step !== 'completed') {
      hasSavedRef.current = false;
    }
  }, [step]);
};
