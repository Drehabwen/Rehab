import { describe, expect, it } from 'vitest';
import { getContainedMediaRect, getSourceSizeForAspectRatio } from '../webcamLayout';

describe('webcamLayout', () => {
  it('fits a 4:3 camera feed inside a square viewport without stretching', () => {
    const rect = getContainedMediaRect({
      containerWidth: 800,
      containerHeight: 800,
      sourceWidth: 640,
      sourceHeight: 480
    });

    expect(rect.width).toBe(800);
    expect(rect.height).toBe(600);
  });

  it('fits a 16:9 camera feed inside a wide but shorter viewport', () => {
    const rect = getContainedMediaRect({
      containerWidth: 1200,
      containerHeight: 600,
      sourceWidth: 1920,
      sourceHeight: 1080
    });

    expect(rect.width).toBeCloseTo(1066.6667, 4);
    expect(rect.height).toBe(600);
  });

  it('returns the expected fallback source size for the requested aspect ratio', () => {
    expect(getSourceSizeForAspectRatio('4/3')).toEqual({ width: 4, height: 3 });
    expect(getSourceSizeForAspectRatio('16/9')).toEqual({ width: 16, height: 9 });
    expect(getSourceSizeForAspectRatio('square')).toEqual({ width: 1, height: 1 });
  });
});
