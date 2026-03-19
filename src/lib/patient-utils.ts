import type { Patient } from '@/types/patient';

export function getPatientDisplayName(patient: Patient): string {
  if (patient.name && patient.name.trim()) {
    return patient.name.trim();
  }
  return `运动员 ${patient.id}`;
}

export function getPatientDisplayId(patient: Patient): string {
  if (patient.name && patient.name.trim()) {
    return patient.id;
  }
  return '';
}

export function getPatientAvatar(patient: Patient): string {
  if (patient.name && patient.name.trim()) {
    return patient.name.charAt(0).toUpperCase();
  }
  return patient.id.charAt(0).toUpperCase();
}

export function getPatientColor(patient: Patient): string {
  const colors = [
    'bg-blue-600',
    'bg-green-600',
    'bg-violet-600',
    'bg-pink-600',
    'bg-indigo-600',
    'bg-teal-600',
    'bg-orange-600',
    'bg-cyan-600',
  ];

  let hash = 0;
  const str = patient.id + (patient.name || '');
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

export function getPatientInitials(patient: Patient): string {
  if (patient.name && patient.name.trim()) {
    const names = patient.name.trim().split(' ');
    if (names.length >= 2) {
      return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }
    return names[0].charAt(0).toUpperCase();
  }
  return patient.id.substring(0, 2).toUpperCase();
}

export function getPatientSubtitle(patient: Patient, sessionCount?: number): string {
  if (patient.name && patient.name.trim()) {
    return `ID: ${patient.id}`;
  }
  return sessionCount !== undefined ? `监控 ${sessionCount} 场` : '新运动员';
}

export function formatPatientSearch(patient: Patient, query: string): boolean {
  if (!query.trim()) return true;

  const lowerQuery = query.toLowerCase();

  return (
    patient.id.toLowerCase().includes(lowerQuery) ||
    (patient.name && patient.name.toLowerCase().includes(lowerQuery)) ||
    (patient.notes && patient.notes.toLowerCase().includes(lowerQuery)) ||
    (patient.tags && patient.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)))
  );
}

export function getPatientBadgeColor(patient: Patient): string {
  if (patient.tags && patient.tags.length > 0) {
    return 'bg-violet-100 text-violet-700';
  }
  if (patient.notes) {
    return 'bg-blue-100 text-blue-700';
  }
  return 'bg-slate-100 text-slate-600';
}

export function getPatientStatusText(patient: Patient): string {
  if (patient.tags && patient.tags.length > 0) {
    return patient.tags[0];
  }
  if (patient.notes) {
    return '有备注';
  }
  return '';
}
