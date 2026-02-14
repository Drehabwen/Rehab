export interface Assessment {
  id: string;
  sessionId: string;
  type: 'posture' | 'rom' | 'combined';
  createdAt: number;
  data: {
    posture?: any;
    rom?: any;
  };
  notes?: string;
}
