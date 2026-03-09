import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTreatmentPlanStore } from '../useTreatmentPlanStore';
import { TreatmentPlanApi } from '../../api/treatmentPlanApi';

vi.mock('../../api/treatmentPlanApi', () => ({
  TreatmentPlanApi: {
    generateStream: vi.fn(),
    generate: vi.fn(),
    generateStreamFromSessionReport: vi.fn(),
    generateFromSessionReport: vi.fn(),
  },
}));

describe('useTreatmentPlanStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTreatmentPlanStore.setState({
      currentContent: '',
      isGenerating: false,
      error: null,
      versions: [],
      currentVersionId: null,
      comparingVersions: [null, null],
      linkedAssessmentId: null,
      linkedSessionId: null,
      linkedSessionReportId: null,
    });
  });

  it('streams and stores assessment-scoped plans', async () => {
    vi.mocked(TreatmentPlanApi.generateStream).mockImplementation(async (_assessmentId, _patientId, onChunk) => {
      onChunk('# Plan');
      onChunk('\n\n1. Exercise');
    });

    await useTreatmentPlanStore.getState().generatePlan('assessment-1', 'patient-1');
    const state = useTreatmentPlanStore.getState();

    expect(state.currentContent).toBe('# Plan\n\n1. Exercise');
    expect(state.versions).toHaveLength(1);
    expect(state.versions[0].assessmentId).toBe('assessment-1');
    expect(state.versions[0].sourceType).toBe('assessment');
    expect(state.linkedAssessmentId).toBe('assessment-1');
  });

  it('streams and stores session-report-scoped plans', async () => {
    vi.mocked(TreatmentPlanApi.generateStreamFromSessionReport).mockImplementation(async (_payload, onChunk) => {
      onChunk('# Session Plan');
      onChunk('\n\n2. Home Program');
    });

    await useTreatmentPlanStore.getState().generatePlanFromSessionReport({
      patientId: 'patient-1',
      sessionId: 'session-1',
      sessionReportId: 'session-report-1',
      sessionReportMarkdown: '# Session Report',
      insights: ['combined insight'],
      recommendations: ['follow-up in 2 weeks'],
    });

    const state = useTreatmentPlanStore.getState();
    expect(state.currentContent).toBe('# Session Plan\n\n2. Home Program');
    expect(state.versions).toHaveLength(1);
    expect(state.versions[0].sessionId).toBe('session-1');
    expect(state.versions[0].sessionReportId).toBe('session-report-1');
    expect(state.versions[0].sourceType).toBe('session-report');
    expect(state.linkedSessionId).toBe('session-1');
    expect(state.linkedSessionReportId).toBe('session-report-1');
  });

  it('records streaming errors', async () => {
    vi.mocked(TreatmentPlanApi.generateStreamFromSessionReport).mockRejectedValue(new Error('service unavailable'));

    await useTreatmentPlanStore.getState().generatePlanFromSessionReport({
      patientId: 'patient-1',
      sessionId: 'session-1',
      sessionReportId: 'session-report-1',
      sessionReportMarkdown: '# Session Report',
    });

    const state = useTreatmentPlanStore.getState();
    expect(state.error).toBe('service unavailable');
    expect(state.isGenerating).toBe(false);
  });
});
