import { create } from 'zustand';
import { db } from '@/lib/db';
import type {
  Assessment,
  PostureAssessmentData,
  RomAssessmentData,
  MedVoiceAssessmentData,
  AssessmentMode
} from '@/types/assessment';
import { nanoid } from 'nanoid';

interface AssessmentState {
  assessments: Assessment[];
  currentAssessment: Assessment | null;
  isLoading: boolean;
  error: string | null;
  
  setCurrentAssessment: (assessment: Assessment | null) => void;
  clearCurrentAssessment: () => void;
  addAssessment: (data: {
    sessionId: string;
    patientId: string;
    type: Assessment['type'];
    mode: AssessmentMode;
    data: {
      posture?: PostureAssessmentData;
      rom?: RomAssessmentData;
      medvoice?: MedVoiceAssessmentData;
    };
    notes?: string;
  }) => Promise<Assessment>;
  updateAssessment: (id: string, updates: Partial<Assessment>) => Promise<void>;
  deleteAssessment: (id: string) => Promise<void>;
  loadAssessments: () => Promise<void>;
  loadAssessmentsByPatient: (patientId: string) => Promise<Assessment[]>;
  loadAssessmentsBySession: (sessionId: string) => Promise<Assessment[]>;
  getAssessmentById: (id: string) => Assessment | undefined;
}

export const useAssessmentStore = create<AssessmentState>((set, get) => ({
  assessments: [],
  currentAssessment: null,
  isLoading: false,
  error: null,
  
  setCurrentAssessment: (assessment) => set({ currentAssessment: assessment }),
  clearCurrentAssessment: () => set({ currentAssessment: null }),
  
  addAssessment: async (input) => {
    set({ isLoading: true, error: null });

    try {
      const assessment: Assessment = {
        id: nanoid(12),
        sessionId: input.sessionId,
        patientId: input.patientId,
        type: input.type,
        mode: input.mode,
        createdAt: Date.now(),
        data: input.data,
        notes: input.notes,
        status: 'completed'
      };

      await db.assessments.add(assessment);

      set(state => ({ 
        assessments: [assessment, ...state.assessments],
        currentAssessment: assessment,
        isLoading: false 
      }));

      return assessment;
    } catch (error) {
      const message = (error as Error).message;
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  
  updateAssessment: async (id, updates) => {
    set({ isLoading: true, error: null });

    try {
      await db.assessments.update(id, updates);

      set(state => ({
        assessments: state.assessments.map(a => 
          a.id === id ? { ...a, ...updates } : a
        ),
        currentAssessment: state.currentAssessment?.id === id
          ? { ...state.currentAssessment, ...updates }
          : state.currentAssessment,
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  deleteAssessment: async (id) => {
    set({ isLoading: true, error: null });

    try {
      await db.assessments.delete(id);

      set(state => ({
        assessments: state.assessments.filter(a => a.id !== id),
        currentAssessment: state.currentAssessment?.id === id ? null : state.currentAssessment,
        isLoading: false
      }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      throw error;
    }
  },
  
  loadAssessments: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const assessments = await db.assessments
        .orderBy('createdAt')
        .reverse()
        .toArray();
      
      set({ assessments, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
  
  loadAssessmentsByPatient: async (patientId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const assessments = await db.assessments
        .where('patientId')
        .equals(patientId)
        .reverse()
        .sortBy('createdAt');

      set({ isLoading: false });
      return assessments;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },
  
  loadAssessmentsBySession: async (sessionId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const assessments = await db.assessments
        .where('sessionId')
        .equals(sessionId)
        .reverse()
        .sortBy('createdAt');

      set({ isLoading: false });
      return assessments;
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
      return [];
    }
  },
  
  getAssessmentById: (id) => {
    return get().assessments.find(a => a.id === id);
  }
}));
