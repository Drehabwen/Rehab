export interface Assessment {
  id: string;
  sessionId: string;
  type: 'posture' | 'rom' | 'combined';
  createdAt: number;
  data: {
    posture?: Record<string, unknown>;
    rom?: Record<string, unknown>;
  };
  notes?: string;
}
