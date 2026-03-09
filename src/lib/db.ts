import Dexie, { Table } from 'dexie';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import type { Assessment } from '@/types/assessment';
import type { SessionReportOutput } from '@/types/report-center';

export class RehabDatabase extends Dexie {
  patients!: Table<Patient, string>;
  sessions!: Table<Session, string>;
  assessments!: Table<Assessment, string>;
  sessionReports!: Table<SessionReportOutput, string>;

  constructor() {
    super('RehabDatabase');
    
    this.version(2).stores({
      patients: 'id, name, createdAt',
      sessions: 'id, patientId, sequence, createdAt, [patientId+createdAt]',
      assessments: 'id, sessionId, patientId, type, mode, status, createdAt, [patientId+createdAt], [patientId+status]'
    });

    this.version(3).stores({
      patients: 'id, name, createdAt',
      sessions: 'id, patientId, sequence, createdAt, [patientId+createdAt]',
      assessments: 'id, sessionId, patientId, type, mode, status, createdAt, [patientId+createdAt], [patientId+status]',
      sessionReports: 'id, sessionId, patientId, createdAt, [patientId+createdAt], [sessionId+createdAt]',
    });
  }
}

export const db = new RehabDatabase();
