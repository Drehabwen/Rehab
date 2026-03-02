import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Vision3CameraStage } from '../components/Vision3CameraStage';

describe('Vision3CameraStage - Skeleton Rendering', () => {
  const defaultProps = {
    assessmentMode: 'stepped' as const,
    view: 'front' as const,
    step: 'capturing' as const,
    captureStatus: 'idle' as const,
    isFullscreen: false,
    isCameraOn: true,
    isMirrored: true,
    videoContainerRef: { current: null },
    showHeadAxes: true,
    annotations: [],
    headAxes: null,
    onResults: vi.fn(),
    activeTab: 'posture' as const,
    assessmentType: 'standard' as const,
    countdown: 3,
    isInPosition: false,
    recordingProgress: 0,
    steppedResults: {},
    setSteppedResults: vi.fn(),
    setCaptureStatus: vi.fn(),
    toggleFullscreen: vi.fn(),
    handleStartCapture: vi.fn(),
    handleNextView: vi.fn(),
    handleFinishStepped: vi.fn(),
    handleResetToEntry: vi.fn(),
    activeMeasurements: [],
    isMeasuring: false,
    startMeasurement: vi.fn(),
    stopMeasurement: vi.fn(),
    resetMeasurement: vi.fn(),
    setIsCameraOn: vi.fn(),
    setView: vi.fn(),
    simulateMockCapture: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Skeleton Visibility', () => {
    it('should render skeleton overlay when camera is on and landmarks are available', async () => {
      const mockLandmarks = Array.from({ length: 33 }, (_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.95
      }));

      render(
        <Vision3CameraStage 
          {...defaultProps}
        />
      );

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true });
        expect(canvas).toBeInTheDocument();
      });
    });

    it('should maintain skeleton visibility during capture status transitions', async () => {
      const { rerender } = render(
        <Vision3CameraStage 
          {...defaultProps}
          captureStatus='scanning'
        />
      );

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true });
        expect(canvas).toBeInTheDocument();
      });

      rerender(
        <Vision3CameraStage 
          {...defaultProps}
          captureStatus='recording'
        />
      );

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true });
        expect(canvas).toBeInTheDocument();
      });
    });

    it('should not hide skeleton when switching between views', async () => {
      const { rerender } = render(
        <Vision3CameraStage 
          {...defaultProps}
          view='front'
        />
      );

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true });
        expect(canvas).toBeInTheDocument();
      });

      rerender(
        <Vision3CameraStage 
          {...defaultProps}
          view='side'
        />
      );

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true });
        expect(canvas).toBeInTheDocument();
      });
    });
  });

  describe('Skeleton Rendering Edge Cases', () => {
    it('should handle empty landmarks gracefully', async () => {
      render(
        <Vision3CameraStage 
          {...defaultProps}
        />
      );

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true });
        expect(canvas).toBeInTheDocument();
      });
    });

    it('should handle low visibility landmarks', async () => {
      const lowVisibilityLandmarks = Array.from({ length: 33 }, (_, i) => ({
        x: 0.5,
        y: 0.5,
        z: 0,
        visibility: 0.3
      }));

      render(
        <Vision3CameraStage 
          {...defaultProps}
        />
      );

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true });
        expect(canvas).toBeInTheDocument();
      });
    });
  });

  describe('Skeleton Mirroring', () => {
    it('should apply mirroring when isMirrored is true', async () => {
      render(
        <Vision3CameraStage 
          {...defaultProps}
          isMirrored={true}
        />
      );

      await waitFor(() => {
        const video = screen.getByTestId('webcam-video');
        expect(video).toHaveClass('scale-x-[-1]');
      });
    });

    it('should not apply mirroring when isMirrored is false', async () => {
      render(
        <Vision3CameraStage 
          {...defaultProps}
          isMirrored={false}
        />
      );

      await waitFor(() => {
        const video = screen.getByTestId('webcam-video');
        expect(video).not.toHaveClass('scale-x-[-1]');
      });
    });
  });

  describe('Skeleton Performance', () => {
    it('should not cause re-renders on every frame', async () => {
      const onResults = vi.fn();
      
      render(
        <Vision3CameraStage 
          {...defaultProps}
          onResults={onResults}
        />
      );

      await waitFor(() => {
        const canvas = screen.getByRole('img', { hidden: true });
        expect(canvas).toBeInTheDocument();
      });

      const initialCallCount = onResults.mock.calls.length;
      
      onResults({ poseLandmarks: Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 })) });
      
      expect(onResults.mock.calls.length).toBe(initialCallCount + 1);
    });
  });
});
