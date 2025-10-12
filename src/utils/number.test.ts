import { describe, it, expect } from 'vitest';
import { toNumber } from './number';

describe('toNumber', () => {
  it('returns the same number when given a finite number', () => {
    expect(toNumber(42)).toBe(42);
    expect(toNumber(-3.14)).toBe(-3.14);
  });

  it('parses numeric strings', () => {
    expect(toNumber('123')).toBe(123);
    expect(toNumber('  10.5 ')).toBe(10.5);
    expect(toNumber('-0.001')).toBe(-0.001);
  });

  it('returns 0 for non-numeric values', () => {
    expect(toNumber('abc')).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber(null)).toBe(0);
    // NaN and Infinity are not finite and should map to 0
    expect(toNumber(NaN)).toBe(0);
    expect(toNumber(Infinity)).toBe(0);
    expect(toNumber(-Infinity)).toBe(0);
  });
});
