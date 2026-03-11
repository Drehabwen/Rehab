import { useMemo } from 'react';
import { getRelativeTime } from '@/lib/session-utils';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import type { Assessment } from '@/types/assessment';
import type { PatientStatus } from '../types';
import { buildVisitTaskList, type VisitTaskSummary } from '../workflow';

export interface PatientWithStatus extends Patient {
  status: PatientStatus;
  lastSession?: Session;
  visitTask: VisitTaskSummary;
}

interface UsePatientListOptions {
  patients: Patient[];
  assessments: Assessment[];
  getPatientSessions: (patientId: string) => Session[];
}

export function usePatientList({ patients, assessments, getPatientSessions }: UsePatientListOptions) {
  const visitTasks = useMemo(
    () => buildVisitTaskList(patients, getPatientSessions, assessments),
    [patients, getPatientSessions, assessments],
  );

  const taskByPatientId = useMemo(() => {
    const map = new Map<string, VisitTaskSummary>();
    visitTasks.forEach((task) => map.set(task.patient.id, task));
    return map;
  }, [visitTasks]);

  const patientsWithStatus = useMemo<PatientWithStatus[]>(() => {
    return patients.map((patient) => {
      const patientSessions = getPatientSessions(patient.id);
      const lastSession = [...patientSessions].sort((left, right) => right.createdAt - left.createdAt)[0];
      const visitTask = taskByPatientId.get(patient.id) ?? buildVisitTaskList([patient], getPatientSessions, assessments)[0];

      const status: PatientStatus = visitTask.reportReady
        ? 'completed'
        : visitTask.hasAnyAssessment
          ? 'assessing'
          : 'pending';

      return { ...patient, status, lastSession, visitTask };
    });
  }, [patients, getPatientSessions, taskByPatientId, assessments]);

  const stats = useMemo(() => ({
    totalPatients: visitTasks.length,
    pending: visitTasks.filter((task) => task.status === 'pending').length,
    inProgress: visitTasks.filter((task) => task.completedModules > 0 && task.completedModules < task.totalModules).length,
    readyForReport: visitTasks.filter((task) => task.reportReady).length,
    completed: visitTasks.filter((task) => task.reportReady).length,
  }), [visitTasks]);

  return {
    patientsWithStatus,
    visitTasks,
    stats,
    getVisitTaskByPatientId: (patientId: string) => taskByPatientId.get(patientId) ?? null,
    getPatientLabel: (patient: PatientWithStatus) =>
      patient.lastSession
        ? `最近接诊：${getRelativeTime(patient.lastSession.createdAt)}`
        : '尚未开始接诊',
  };
}

export function getStatusLabel(status: PatientStatus): string {
  const labels: Record<PatientStatus, string> = {
    pending: '待接诊',
    assessing: '评估中',
    report: '待报告',
    completed: '已完成',
  };
  return labels[status];
}

export function getStatusColor(status: PatientStatus): string {
  const colors: Record<PatientStatus, string> = {
    pending: 'bg-slate-100 text-slate-600',
    assessing: 'bg-blue-50 text-blue-600',
    report: 'bg-amber-50 text-amber-600',
    completed: 'bg-emerald-50 text-emerald-600',
  };
  return colors[status];
}
