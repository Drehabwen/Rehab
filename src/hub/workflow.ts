import type { Assessment } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import { generateSessionId } from '@/lib/session-utils';
import { getPatientPublicCode } from '@/lib/patient-utils';

export type WorkflowToolId = 'vision3' | 'rom' | 'medvoice' | 'scale';
export type WorkflowStatus = 'completed' | 'pending';

export interface WorkflowModuleDefinition {
  toolId: WorkflowToolId;
  assessmentType: Assessment['type'];
  title: string;
  shortTitle: string;
  description: string;
}

export interface WorkflowModuleSummary extends WorkflowModuleDefinition {
  status: WorkflowStatus;
  assessmentCount: number;
  latestAssessment: Assessment | null;
  latestCreatedAt: number | null;
  actionLabel: string;
}

export interface VisitTaskSummary {
  patient: Patient;
  patientName: string;
  visitId: string;
  sessionId: string | null;
  sessionSequence: number;
  status: WorkflowStatus;
  completedModules: number;
  totalModules: number;
  progressRatio: number;
  reportReady: boolean;
  hasSession: boolean;
  hasAnyAssessment: boolean;
  updatedAt: number;
  nextStep: string;
  modules: WorkflowModuleSummary[];
}

export const WORKFLOW_MODULES: WorkflowModuleDefinition[] = [
  {
    toolId: 'vision3',
    assessmentType: 'posture',
    title: '体态评估',
    shortTitle: '体态',
    description: '识别体态偏移、稳定性风险和关键异常指标。',
  },
  {
    toolId: 'rom',
    assessmentType: 'rom',
    title: 'ROM 评估',
    shortTitle: 'ROM',
    description: '记录关节活动范围，确认受限方向和左右差异。',
  },
  {
    toolId: 'medvoice',
    assessmentType: 'medvoice',
    title: '语音问诊',
    shortTitle: '问诊',
    description: '完成语音问诊并生成结构化病史信息。',
  },
  {
    toolId: 'scale',
    assessmentType: 'scale',
    title: '量表评估',
    shortTitle: '量表',
    description: '通过临床量表(SRS-22/ODI/VAS/MBI/Berg/MMT/MAS)评估主观平衡、肌力、痉挛、疼痛与自理能力。',
  },
];

const sortSessions = (sessions: Session[]) => [...sessions].sort((left, right) => right.createdAt - left.createdAt);
const sortAssessments = (assessments: Assessment[]) => [...assessments].sort((left, right) => right.createdAt - left.createdAt);

export function buildVisitTaskSummary(
  patient: Patient,
  sessions: Session[],
  assessments: Assessment[],
): VisitTaskSummary {
  const orderedSessions = sortSessions(sessions);
  const latestSession = orderedSessions[0] ?? null;
  const activeAssessments = latestSession
    ? sortAssessments(assessments.filter((assessment) => assessment.sessionId === latestSession.id))
    : [];

  const sessionSequence = latestSession?.sequence ?? 1;
  const patientCode = getPatientPublicCode(patient);
  const visitId = latestSession?.id ?? generateSessionId(patientCode, sessionSequence);

  const modules = WORKFLOW_MODULES.map<WorkflowModuleSummary>((module) => {
    const moduleAssessments = activeAssessments.filter((assessment) => assessment.type === module.assessmentType);
    const latestAssessment = moduleAssessments[0] ?? null;
    const completed = Boolean(latestAssessment);

    return {
      ...module,
      status: completed ? 'completed' : 'pending',
      assessmentCount: moduleAssessments.length,
      latestAssessment,
      latestCreatedAt: latestAssessment?.createdAt ?? null,
      actionLabel: completed ? '查看结果' : '开始评估',
    };
  });

  const completedModules = modules.filter((module) => module.status === 'completed').length;
  const totalModules = modules.length;
  const hasAnyAssessment = completedModules > 0;
  const reportReady = completedModules === totalModules && totalModules > 0;
  const isSessionCompleted = latestSession?.status === 'completed';

  return {
    patient,
    patientName: patient.name || `患者 ${patientCode}`,
    visitId,
    sessionId: latestSession?.id ?? null,
    sessionSequence,
    status: isSessionCompleted ? 'completed' : (reportReady ? 'completed' : 'pending'),
    completedModules,
    totalModules,
    progressRatio: totalModules === 0 ? 0 : completedModules / totalModules,
    reportReady: isSessionCompleted || reportReady,
    hasSession: Boolean(latestSession),
    hasAnyAssessment,
    updatedAt: latestSession?.updatedAt ?? patient.updatedAt,
    nextStep: isSessionCompleted
      ? '进入报告中心查看报告与居家处方'
      : reportReady
      ? '进入报告中心'
      : hasAnyAssessment
      ? '继续完成评估'
      : '创建接诊并开始评估',
    modules,
  };
}

export function buildVisitTaskList(
  patients: Patient[],
  getPatientSessions: (patientId: string) => Session[],
  assessments: Assessment[],
): VisitTaskSummary[] {
  return patients
    .map((patient) => buildVisitTaskSummary(
      patient,
      getPatientSessions(patient.id),
      assessments.filter((assessment) => assessment.patientId === patient.id),
    ))
    .sort((left, right) => right.updatedAt - left.updatedAt);
}
