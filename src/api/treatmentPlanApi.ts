import { buildAuthHeaders } from '@/auth/access';
import { CONFIG } from '@/config';

const API_BASE_URL = CONFIG.api.baseUrl;

export interface SessionTreatmentPlanRequest {
  patientId: string;
  patientType?: 'adult' | 'adolescent';
  sessionId: string;
  sessionReportId: string;
  sessionReportMarkdown: string;
  insights?: string[];
  recommendations?: string[];
}

async function readStreamingText(
  response: Response,
  onChunk: (chunk: string) => void,
): Promise<void> {
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
      onChunk(decoder.decode(value, { stream: true }));
    }
  }
}

async function postInterventionPlan(
  endpoint: string,
  body: object,
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(),
    },
    body: JSON.stringify({
      ...body,
      createdBy: 'system',
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response;
}

export const InterventionPlanApi = {
  generateStream: async (
    assessmentId: string,
    patientId: string,
    onChunk: (chunk: string) => void,
  ): Promise<void> => {
    try {
      const response = await postInterventionPlan('/api/treatment-plan/generate/stream', {
        patientId,
        assessmentId,
      });
      await readStreamingText(response, onChunk);
    } catch (error) {
      console.error('Error generating intervention plan:', error);
      throw error;
    }
  },

  generate: async (
    assessmentId: string,
    patientId: string,
  ): Promise<unknown> => {
    try {
      const response = await postInterventionPlan('/api/treatment-plan/generate', {
        patientId,
        assessmentId,
      });
      return await response.json();
    } catch (error) {
      console.error('Error generating intervention plan:', error);
      throw error;
    }
  },

  generateStreamFromSessionReport: async (
    payload: SessionTreatmentPlanRequest,
    onChunk: (chunk: string) => void,
  ): Promise<void> => {
    try {
      const response = await postInterventionPlan(
        '/api/treatment-plan/generate-from-session-report/stream',
        payload,
      );
      await readStreamingText(response, onChunk);
    } catch (error) {
      console.error('Error generating intervention plan from session report:', error);
      throw error;
    }
  },

  generateFromSessionReport: async (
    payload: SessionTreatmentPlanRequest,
  ): Promise<unknown> => {
    try {
      const response = await postInterventionPlan(
        '/api/treatment-plan/generate-from-session-report',
        payload,
      );
      return await response.json();
    } catch (error) {
      console.error('Error generating intervention plan from session report:', error);
      throw error;
    }
  },
};

export { InterventionPlanApi as TreatmentPlanApi };
