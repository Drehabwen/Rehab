import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVision3AutoSave } from '../hooks/useVision3AutoSave';

const storeMocks = vi.hoisted(() => ({
  usePatientStore: vi.fn(),
  useSessionStore: vi.fn(),
  useAssessmentStore: vi.fn(),
  useMeasurementStore: vi.fn(),
}));

vi.mock('@/store/usePatientStore', () => ({
  usePatientStore: storeMocks.usePatientStore,
}));

vi.mock('@/store/useSessionStore', () => ({
  useSessionStore: storeMocks.useSessionStore,
}));

vi.mock('@/store/useAssessmentStore', () => ({
  useAssessmentStore: storeMocks.useAssessmentStore,
}));

vi.mock('@/store/useMeasurementStore', () => ({
  useMeasurementStore: storeMocks.useMeasurementStore,
}));

describe('useVision3AutoSave', () => {
  const mockStartSession = vi.fn();
  const mockAddAssessment = vi.fn();
  const mockUpdateAssessment = vi.fn();

  let patientStoreState: {
    currentPatient: { id: string; name?: string } | null;
    patients: Array<{ id: string; name?: string }>;
  };
  let sessionStoreState: {
    currentSession: { id: string; patientId: string } | null;
    sessions: Array<{ id: string; patientId: string }>;
    startSession: typeof mockStartSession;
  };
  let assessmentStoreState: {
    addAssessment: typeof mockAddAssessment;
    updateAssessment: typeof mockUpdateAssessment;
  };
  let measurementStoreState: {
    postureReports: Array<unknown>;
  };

  const defaultProps = {
    step: 'completed',
    wsResult: {
      metrics: { swayOffset: 1 },
      issues: [],
    },
    assessmentMode: 'realtime' as const,
    view: 'front' as const,
    markdownReport: null,
    auxiliaryDiagnosis: 'Basic posture report',
    timeSeriesData: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    patientStoreState = {
      currentPatient: null,
      patients: [],
    };
    sessionStoreState = {
      currentSession: null,
      sessions: [],
      startSession: mockStartSession,
    };
    assessmentStoreState = {
      addAssessment: mockAddAssessment,
      updateAssessment: mockUpdateAssessment,
    };
    measurementStoreState = {
      postureReports: [],
    };

    mockStartSession.mockResolvedValue({ id: 'session-1', patientId: 'patient-1' });
    mockAddAssessment.mockResolvedValue({ id: 'assessment-1' });
    mockUpdateAssessment.mockResolvedValue(undefined);

    storeMocks.usePatientStore.mockImplementation(() => patientStoreState);
    storeMocks.useSessionStore.mockImplementation(() => sessionStoreState);
    storeMocks.useAssessmentStore.mockImplementation(() => assessmentStoreState);
    storeMocks.useMeasurementStore.mockImplementation(() => measurementStoreState);
  });

  it('retries the auxiliary save when a patient becomes available later', async () => {
    const { rerender } = renderHook((props) => useVision3AutoSave(props), {
      initialProps: defaultProps,
    });

    expect(mockAddAssessment).not.toHaveBeenCalled();

    patientStoreState = {
      currentPatient: { id: 'patient-1', name: 'Test Patient' },
      patients: [{ id: 'patient-1', name: 'Test Patient' }],
    };

    rerender(defaultProps);

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith('patient-1');
      expect(mockAddAssessment).toHaveBeenCalledTimes(1);
    });

    rerender(defaultProps);

    await waitFor(() => {
      expect(mockAddAssessment).toHaveBeenCalledTimes(1);
    });
  });

  it('retries the auxiliary save after a transient persistence failure', async () => {
    patientStoreState = {
      currentPatient: { id: 'patient-1', name: 'Retry Patient' },
      patients: [{ id: 'patient-1', name: 'Retry Patient' }],
    };
    mockAddAssessment
      .mockRejectedValueOnce(new Error('IndexedDB unavailable'))
      .mockResolvedValueOnce({ id: 'assessment-2' });

    const { rerender } = renderHook((props) => useVision3AutoSave(props), {
      initialProps: defaultProps,
    });

    await waitFor(() => {
      expect(mockAddAssessment).toHaveBeenCalledTimes(1);
    });

    measurementStoreState = {
      postureReports: [],
    };

    rerender(defaultProps);

    await waitFor(() => {
      expect(mockAddAssessment).toHaveBeenCalledTimes(2);
    });
  });
});
