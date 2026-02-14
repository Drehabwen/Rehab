import { db } from './db';
import type { Patient } from '@/types/patient';
import type { Session } from '@/types/session';
import type { Assessment } from '@/types/assessment';

export interface BackupData {
  version: string;
  exportedAt: number;
  patients: Patient[];
  sessions: Session[];
  assessments: Assessment[];
}

export async function exportAllData(): Promise<BackupData> {
  const patients = await db.patients.toArray();
  const sessions = await db.sessions.toArray();
  const assessments = await db.assessments.toArray();

  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    patients,
    sessions,
    assessments
  };
}

export async function importData(data: BackupData): Promise<void> {
  if (data.patients?.length > 0) {
    await db.patients.bulkPut(data.patients);
  }
  if (data.sessions?.length > 0) {
    await db.sessions.bulkPut(data.sessions);
  }
  if (data.assessments?.length > 0) {
    await db.assessments.bulkPut(data.assessments);
  }
}

export function downloadBackup(data: BackupData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rehab-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function readBackupFile(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as BackupData;
        if (!data.version || !data.patients || !data.sessions) {
          reject(new Error('无效的备份文件格式'));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('文件解析失败'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export async function clearAllData(): Promise<void> {
  await db.patients.clear();
  await db.sessions.clear();
  await db.assessments.clear();
}

export async function getDatabaseStats() {
  const [patientCount, sessionCount, assessmentCount] = await Promise.all([
    db.patients.count(),
    db.sessions.count(),
    db.assessments.count()
  ]);

  return {
    patients: patientCount,
    sessions: sessionCount,
    assessments: assessmentCount,
    total: patientCount + sessionCount + assessmentCount
  };
}
