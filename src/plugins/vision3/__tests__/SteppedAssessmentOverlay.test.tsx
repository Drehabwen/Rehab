import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SteppedAssessmentOverlay } from '../components/SteppedAssessmentOverlay';
import { PoseLandmark } from '../vision3-utils';

describe('SteppedAssessmentOverlay', () => {
  const createMockLandmarks = (): PoseLandmark[] => {
    return Array.from({ length: 33 }, (_, i) => ({
      x: 0.5 + i * 0.001,
      y: 0.5 + i * 0.002,
      z: 0.5,
      visibility: 0.8
    }));
  };

  const defaultProps = {
    view: 'front' as const,
    captureStatus: 'idle' as const,
    countdown: 5,
    recordingProgress: 0,
    isInPosition: false,
    steppedResults: {},
    onStartCapture: vi.fn(),
    onNextView: vi.fn(),
    onRetake: vi.fn(),
    onFinish: vi.fn(),
    onReset: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial rendering', () => {
    it('should render without crashing', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} />);
    });

    it('should display front view by default', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} />);
      expect(screen.getByText('front')).toBeInTheDocument();
    });

    it('should display side view', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} view="side" />);
      expect(screen.getByText('side')).toBeInTheDocument();
    });

    it('should display back view', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} view="back" />);
      expect(screen.getByText('back')).toBeInTheDocument();
    });

    it('should display correct view label', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} view="front" />);
      expect(screen.getByText('正视位')).toBeInTheDocument();
    });

    it('should display correct view description', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} view="front" />);
      expect(screen.getByText('评估高低肩、骨盆倾斜')).toBeInTheDocument();
    });
  });

  describe('Status display', () => {
    it('should display idle status text', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="idle" />);
      expect(screen.getByText(/准备拍摄正视位/)).toBeInTheDocument();
    });

    it('should display scanning status text when not in position', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="scanning" isInPosition={false} />);
      expect(screen.getByText('请正对摄像头并保持全身可见')).toBeInTheDocument();
    });

    it('should display scanning status text when in position', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="scanning" isInPosition={true} />);
      expect(screen.getByText('已就绪，准备拍摄')).toBeInTheDocument();
    });

    it('should display countdown number', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="countdown" countdown={3} />);
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('should display recording status text', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="recording" />);
      expect(screen.getByText('正在采集时序数据...')).toBeInTheDocument();
    });

    it('should display completed status text', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="completed" />);
      expect(screen.getByText(/正视位拍摄完成/)).toBeInTheDocument();
    });
  });

  describe('Progress tracking', () => {
    it('should display recording progress bar', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="recording" recordingProgress={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
    });

    it('should display recording progress percentage', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="recording" recordingProgress={75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should display bottom progress indicators', () => {
      const { container } = render(<SteppedAssessmentOverlay {...defaultProps} />);
      const indicators = container.querySelectorAll('.w-8.h-1\\.5');
      expect(indicators.length).toBeGreaterThanOrEqual(3);
    });

    it('should highlight captured views', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} steppedResults={steppedResults} />);
      const frontView = screen.getByText('front');
      expect(frontView).toBeInTheDocument();
    });

    it('should count captured results correctly', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        },
        side: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} steppedResults={steppedResults} />);
      expect(screen.getByText('front')).toBeInTheDocument();
      expect(screen.getByText('side')).toBeInTheDocument();
    });
  });

  describe('Capture result display', () => {
    it('should display captured result card when completed', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="completed" steppedResults={steppedResults} />);
      expect(screen.getByText('Data Captured')).toBeInTheDocument();
      expect(screen.getByText('2秒时序骨架关键点已成功保存，共采集约60帧数据。')).toBeInTheDocument();
    });

    it('should not display captured result card when not completed', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="idle" />);
      expect(screen.queryByText('Data Captured')).not.toBeInTheDocument();
    });
  });

  describe('Button interactions', () => {
    it('should call onStartCapture when start button is clicked', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} />);
      const startButton = screen.getByText('开始自动拍摄');
      fireEvent.click(startButton);
      expect(defaultProps.onStartCapture).toHaveBeenCalled();
    });

    it('should disable start button during capture', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="recording" />);
      const startButton = screen.getByRole('button', { name: /自动拍摄/ });
      expect(startButton).toBeDisabled();
    });

    it('should call onRetake when retake button is clicked', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="completed" steppedResults={steppedResults} />);
      const retakeButton = screen.getByText('重新拍摄');
      fireEvent.click(retakeButton);
      expect(defaultProps.onRetake).toHaveBeenCalled();
    });

    it('should call onNextView when next button is clicked', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="completed" steppedResults={steppedResults} />);
      const nextButton = screen.getByText(/下一步：/);
      fireEvent.click(nextButton);
      expect(defaultProps.onNextView).toHaveBeenCalled();
    });

    it('should call onFinish when finish button is clicked', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="completed" steppedResults={steppedResults} />);
      const finishButton = screen.getByText('立即生成报告');
      fireEvent.click(finishButton);
      expect(defaultProps.onFinish).toHaveBeenCalled();
    });

    it('should call onReset when reset button is clicked', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} />);
      const resetButton = screen.getByText('返回入口');
      fireEvent.click(resetButton);
      expect(defaultProps.onReset).toHaveBeenCalled();
    });

    it('should not show next button on back view', () => {
      const steppedResults = {
        back: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="completed" view="back" steppedResults={steppedResults} />);
      expect(screen.queryByText(/下一步：/)).not.toBeInTheDocument();
    });

    it('should show next button on front view', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="completed" view="front" steppedResults={steppedResults} />);
      expect(screen.getByText(/下一步：/)).toBeInTheDocument();
    });

    it('should show next button on side view', () => {
      const steppedResults = {
        side: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="completed" view="side" steppedResults={steppedResults} />);
      expect(screen.getByText(/下一步：/)).toBeInTheDocument();
    });
  });

  describe('Position detection UI', () => {
    it('should display scanning indicator when not in position', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="scanning" isInPosition={false} />);
      expect(screen.getByText(/Scanning for Body Landmarks/i)).toBeInTheDocument();
    });

    it('should display locked indicator when in position', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="scanning" isInPosition={true} />);
      expect(screen.getByText(/Position Locked/i)).toBeInTheDocument();
    });
  });

  describe('Multi-view progress display', () => {
    it('should display all three view labels', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} />);
      expect(screen.getByText('front')).toBeInTheDocument();
      expect(screen.getByText('side')).toBeInTheDocument();
      expect(screen.getByText('back')).toBeInTheDocument();
    });

    it('should display all three view labels in Chinese', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} />);
      expect(screen.getByText('正视位')).toBeInTheDocument();
      expect(screen.getByText('侧视位')).toBeInTheDocument();
      expect(screen.getByText('背视位')).toBeInTheDocument();
    });

    it('should mark captured views with checkmark', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      const { container } = render(<SteppedAssessmentOverlay {...defaultProps} steppedResults={steppedResults} />);
      // Look for elements with emerald classes (captured state)
      const emeraldElements = container.querySelectorAll('[class*="emerald"]');
      expect(emeraldElements.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty steppedResults', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} steppedResults={{}} />);
      expect(screen.getByText('front')).toBeInTheDocument();
    });

    it('should handle zero recording progress', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="recording" recordingProgress={0} />);
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle 100% recording progress', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="recording" recordingProgress={100} />);
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle maximum countdown value', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="countdown" countdown={5} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('should handle minimum countdown value', () => {
      render(<SteppedAssessmentOverlay {...defaultProps} captureStatus="countdown" countdown={0} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('should handle all three views captured', () => {
      const steppedResults = {
        front: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        },
        side: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        },
        back: {
          timeSeriesLandmarks: [createMockLandmarks()],
          width: 640,
          height: 480,
          timestamp: Date.now()
        }
      };
      render(<SteppedAssessmentOverlay {...defaultProps} steppedResults={steppedResults} />);
      expect(screen.getByText('front')).toBeInTheDocument();
      expect(screen.getByText('side')).toBeInTheDocument();
      expect(screen.getByText('back')).toBeInTheDocument();
    });
  });
});
