import type { ScaleAssessmentData } from '@/types/assessment';

export interface SyncSubject {
  subject_id: string;
  display_name: string;
  sex: string;
  age: number | null;
  height_cm: number | null;
  notes?: string;
}

export interface SyncProtocolResult {
  result_id: string;
  protocol: 'static_posture' | 'adams_forward_bend' | 'squat' | 'squat_screening';
  status: string;
  capture_quality: string;
  metrics: Record<string, any>;
  findings: string[];
  risk_flags: string[];
  recommendations: string[];
  psi_score?: number | null;
  severity_grades?: Record<string, string> | null;
}

export interface SyncIntegratedReport {
  report_id: string;
  title: string;
  overall_risk: 'low' | 'attention' | 'review_required' | 'recapture_needed';
  consistency_level: string;
  main_patterns: string[];
  next_action: string;
  summary: string;
  recommendations: string[];
}

export interface SyncLlmAnalysis {
  enhanced_summary?: string | null;
  clinical_context?: string | null;
  risk_narrative?: string | null;
  suggestions: string[];
  limitations: string[];
}

export interface SyncScreeningPayload {
  session_id: string;
  subject: SyncSubject;
  protocol_results: SyncProtocolResult[];
  integrated_report?: SyncIntegratedReport | null;
  llm_analysis?: SyncLlmAnalysis | null;
  created_at: string;
  completed_at?: string | null;
}

export interface SyncedScreeningBrief {
  session_id: string;
  subject_id: string;
  subject_display_name: string;
  overall_risk: string;
  status: 'pending' | 'imported';
  created_at: string;
  synced_at: string;
}

export interface SyncedScreeningDetail extends SyncedScreeningBrief {
  payload: SyncScreeningPayload;
}

const BASE_URL = 'http://localhost:8002/api/integration';

export class IntegrationService {
  /**
   * Get all synced screenings from early screening terminal
   */
  static async getSyncedScreenings(status?: 'pending' | 'imported'): Promise<SyncedScreeningBrief[]> {
    const url = status ? `${BASE_URL}/synced-screenings?status=${status}` : `${BASE_URL}/synced-screenings`;
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
    const response = await fetch(`${BASE_URL}/synced-screenings/${encodeURIComponent(sessionId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch synced screening detail: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Mark a synced screening session as imported
   */
  static async markAsImported(sessionId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/synced-screenings/${encodeURIComponent(sessionId)}/import`, {
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
   * Delete a synced screening record
   */
  static async deleteSyncedScreening(sessionId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/synced-screenings/${encodeURIComponent(sessionId)}`, {
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
    scale_id: 'SRS-22' | 'ODI' | 'VAS' | 'MBI' | 'Berg' | 'MMT' | 'MAS';
    therapist_name: string;
  }): Promise<{ task_id: string; status: string }> {
    const response = await fetch(`${BASE_URL}/scale/push`, {
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
    const response = await fetch(`${BASE_URL}/scale/results/${encodeURIComponent(sessionId)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch scale results: ${response.statusText}`);
    }
    return response.json();
  }
}
