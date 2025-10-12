import { describe, it, expect } from 'vitest';

import { toNumber } from './number';

describe('toNumber', () => {
  it.each([
    { input: 42, expected: 42 },
    { input: -3.14, expected: -3.14 },
    { input: '123', expected: 123 },
    { input: '  10.5 ', expected: 10.5 },
    { input: '-0.001', expected: -0.001 },
  ])('toNumber($input) -> $expected', ({ input, expected }) => {
    expect(toNumber(input as any)).toBe(expected as number);
  });

  it.each([
    'abc',
    undefined,
    null,
    NaN,
    Infinity,
    -Infinity,
  ])('toNumber(%s) -> 0', (input) => {
    expect(toNumber(input as any)).toBe(0);
  });
});
