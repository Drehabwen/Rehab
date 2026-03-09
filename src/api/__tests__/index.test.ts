import { describe, it, expect } from 'vitest';
import { TreatmentPlanApi } from '../index';
import { TreatmentPlanApi as DirectApi } from '../treatmentPlanApi';

describe('API Index exports', () => {
  it('should export TreatmentPlanApi from index', () => {
    expect(TreatmentPlanApi).toBeDefined();
    expect(TreatmentPlanApi).toBe(DirectApi);
  });

  it('should have generateStream method', () => {
    expect(TreatmentPlanApi.generateStream).toBeDefined();
    expect(typeof TreatmentPlanApi.generateStream).toBe('function');
  });

  it('should have generate method', () => {
    expect(TreatmentPlanApi.generate).toBeDefined();
    expect(typeof TreatmentPlanApi.generate).toBe('function');
  });
});
