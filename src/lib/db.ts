import Dexie, { Table } from 'dexie';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import type { Assessment } from '@/types/assessment';

export class RehabDatabase extends Dexie {
  patients!: Table<Patient, string>;
  sessions!: Table<Session, string>;
  assessments!: Table<Assessment, string>;

  constructor() {
    super('RehabDatabase');
    
    this.version(1).stores({
      patients: 'id, name, createdAt',
      sessions: 'id, patientId, sequence, createdAt, [patientId+createdAt]',
      assessments: 'id, sessionId, type, createdAt, [sessionId+createdAt]'
    });
  }
}

export const db = new RehabDatabase();
