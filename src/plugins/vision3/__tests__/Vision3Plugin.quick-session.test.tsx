import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Vision3Plugin } from '../Vision3Plugin';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { usePostureAssessmentStore } from '../store/usePostureAssessmentStore';

vi.mock('../hooks/useVision3Camera', () => ({
  useVision3Camera: () => ({
    isCameraOn: true,
    setIsCameraOn: vi.fn(),
    isMirrored: false,
    isFullscreen: false,
    toggleFullscreen: vi.fn(),
    videoContainerRef: { current: null },
  }),
}));

vi.mock('../hooks/useVision3AutoSave', () => ({
  useVision3AutoSave: () => undefined,
}));

vi.mock('../hooks/usePostureAnalysis', () => ({
  usePostureAnalysis: () => {
    const [captureStatus, setCaptureStatus] = React.useState<'idle' | 'completed'>('idle');

    return {
      wsResult: null,
      onResults: vi.fn(),
      captureStatus,
      setCaptureStatus,
      countdown: 5,
      recordingProgress: 0,
      isInPosition: false,
      steppedResults: {},
      setSteppedResults: vi.fn(),
      analyzeStepped: vi.fn(),
      headAxes: null,
      annotations: [],
      markdownReport: null,
      auxiliaryDiagnosis: null,
      timeSeriesData: null,
      streamingReport: '',
      isStreamingReport: false,
      requestDeepAnalysis: vi.fn(),
      analyze: vi.fn(),
      analyzeBatch: vi.fn(),
      simulateMockCapture: vi.fn(),
    };
  },
}));

vi.mock('../components/Vision3CameraStage', () => ({
  Vision3CameraStage: ({ captureStatus, assessmentType, view }: { captureStatus: string; assessmentType: string; view: string }) => (
    <div data-testid="camera-stage-status">{`${assessmentType}:${view}:${captureStatus}`}</div>
  ),
}));

vi.mock('../components/Vision3AnalysisPanel', () => ({
  Vision3AnalysisPanel: () => <div data-testid="analysis-panel">analysis</div>,
}));

vi.mock('../components/Vision3Header', () => ({
  Vision3Header: () => <div data-testid="vision3-header">header</div>,
}));

vi.mock('../components/MetricsSidebar', () => ({
  MetricsSidebar: () => null,
}));

vi.mock('@/components/shared/Vision3ErrorBoundary', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Vision3Plugin quick assessment session state', () => {
  beforeEach(() => {
    useMeasurementStore.setState({
      postureReports: [
        {
          id: 'cached-report',
          date: Date.now(),
          view: 'front',
          html: '<p>cached</p>',
          auxiliaryDiagnosis: '历史缓存报告',
          markdown: '历史扩展报告',
          metrics: {
            shoulderAngle: 1,
            hipAngle: 0,
            headDeviation: 0,
            headForward: 0,
            shoulderRounded: 0,
            headPitch: 0,
            headYaw: 0,
            headRoll: 0,
            head_axes: [],
          },
          issues: [],
        },
      ],
    });
    usePostureAssessmentStore.getState().reset();
  });

  it('does not jump into completed state when starting a new quick assessment with cached reports present', async () => {
    render(<Vision3Plugin />);

    fireEvent.click(screen.getByRole('button', { name: '快速评估：正面' }));

    await waitFor(() => {
      expect(screen.getByTestId('camera-stage-status')).toHaveTextContent('quick:front:idle');
    });
  });
});
