import { describe, it, expect } from 'vitest';
import { charToDigit, calculateLuhnMod10, generateSUC, verifySUC } from '../suc-utils';

describe('SUC Utils Alphanumeric Luhn-10 Tests', () => {
  it('should convert alphanumeric chars to digits properly', () => {
    expect(charToDigit('0')).toBe(0);
    expect(charToDigit('9')).toBe(9);
    expect(charToDigit('A')).toBe(10);
    expect(charToDigit('Z')).toBe(35);
    expect(charToDigit('a')).toBe(10);
    expect(charToDigit('z')).toBe(35);
    expect(charToDigit('-')).toBe(0);
  });

  it('should calculate valid checksum for base string', () => {
    const base = 'QY-SCH01-2605-0145';
    const checksum = calculateLuhnMod10(base);
    expect(checksum).toBeGreaterThanOrEqual(0);
    expect(checksum).toBeLessThanOrEqual(9);
  });

  it('should generate and verify SUC cleanly', () => {
    const suc = generateSUC('SCH01', '2605', 145);
    const parts = suc.split('-');
    expect(parts).toHaveLength(5);
    expect(parts[0]).toBe('QY');
    expect(parts[1]).toBe('SCH01');
    expect(parts[2]).toBe('2605');
    expect(parts[3]).toBe('0145');
    expect(parts[4].length).toBe(1);

    expect(verifySUC(suc)).toBe(true);

    // Mutation test
    const mutatedChecksum = suc.slice(0, -1) + (suc[suc.length - 1] === '0' ? '1' : '0');
    expect(verifySUC(mutatedChecksum)).toBe(false);

    const mutatedSeq = suc.replace('0145', '0146');
    expect(verifySUC(mutatedSeq)).toBe(false);
  });

  it('should handle invalid input formats', () => {
    expect(verifySUC('')).toBe(false);
    expect(verifySUC('QY-SCH01-2605')).toBe(false);
    expect(verifySUC('QY-SCH01-2605-0145-A')).toBe(false);
  });
});
