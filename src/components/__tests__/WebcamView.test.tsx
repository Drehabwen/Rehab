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
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    
    mockedUseMeasurementStore.mockReturnValue({
      activeMeasurements: [],
      updateMeasurementData: mockUpdateMeasurementData,
      isMeasuring: false
    });

    mockedUsePostureWS.mockReturnValue({
      result: { metrics: {}, issues: [], timestamp: 0 },
      status: 'connected',
      stabilityScore: 1,
      jitterIndex: 0,
      analyze: vi.fn(),
      analyzeJoint: mockAnalyzeJoint,
      analyzeBatch: vi.fn(),
      analyzeStepped: vi.fn(),
      requestDeepAnalysis: vi.fn(),
      jointResult: { results: [], timestamp: 0 },
      markdownReport: '',
      streamingReport: '',
      isStreamingReport: false,
      auxiliaryDiagnosis: '',
      timeSeriesData: [],
      analysisAckAt: null,
      connect: vi.fn(),
      disconnect: vi.fn()
    });

    mockedUseCameraStream.mockReturnValue({
      stream: {} as MediaStream,
      isLoading: false,
      error: null,
      startStream: vi.fn(async () => {}),
      stopStream: vi.fn(),
      trackInfo: { label: 'Mock Camera', muted: false, readyState: 'live' }
    });
  });

  it('renders correctly when camera is on', () => {
    const { container } = render(<WebcamView />);
    expect(container.querySelector('video')).toBeTruthy();
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
