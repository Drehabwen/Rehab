import { CONFIG } from '@/config';
import type { SessionReportGenerationRequest, SessionReportOutput } from '@/types/report-center';

const API_BASE_URL = CONFIG.api.baseUrl;

export const SessionReportApi = {
  generate: async (payload: SessionReportGenerationRequest): Promise<SessionReportOutput> => {
    const response = await fetch(`${API_BASE_URL}/api/session-report/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  },
};
