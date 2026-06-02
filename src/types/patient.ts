export interface Patient {
  id: string;
  /**
   * Four-letter public patient code shown across screening, therapist,
   * and parent-facing views. This is not a login secret.
   */
  shortCode?: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  tags?: string[];
}
