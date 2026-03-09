import { create } from 'zustand';
import type { AssessmentRecord } from '../types/assessment';
import { AssessmentRecordStorage } from '../utils/assessmentRecordStorage';
import { DataCenterService } from '../services/DataCenterService';
import { APP_CONFIG } from '../config/appConfig';

interface AssessmentRecordState {
  records: AssessmentRecord[];
  currentRecord: AssessmentRecord | null;
  
  addRecord: (record: AssessmentRecord) => void;
  updateRecord: (id: string, data: Partial<AssessmentRecord>) => void;
  deleteRecord: (id: string) => void;
  setCurrentRecord: (id: string) => void;
  clearRecords: () => void;
}

export const useAssessmentRecordStore = create<AssessmentRecordState>((set, get) => {
  const patientId = APP_CONFIG.CURRENT_PATIENT_ID;
  const savedRecords = AssessmentRecordStorage.loadRecords(patientId);
  const currentRecord = savedRecords.length > 0 ? savedRecords[savedRecords.length - 1] : null;
  
  return {
    records: savedRecords,
    currentRecord,
    
    addRecord: (record) => {
      AssessmentRecordStorage.saveRecord(record);
      DataCenterService.saveRecord(record);
      set((state) => ({
        records: [...state.records, record],
        currentRecord: record,
      }));
    },
    
    updateRecord: (id, data) => {
      set((state) => {
        const updatedRecords = state.records.map(r => 
          r.id === id ? { ...r, ...data } : r
        );
        
        const updatedRecord = updatedRecords.find(r => r.id === id);
        if (updatedRecord) {
          AssessmentRecordStorage.saveRecord(updatedRecord);
          DataCenterService.saveRecord(updatedRecord);
        }
        
        return {
          records: updatedRecords,
          currentRecord: state.currentRecord?.id === id 
            ? { ...state.currentRecord, ...data } 
            : state.currentRecord,
        };
      });
    },
    
    deleteRecord: (id) => {
      AssessmentRecordStorage.deleteRecord(id, patientId);
      DataCenterService.deleteRecord(id);
      set((state) => ({
        records: state.records.filter(r => r.id !== id),
        currentRecord: state.currentRecord?.id === id ? null : state.currentRecord,
      }));
    },
    
    setCurrentRecord: (id) => {
      const record = get().records.find(r => r.id === id);
      set({ currentRecord: record || null });
    },
    
    clearRecords: () => {
      AssessmentRecordStorage.clearRecords(patientId);
      DataCenterService.clearData(patientId);
      set({
        records: [],
        currentRecord: null,
      });
    },
  };
});
