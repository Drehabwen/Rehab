import { create } from 'zustand';

export interface StructuredCase {
  '主诉'?: string;
  '现病史'?: string;
  '既往史'?: string;
  '体格检查'?: string;
  '诊断'?: string;
  '处理意见'?: string;
  'S'?: string;
  'O'?: string;
  'A'?: string;
  'P'?: string;
  'ai_suggestions'?: string;
  [key: string]: string | undefined;
}

export interface PatientInfo {
  name: string;
  gender: string;
  age: string;
  case_id: string;
  visit_date: string;
}

interface CaseState {
  structuredCase: StructuredCase | null;
  patientInfo: PatientInfo;
  setStructuredCase: (data: StructuredCase | null) => void;
  setPatientInfo: (info: Partial<PatientInfo>) => void;
  resetCase: () => void;
}

export const useCaseStore = create<CaseState>((set) => ({
  structuredCase: null,
  patientInfo: {
    name: '王晓明',
    gender: '男',
    age: '45',
    case_id: `MV${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}001`,
    visit_date: new Date().toLocaleDateString(),
  },
  setStructuredCase: (data) => set({ structuredCase: data }),
  setPatientInfo: (info) => set((state) => ({ 
    patientInfo: { ...state.patientInfo, ...info } 
  })),
  resetCase: () => set({ structuredCase: null }),
}));
