import { create } from 'zustand';
import { db } from '@/lib/db';
import { SessionReportApi } from '@/api';
import type { SessionReportGenerationRequest, SessionReportOutput } from '@/types/report-center';

interface SessionReportState {
  reports: SessionReportOutput[];
  isGenerating: boolean;
  error: string | null;
  currentReport: SessionReportOutput | null;
  loadReports: () => Promise<void>;
  loadReportsByPatient: (patientId: string) => Promise<SessionReportOutput[]>;
  generateReport: (payload: SessionReportGenerationRequest) => Promise<SessionReportOutput>;
  getLatestReportBySessionId: (sessionId: string) => SessionReportOutput | undefined;
}

export const useSessionReportStore = create<SessionReportState>((set, get) => ({
  reports: [],
  isGenerating: false,
  error: null,
  currentReport: null,

  loadReports: async () => {
    const reports = await db.sessionReports.orderBy('createdAt').reverse().toArray();
    set({ reports });
  },

  loadReportsByPatient: async (patientId: string) => {
    const reports = await db.sessionReports.where('patientId').equals(patientId).reverse().sortBy('createdAt');
    return reports.reverse();
  },

  generateReport: async (payload) => {
    set({ isGenerating: true, error: null });
    try {
      const report = await SessionReportApi.generate(payload);
      await db.sessionReports.put(report);

      set((state) => ({
        reports: [report, ...state.reports.filter((item) => item.id !== report.id)],
        currentReport: report,
        isGenerating: false,
      }));

      return report;
    } catch (error) {
      const message = error instanceof Error ? error.message : '生成综合报告失败';
      set({ isGenerating: false, error: message });
      throw error;
    }
  },

  getLatestReportBySessionId: (sessionId) => {
    return get().reports.find((report) => report.sessionId === sessionId);
  },
}));
