import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TreatmentPlanViewer } from '../TreatmentPlanViewer';
import { useTreatmentPlanStore } from '../../../store/useTreatmentPlanStore';

vi.mock('../../../store/useTreatmentPlanStore');
vi.mock('marked', () => ({
  parse: vi.fn(async (content: string) => `<div>${content}</div>`),
}));

describe('TreatmentPlanViewer', () => {
  const mockGeneratePlan = vi.fn();
  const mockClearContent = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useTreatmentPlanStore).mockReturnValue({
      currentContent: '',
      isGenerating: false,
      error: null,
      versions: [],
      currentVersionId: null,
      comparingVersions: [null, null],
      assessmentRecords: [],
      linkedAssessmentId: null,
      linkedSessionId: null,
      linkedSessionReportId: null,
      generatePlan: mockGeneratePlan,
      generatePlanFromSessionReport: vi.fn(),
      clearContent: mockClearContent,
      setError: vi.fn(),
      saveVersion: vi.fn(),
      saveSessionReportVersion: vi.fn(),
      switchVersion: vi.fn(),
      deleteVersion: vi.fn(),
      updateVersionTags: vi.fn(),
      updateVersionNotes: vi.fn(),
      startCompare: vi.fn(),
      endCompare: vi.fn(),
      linkAssessment: vi.fn(),
      loadAssessmentRecords: vi.fn(),
      setLinkedAssessment: vi.fn(),
      setLinkedSessionReport: vi.fn(),
      setCurrentVersion: vi.fn(),
    });
  });

  it('renders generate action and placeholder state', () => {
    render(<TreatmentPlanViewer assessmentId="assessment_001" patientId="patient_001" />);
    expect(screen.getByText('治疗计划生成')).toBeTruthy();
    expect(screen.getByText('生成治疗计划')).toBeTruthy();
  });

  it('calls generatePlan with assessment and patient ids', async () => {
    render(<TreatmentPlanViewer assessmentId="assessment_123" patientId="patient_456" />);
    fireEvent.click(screen.getByText('生成治疗计划'));

    await waitFor(() => {
      expect(mockClearContent).toHaveBeenCalled();
      expect(mockGeneratePlan).toHaveBeenCalledWith('assessment_123', 'patient_456');
    });
  });
});
