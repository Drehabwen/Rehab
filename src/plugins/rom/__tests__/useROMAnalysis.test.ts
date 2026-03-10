import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { calculateCervicalAngle, useROMAnalysis } from '../hooks/useROMAnalysis';
import { useMeasurementStore } from '@/store/useMeasurementStore';

const buildMeasurement = (
  joint: 'cervical' | 'hip',
  direction: 'flexion',
  side: 'left' | 'right' | null,
) => ({
  id: `${joint}-${side ?? 'none'}`,
  joint,
  direction,
  side,
  currentAngle: 0,
  maxAngle: -Infinity,
  minAngle: Infinity,
  data: [],
  color: '#2563eb',
});

describe('useROMAnalysis', () => {
  beforeEach(() => {
    useMeasurementStore.setState((state) => ({
      ...state,
      activeMeasurements: [buildMeasurement('cervical', 'flexion', null)],
      isMeasuring: false,
      startTime: null,
      savedMeasurements: [],
      postureReports: [],
    }));
  });

  it('replaces the default cervical placeholder with the selected joint before measurement starts', () => {
    const { result } = renderHook(() => useROMAnalysis());

    act(() => {
      result.current.configureAssessment('hip', 'flexion', 'right');
      result.current.startROMAssessment();
    });

    expect(result.current.isMeasuring).toBe(true);
    expect(result.current.activeMeasurements).toHaveLength(1);
    expect(result.current.activeMeasurements[0]).toEqual(
      expect.objectContaining({
        joint: 'hip',
        direction: 'flexion',
        side: 'right',
      }),
    );
  });

  it('keeps a neutral cervical pose below the hypermobility threshold', () => {
    const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    landmarks[0] = { x: 0.5, y: 0.24, z: 0 };
    landmarks[7] = { x: 0.47, y: 0.25, z: 0 };
    landmarks[8] = { x: 0.53, y: 0.25, z: 0 };
    landmarks[11] = { x: 0.44, y: 0.4, z: 0 };
    landmarks[12] = { x: 0.56, y: 0.4, z: 0 };
    landmarks[23] = { x: 0.46, y: 0.7, z: 0 };
    landmarks[24] = { x: 0.54, y: 0.7, z: 0 };

    expect(calculateCervicalAngle(landmarks, 'flexion')).toBeLessThan(20);
  });
});
