import type { Assessment } from './assessment';

export interface Session {
  id: string;
  patientId: string;
  sequence: number;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  assessments: Assessment[];
  status: 'active' | 'completed' | 'archived';
  isBaseline?: boolean;
}
