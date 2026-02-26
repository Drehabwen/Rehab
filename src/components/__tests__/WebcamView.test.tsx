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
  const mockedUseMeasurementStore = vi.mocked(useMeasurementStore);
  const mockedUsePostureWS = vi.mocked(usePostureWS);
  const mockedUseCameraStream = vi.mocked(useCameraStream);

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockedUseMeasurementStore.mockReturnValue({
      activeMeasurements: [],
      updateMeasurementData: mockUpdateMeasurementData,
      isMeasuring: false
    });

    mockedUsePostureWS.mockReturnValue({
      result: null,
      status: 'connected',
      analyze: vi.fn(),
      analyzeJoint: mockAnalyzeJoint,
      analyzeBatch: vi.fn(),
      analyzeStepped: vi.fn(),
      jointResult: null,
      markdownReport: null,
      timeSeriesData: null,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    mockedUseCameraStream.mockReturnValue({
      stream: new MediaStream(),
      isLoading: false,
      error: new Error(''),
      startStream: vi.fn(async () => {}),
      stopStream: vi.fn(),
      trackInfo: { label: 'Mock Camera', muted: false, readyState: 'live' }
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
    mockedUseMeasurementStore.mockReturnValue({
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
