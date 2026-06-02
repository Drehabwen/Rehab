import type { ScaleAssessmentData } from '@/types/assessment';
import type {
  SyncSubject, SyncProtocolResult, SyncIntegratedReport, SyncLlmAnalysis,
  SyncScreeningPayload, SyncedScreeningBrief, SyncedScreeningDetail,
  FamilyAccessLink, ParentReportResult,
  PatientReminders, AllRemindersResponse,
} from './integrationService.types';

// Phase 5: 统一数据后端 — 所有 API 调用走 Rehab Python (:8000) 作为唯一数据源
const API_URL = 'http://localhost:8000/api/integration';

export class IntegrationService {
  /**
   * Get all synced screenings from early screening terminal
   */
  static async getSyncedScreenings(status?: 'pending' | 'imported'): Promise<SyncedScreeningBrief[]> {
    const url = status ? `${API_URL}/synced-screenings?status=${status}` : `${API_URL}/synced-screenings`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch synced screenings: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get detailed payload of a synced screening record
   */
  static async getSyncedScreeningDetail(sessionId: string): Promise<SyncedScreeningDetail> {
    const response = await fetch(`${API_URL}/synced-screenings/${encodeURIComponent(sessionId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch synced screening detail: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Mark a synced screening session as imported
   */
  static async markAsImported(sessionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/synced-screenings/${encodeURIComponent(sessionId)}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to mark screening as imported: ${response.statusText}`);
    }
  }

  /**
   * Confirm a synced screening intake and bind source subject_id to canonical patient_id
   */
  static async confirmScreeningIntake(
    sessionId: string,
    payload: {
      action: 'create_patient' | 'link_existing_patient';
      patient_id?: string | null;
      patient_code?: string | null;
      short_code?: string | null;
      family_code?: string | null;
      family_code_expires_at?: string | null;
      suc?: string | null;
    }
  ): Promise<{
    status: string;
    session_id: string;
    patient_id: string;
    patient_code?: string | null;
    short_code?: string | null;
    subject_id: string;
    family_code?: string | null;
    alias_created: boolean;
  }> {
    const response = await fetch(`${API_URL}/intake/${encodeURIComponent(sessionId)}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to confirm screening intake: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Ensure a patient identity exists in the Python backend (idempotent).
   * Call this before any family-code operation to guarantee the patient
   * is synced regardless of creation source (manual, screening, import).
   */
  static async ensurePatient(patient: {
    patient_id: string;
    display_name?: string;
    sex?: string;
    age?: number | null;
    height_cm?: number | null;
    notes?: string;
    patient_code?: string;
    short_code?: string;
  }): Promise<{ status: string; patient_id: string; patient_code?: string | null; short_code?: string | null }> {
    const response = await fetch(`${API_URL}/patient/ensure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patient.patient_id,
        display_name: patient.display_name,
        sex: patient.sex,
        age: patient.age,
        height_cm: patient.height_cm,
        notes: patient.notes,
        patient_code: patient.patient_code || patient.short_code || null,
        short_code: patient.short_code || null,
      }),
    });
    if (!response.ok) {
      throw new Error(`Failed to ensure patient: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * List family-code access links for a canonical patient without exposing stored hashes
   */
  static async listFamilyAccess(patientId: string): Promise<FamilyAccessLink[]> {
    const response = await fetch(`${API_URL}/family/access/${encodeURIComponent(patientId)}`);
    if (!response.ok) {
      throw new Error(`Failed to list family access links: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Rotate a patient's family code. The raw family_code is returned once.
   */
  static async rotateFamilyAccess(
    patientId: string,
    payload: {
      family_code?: string | null;
      expires_at?: string | null;
      linked_to?: string | null;
    } = {}
  ): Promise<FamilyAccessLink & { family_code: string; rotated_at: string }> {
    const response = await fetch(`${API_URL}/family/access/${encodeURIComponent(patientId)}/rotate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to rotate family access link: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Revoke a single family-code access link
   */
  static async revokeFamilyAccess(linkId: number): Promise<FamilyAccessLink> {
    const response = await fetch(`${API_URL}/family/access-link/${linkId}/revoke`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to revoke family access link: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Extend a single family-code access link
   */
  static async extendFamilyAccess(linkId: number, expiresAt: string | null): Promise<FamilyAccessLink> {
    const response = await fetch(`${API_URL}/family/access-link/${linkId}/extend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ expires_at: expiresAt }),
    });
    if (!response.ok) {
      throw new Error(`Failed to extend family access link: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Delete a synced screening record
   */
  static async deleteSyncedScreening(sessionId: string): Promise<void> {
    const response = await fetch(`${API_URL}/synced-screenings/${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to delete synced screening: ${response.statusText}`);
    }
  }

  /**
   * Push a rehabilitation scale assessment task to a patient/parent chatbot
   */
  static async pushScaleTask(payload: {
    patient_id: string;
    patient_name?: string;
    session_id: string;
    scale_id: 'SRS-22' | 'ODI' | 'VAS' | 'MBI' | 'Berg' | 'MMT' | 'MAS' | 'HAM-A';
    therapist_name: string;
  }): Promise<{ task_id: string; status: string }> {
    const response = await fetch(`${API_URL}/scale/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to push scale task: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Push assessment summary from therapist workstation to parent chatbot
   */
  static async pushAssessmentSummary(payload: {
    patient_id: string;
    patient_name?: string;
    session_id: string;
    risk_level: string;
    risk_label: string;
    summary_text: string;
    concerns?: string[];
    recommendations?: string[];
  }): Promise<{ summary_id: string; status: string }> {
    const response = await fetch(`${API_URL}/assessment/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to push assessment summary: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Push treatment plan from therapist workstation to parent chatbot
   */
  static async pushTreatmentPlan(payload: {
    patient_id: string;
    patient_name?: string;
    session_id: string;
    therapist_name: string;
    plan_content: string;
  }): Promise<{ plan_id: string; status: string }> {
    const response = await fetch(`${API_URL}/plan/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to push treatment plan: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get submitted rehabilitation scale results for a session
   */
  static async getScaleResults(sessionId: string): Promise<{
    task_id: string;
    patient_id: string;
    session_id: string;
    scale_id: string;
    status: 'pending' | 'completed' | 'imported';
    scale_data: ScaleAssessmentData | null;
    created_at: string;
    submitted_at: string | null;
  }[]> {
    const response = await fetch(`${API_URL}/scale/results/${encodeURIComponent(sessionId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch scale results: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get all scale tasks/results for a patient, including completed parent submissions.
   */
  static async getScaleResultsByPatient(patientId: string, status?: 'pending' | 'completed'): Promise<{
    task_id: string;
    patient_id: string;
    session_id: string;
    scale_id: string;
    status: 'pending' | 'completed' | 'imported';
    scale_data: ScaleAssessmentData | null;
    created_at: string;
    submitted_at: string | null;
  }[]> {
    const query = status ? `?status=${encodeURIComponent(status)}` : '';
    const response = await fetch(`${API_URL}/scale/results/by-patient/${encodeURIComponent(patientId)}${query}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch patient scale results: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get pending scale tasks for a patient (parent-side status)
   */
  static async getPendingScales(patientId: string): Promise<{
    task_id: string;
    patient_id: string;
    patient_name: string;
    session_id: string;
    scale_id: string;
    status: string;
    created_at: string;
    submitted_at: string | null;
  }[]> {
    const response = await fetch(`${API_URL}/scale/pending/${encodeURIComponent(patientId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch pending scales: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get latest assessment summary for a patient
   */
  static async getAssessmentSummary(patientId: string): Promise<{
    summary_id: string;
    patient_id: string;
    patient_name: string;
    session_id: string;
    risk_level: string;
    risk_label: string;
    summary_text: string;
    concerns: string[];
    recommendations: string[];
    created_at: string;
  } | null> {
    const response = await fetch(`${API_URL}/assessment/summary/${encodeURIComponent(patientId)}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to fetch assessment summary: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get pending treatment plans for a patient
   */
  static async getTreatmentPlans(patientId: string): Promise<{
    plan_id: string;
    patient_id: string;
    patient_name: string;
    therapist_name: string;
    plan_content: string;
    status: string;
    created_at: string;
    updated_at: string | null;
  }[]> {
    const response = await fetch(`${API_URL}/plan/pending/${encodeURIComponent(patientId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch treatment plans: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get daily tracking history for a patient
   */
  static async getTrackingHistory(patientId: string): Promise<{
    id: number;
    patient_id: string;
    patient_name: string;
    tracking_date: string;
    exercises_completed: Array<{ name: string; duration: number; completed: boolean }>;
    total_duration_min: number;
    symptoms: Record<string, any>;
    notes: string;
    submitted_at: string;
  }[]> {
    const response = await fetch(`${API_URL}/tracking/${encodeURIComponent(patientId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch tracking history: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get parent-submitted self-screening/report evidence for a patient
   */
  static async getParentReports(patientId: string): Promise<ParentReportResult[]> {
    const response = await fetch(`${API_URL}/parent-report/${encodeURIComponent(patientId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch parent reports: ${response.statusText}`);
    }
    return response.json();
  }

  // ── Reminder System ──

  /** 单条提醒 */
  static async getReminders(patientId: string): Promise<PatientReminders> {
    const response = await fetch(`${API_URL}/reminders/${encodeURIComponent(patientId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch reminders: ${response.statusText}`);
    }
    return response.json();
  }

  /** 所有患者的提醒汇总 */
  static async getAllReminders(): Promise<AllRemindersResponse> {
    const response = await fetch(`${API_URL}/reminders`);
    if (!response.ok) {
      throw new Error(`Failed to fetch all reminders: ${response.statusText}`);
    }
    return response.json();
  }
}

// ── Re-exports from types module ──
export type {
  SyncSubject, SyncProtocolResult, SyncIntegratedReport, SyncLlmAnalysis,
  SyncScreeningPayload, SyncedScreeningBrief, SyncedScreeningDetail,
  FamilyAccessLink, ParentReportResult,
  ReminderItem, PatientReminders, AllRemindersResponse,
} from './integrationService.types';
export { SCALE_INTERVALS, PLAN_INTERVAL_DAYS, ASSESSMENT_INTERVAL_DAYS } from './integrationService.types';
