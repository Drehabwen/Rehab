import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import WebcamView from '../WebcamView';
import { useMeasurementStore } from '@/store/useMeasurementStore';
import { usePostureWS } from '@/hooks/usePostureWS';
import { useCameraStream } from '@/hooks/useCameraStream';

// Mock dependencies
vi.mock('@/store/useMeasurementStore');
vi.mock('@/hooks/usePostureWS');
vi.mock('@/hooks/useCameraStream');
vi.mock('react-webcam', () => ({
  default: vi.fn(() => <div data-testid="mock-webcam" />)
}));
vi.mock('@mediapipe/pose', () => ({
  Pose: vi.fn().mockImplementation(() => ({
    setOptions: vi.fn(),
    onResults: vi.fn(),
    send: vi.fn(),
    close: vi.fn()
  })),
  POSE_CONNECTIONS: []
}));

describe('WebcamView', () => {
  const mockAnalyzeJoint = vi.fn();
  const mockUpdateMeasurementData = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    (useMeasurementStore as any).mockReturnValue({
      activeMeasurements: [],
      updateMeasurementData: mockUpdateMeasurementData,
      isMeasuring: false
    });

    (usePostureWS as any).mockReturnValue({
      analyzeJoint: mockAnalyzeJoint,
      jointResult: null
    });

    (useCameraStream as any).mockReturnValue({
      stream: {},
      isLoading: false,
      error: null
    });
  });

  it('renders correctly when camera is on', () => {
    render(<WebcamView />);
    expect(screen.getByTestId('mock-webcam')).toBeDefined();
  });

  it('shows message when no active measurements', () => {
    render(<WebcamView />);
    expect(screen.getByText('请添加测量项')).toBeDefined();
  });

  it('displays active measurements and angles', () => {
    (useMeasurementStore as any).mockReturnValue({
      activeMeasurements: [
        { id: '1', joint: 'elbow', direction: 'flexion', currentAngle: 45.5, maxAngle: 90, side: 'left' }
      ],
      updateMeasurementData: mockUpdateMeasurementData,
      isMeasuring: false
    });

    render(<WebcamView />);
    expect(screen.getByText(/肘关节/)).toBeDefined();
    expect(screen.getByText('45.5°')).toBeDefined();
  });
});
