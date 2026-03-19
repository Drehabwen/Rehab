import type { Assessment } from '@/types/assessment';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import { generateSessionId } from '@/lib/session-utils';

export type WorkflowToolId = 'vision3' | 'rom' | 'medvoice' | 'training_plan';
export type WorkflowStatus = 'completed' | 'pending';

export interface WorkflowModuleDefinition {
  toolId: WorkflowToolId;
  assessmentType: Assessment['type'] | 'plan';
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
    title: '体态监控',
    shortTitle: '体态',
    description: '识别体态偏移、运动稳定性风险和关键异常指标。',
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
    title: '疲劳问询',
    shortTitle: '问询',
    description: '通过语音交互完成主观疲劳问询并记录运动员感受。',
  },
  {
    toolId: 'training_plan',
    assessmentType: 'plan',
    title: '个性化训练计划',
    shortTitle: '计划',
    description: '基于监控数据生成针对性的运动训练与恢复计划（支持青少年专项）。',
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
  const visitId = latestSession?.id ?? generateSessionId(patient.id, sessionSequence);

  const modules = WORKFLOW_MODULES.map<WorkflowModuleSummary>((module) => {
    // For training_plan, we check if a plan has been generated (this might need a separate check, but for now we'll mock it or use a specific assessment type if exists)
    const moduleAssessments = activeAssessments.filter((assessment) => assessment.type === module.assessmentType);
    const latestAssessment = moduleAssessments[0] ?? null;
    const completed = Boolean(latestAssessment);

    return {
      ...module,
      status: completed ? 'completed' : 'pending',
      assessmentCount: moduleAssessments.length,
      latestAssessment,
      latestCreatedAt: latestAssessment?.createdAt ?? null,
      actionLabel: module.toolId === 'training_plan' ? (completed ? '查看计划' : '生成计划') : (completed ? '查看分析' : '开始监控'),
    };
  });

  const completedModules = modules.filter((module) => module.status === 'completed').length;
  const totalModules = modules.length;
  const hasAnyAssessment = completedModules > 0;
  const reportReady = completedModules === totalModules && totalModules > 0;

  return {
    patient,
    patientName: patient.name || `运动员 ${patient.id}`,
    visitId,
    sessionId: latestSession?.id ?? null,
    sessionSequence,
    status: reportReady ? 'completed' : 'pending',
    completedModules,
    totalModules,
    progressRatio: totalModules === 0 ? 0 : completedModules / totalModules,
    reportReady,
    hasSession: Boolean(latestSession),
    hasAnyAssessment,
    updatedAt: latestSession?.updatedAt ?? patient.updatedAt,
    nextStep: reportReady ? '进入报告中心' : hasAnyAssessment ? '继续完成监控' : '开始分析监控数据',
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
