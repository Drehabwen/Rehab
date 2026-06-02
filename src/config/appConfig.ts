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
  LLM_API_KEY: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  LLM_API_ENDPOINT: 'https://api.deepseek.com/v1/chat/completions',
  LLM_MODEL: 'deepseek-v4-flash',
} as const;

export type AppConfig = typeof APP_CONFIG;
