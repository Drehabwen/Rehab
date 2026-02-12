import { describe, it, expect, vi } from 'vitest';
import { drawHeadAxes, normalizeHeadAxes } from '../vision3-utils';

const mockCanvasContext = () => ({
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  strokeStyle: '',
  lineWidth: 0,
  fillStyle: '',
  font: ''
});

describe('Vision3Plugin Rendering Logic (Phase 3 TDD)', () => {
  it('should map head_axes to structured axes', () => {
    const axes = normalizeHeadAxes([
      { x: 50, y: 50 },
      { x: 80, y: 50 },
      { x: 50, y: 20 },
      { x: 50, y: 80 }
    ]);

    expect(axes).not.toBeNull();
    expect(axes?.origin.x).toBe(50);
    expect(axes?.x.x).toBeGreaterThan(axes?.origin.x || 0);
    expect(axes?.y.y).toBeLessThan(axes?.origin.y || 0);
  });

  it('should render three axes and labels', () => {
    const ctx = mockCanvasContext() as unknown as CanvasRenderingContext2D;
    const axes = normalizeHeadAxes([
      { x: 50, y: 50 },
      { x: 80, y: 50 },
      { x: 50, y: 20 },
      { x: 50, y: 80 }
    ]);

    if (!axes) {
      throw new Error('Axes not generated');
    }

    drawHeadAxes(ctx, axes);

    expect(ctx.beginPath).toHaveBeenCalledTimes(3);
    expect(ctx.stroke).toHaveBeenCalledTimes(3);
    expect(ctx.moveTo).toHaveBeenCalledWith(50, 50);
    expect(ctx.fillText).toHaveBeenCalledTimes(3);
  });
});
