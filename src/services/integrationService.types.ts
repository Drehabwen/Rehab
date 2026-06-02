/** Types for integrationService — extracted to keep the service file focused. */

import type { ScaleAssessmentData } from '@/types/assessment';

export interface SyncSubject {
  subject_id: string; display_name: string; sex: string;
  age: number | null; height_cm: number | null; notes?: string;
}

export interface SyncProtocolResult {
  result_id: string;
  protocol: 'static_posture' | 'adams_forward_bend' | 'squat' | 'squat_screening';
  status: string; capture_quality: string;
  metrics: Record<string, any>; findings: string[];
  risk_flags: string[]; recommendations: string[];
  psi_score?: number | null; severity_grades?: Record<string, string> | null;
}

export interface SyncIntegratedReport {
  report_id: string; title: string;
  overall_risk: 'low' | 'attention' | 'review_required' | 'recapture_needed';
  consistency_level: string; main_patterns: string[];
  next_action: string; summary: string; recommendations: string[];
}

export interface SyncLlmAnalysis {
  enhanced_summary?: string | null; clinical_context?: string | null;
  risk_narrative?: string | null; suggestions: string[]; limitations: string[];
}

export interface SyncScreeningPayload {
  session_id: string; subject: SyncSubject;
  protocol_results: SyncProtocolResult[];
  integrated_report?: SyncIntegratedReport | null;
  llm_analysis?: SyncLlmAnalysis | null;
  created_at: string; completed_at?: string | null;
}

export interface SyncedScreeningBrief {
  session_id: string; subject_id: string; subject_display_name: string;
  patient_id?: string | null; overall_risk: string;
  status: 'pending' | 'imported'; created_at: string; synced_at: string;
}

export interface SyncedScreeningDetail extends SyncedScreeningBrief {
  payload: SyncScreeningPayload;
}

export interface FamilyAccessLink {
  id: number; patient_id: string; link_type: 'family_code';
  status: 'active' | 'revoked' | 'expired' | string;
  linked_to?: string | null; created_at: string;
  expires_at?: string | null; is_expired: boolean;
}

export interface ParentReportResult {
  report_id: string; patient_id: string; patient_name: string | null;
  session_id: string; report_type: string; risk_level: string;
  risk_label: string; summary_text: string; recommendation: string | null;
  payload: Record<string, any>; source: string; submitted_at: string;
}

export interface ReminderItem {
  item_type: 'scale' | 'plan' | 'assessment';
  item_id: string; item_label: string;
  status: 'ok' | 'due_soon' | 'overdue' | 'missing';
  days_since_last: number | null; recommended_interval: number;
  last_push_at: string | null; patient_id: string; patient_name: string | null;
}

export interface PatientReminders {
  patient_id: string; patient_name: string | null;
  items: ReminderItem[]; overdue_count: number; due_soon_count: number;
}

export interface AllRemindersResponse {
  total_overdue: number; total_due_soon: number; patients: PatientReminders[];
}

export const SCALE_INTERVALS: Record<string, number> = {
  'SRS-22': 90, 'ODI': 60, 'VAS': 14, 'MBI': 60, 'HAM-A': 28, 'Berg': 60, 'MMT': 30, 'MAS': 30,
};

export const PLAN_INTERVAL_DAYS = 28;
export const ASSESSMENT_INTERVAL_DAYS = 3;
