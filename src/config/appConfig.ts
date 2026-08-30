export const APP_CONFIG = {
  CURRENT_PATIENT_ID: 'current_patient',
  DEFAULT_THERAPIST_ID: 'therapist_001',
  STORAGE_KEYS: {
    ASSESSMENT_RECORDS: 'assessment_records',
    TREATMENT_PLANS: 'treatment_plans',
  },
  STORAGE_LIMITS: {
    MAX_IMAGE_SIZE: 500 * 1024,
    WARNING_THRESHOLD: 4 * 1024 * 1024,
    CRITICAL_THRESHOLD: 5 * 1024 * 1024,
    MAX_RECORDS_COUNT: 100,
  },
} as const;

export type AppConfig = typeof APP_CONFIG;
