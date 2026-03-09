import { create } from 'zustand';
import { db } from '@/lib/db';
import type { Patient } from '@/types/patient';
import { generatePatientId } from '@/lib/session-utils';
import { formatPatientSearch } from '@/lib/patient-utils';

interface PatientState {
  patients: Patient[];
  currentPatient: Patient | null;
  isLoading: boolean;
  error: string | null;

  setCurrentPatient: (patient: Patient | null) => void;
  addPatient: (name?: string, predefinedId?: string) => Promise<Patient>;
  updatePatient: (id: string, updates: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  loadPatients: () => Promise<void>;
  searchPatients: (query: string) => Patient[];
  getPatientById: (id: string) => Patient | undefined;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  currentPatient: null,
  isLoading: false,
  error: null,

  setCurrentPatient: (patient) => set({ currentPatient: patient }),

  addPatient: async (name?: string, predefinedId?: string): Promise<Patient> => {
    set({ isLoading: true, error: null });

    let patientId = predefinedId || generatePatientId();
    let exists = await db.patients.get(patientId);
    let attempts = 0;

    while (exists && attempts < 100) {
      patientId = generatePatientId();
      exists = await db.patients.get(patientId);
      attempts += 1;
    }

    if (exists) {
      throw new Error('无法生成唯一患者编号，请重试');
    }

    const patient: Patient = {
      id: patientId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.patients.add(patient);

    set((state) => ({
      patients: [patient, ...state.patients],
      currentPatient: patient,
      isLoading: false,
    }));

    return patient;
  },

  updatePatient: async (id: string, updates: Partial<Patient>): Promise<void> => {
    set({ isLoading: true, error: null });

    const existing = await db.patients.get(id);
    if (!existing) {
      throw new Error('患者不存在');
    }

    const updated = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    await db.patients.put(updated);

    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? updated : p)),
      currentPatient: state.currentPatient?.id === id ? updated : state.currentPatient,
      isLoading: false,
    }));
  },

  deletePatient: async (id: string): Promise<void> => {
    set({ isLoading: true, error: null });

    await db.patients.delete(id);
    await db.sessions.where('patientId').equals(id).delete();

    set((state) => ({
      patients: state.patients.filter((p) => p.id !== id),
      currentPatient: state.currentPatient?.id === id ? null : state.currentPatient,
      isLoading: false,
    }));
  },

  loadPatients: async () => {
    set({ isLoading: true, error: null });

    const patients = await db.patients.orderBy('createdAt').reverse().toArray();

    set({ patients, isLoading: false });
  },

  searchPatients: (query: string): Patient[] => {
    const { patients } = get();
    if (!query.trim()) return patients;

    return patients.filter((p) => formatPatientSearch(p, query));
  },

  getPatientById: (id) => {
    const { patients } = get();
    return patients.find((p) => p.id === id);
  },
}));
