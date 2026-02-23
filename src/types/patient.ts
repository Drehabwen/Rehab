export interface Patient {
  id: string;
  name?: string;
  createdAt: number;
  updatedAt: number;
  notes?: string;
  tags?: string[];
}
