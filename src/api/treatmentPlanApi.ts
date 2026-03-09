import { CONFIG } from '@/config';

const API_BASE_URL = CONFIG.api.baseUrl;

export interface SessionTreatmentPlanRequest {
  patientId: string;
  sessionId: string;
  sessionReportId: string;
  sessionReportMarkdown: string;
  insights?: string[];
  recommendations?: string[];
}

export const TreatmentPlanApi = {
  /**
   * 生成治疗计划（流式）
   */
  generateStream: async (
    assessmentId: string,
    patientId: string,
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/treatment-plan/generate/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          assessmentId,
          createdBy: 'system', // 实际应该是当前登录的治疗师ID
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          onChunk(chunk);
        }
      }
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      throw error;
    }
  },

  /**
   * 生成治疗计划（非流式）
   */
  generate: async (
    assessmentId: string,
    patientId: string
  ): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/treatment-plan/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          patientId,
          assessmentId,
          createdBy: 'system', // 实际应该是当前登录的治疗师ID
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      throw error;
    }
  },

  generateStreamFromSessionReport: async (
    payload: SessionTreatmentPlanRequest,
    onChunk: (chunk: string) => void
  ): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/treatment-plan/generate-from-session-report/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          createdBy: 'system',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          onChunk(chunk);
        }
      }
    } catch (error) {
      console.error('Error generating treatment plan from session report:', error);
      throw error;
    }
  },

  generateFromSessionReport: async (
    payload: SessionTreatmentPlanRequest
  ): Promise<any> => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/treatment-plan/generate-from-session-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payload,
          createdBy: 'system',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating treatment plan from session report:', error);
      throw error;
    }
  },
};
