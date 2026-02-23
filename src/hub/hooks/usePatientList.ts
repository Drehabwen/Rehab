import { useMemo } from 'react';
import { getRelativeTime } from '@/lib/session-utils';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import { PatientStatus } from '../types';

export interface PatientWithStatus extends Patient {
  status: PatientStatus;
  lastSession?: Session;
}

interface UsePatientListOptions {
  patients: Patient[];
  getPatientSessions: (patientId: string) => Session[];
}

export function usePatientList({ patients, getPatientSessions }: UsePatientListOptions) {
  const patientsWithStatus = useMemo<PatientWithStatus[]>(() => {
    return patients.map(patient => {
      const patientSessions = getPatientSessions(patient.id);
      const lastSession = patientSessions[0];

      let status: PatientStatus = 'pending';
      if (lastSession) {
        if (lastSession.status === 'completed') {
          status = 'completed';
        } else if (lastSession.assessments && lastSession.assessments.length > 0) {
          status = 'report';
        } else {
          status = 'assessing';
        }
      }

      return { ...patient, status, lastSession };
    });
  }, [patients, getPatientSessions]);

  const stats = useMemo(() => ({
    pending: patientsWithStatus.filter(p => p.status === 'pending').length,
    assessing: patientsWithStatus.filter(p => p.status === 'assessing').length,
    report: patientsWithStatus.filter(p => p.status === 'report').length,
    completed: patientsWithStatus.filter(p => p.status === 'completed').length,
  }), [patientsWithStatus]);

  return {
    patientsWithStatus,
    stats,
    getPatientLabel: (patient: PatientWithStatus) => 
      patient.lastSession 
        ? `最近：${getRelativeTime(patient.lastSession.createdAt)}`
        : '尚未创建接诊记录'
  };
}

export function getStatusLabel(status: PatientStatus): string {
  const labels: Record<PatientStatus, string> = {
    pending: '待接诊',
    assessing: '评估中',
    report: '待报告',
    completed: '已完成'
  };
  return labels[status];
}

export function getStatusColor(status: PatientStatus): string {
  const colors: Record<PatientStatus, string> = {
    pending: 'bg-slate-100 text-slate-600',
    assessing: 'bg-blue-50 text-blue-600',
    report: 'bg-amber-50 text-amber-600',
    completed: 'bg-emerald-50 text-emerald-600'
  };
  return colors[status];
}
