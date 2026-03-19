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
  FATIGUE_MONITORING: {
    STABILITY_THRESHOLD: 0.2, // 稳定性偏差阈值，超过此值视为动作变形
    JITTER_SENSITIVITY: 0.05, // 抖动检测灵敏度
    RPE_SCALES: {
      MIN: 0,
      MAX: 10,
      WARNING_THRESHOLD: 7, // 预警分值
      CRITICAL_THRESHOLD: 9, // 危险分值
    },
    FATIGUE_LEVELS: {
      LOW: '正常训练状态',
      MODERATE: '轻微疲劳（建议降低强度）',
      HIGH: '明显疲劳（建议休息，谨防受伤）',
      CRITICAL: '力竭/技术失效（立即停止）',
    },
  },
  LLM_API_KEY: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  LLM_API_ENDPOINT: 'https://api.deepseek.com/v1/chat/completions',
  LLM_MODEL: 'deepseek-chat',
} as const;

export type AppConfig = typeof APP_CONFIG;
