import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SteppedAssessmentOverlay } from '../components/SteppedAssessmentOverlay';

describe('SteppedAssessmentOverlay quick flow', () => {
  const defaultProps = {
    view: 'side' as const,
    captureStatus: 'completed' as const,
    countdown: 5,
    recordingProgress: 100,
    isInPosition: true,
    steppedResults: {
      side: {
        timeSeriesLandmarks: [[]],
        width: 640,
        height: 480,
        timestamp: Date.now(),
      },
    },
    assessmentType: 'quick' as const,
    onStartCapture: vi.fn(),
    onNextView: vi.fn(),
    onRetake: vi.fn(),
    onFinish: vi.fn(),
    onReset: vi.fn(),
  };

  it('uses the selected quick view as the only required view', () => {
    render(<SteppedAssessmentOverlay {...defaultProps} />);

    expect(screen.getByText('side')).toBeInTheDocument();
    expect(screen.queryByText('front')).not.toBeInTheDocument();
    expect(screen.queryByText('back')).not.toBeInTheDocument();
  });

  it('does not render a next-step button in quick mode for side view', () => {
    render(<SteppedAssessmentOverlay {...defaultProps} />);

    expect(screen.queryByText(/下一步/)).not.toBeInTheDocument();
  });
});
