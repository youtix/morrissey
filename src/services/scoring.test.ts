import { describe, it, expect } from 'vitest';

import { countFillsWithin, countPositions, extractEquity, scoreFrom } from './scoring';

describe('extractEquity', () => {
  it.each([
    { portfolio: { equity: 100 }, ch: {}, expected: 100 },
    { portfolio: { accountValue: 200 }, ch: {}, expected: 200 },
    { portfolio: { totalEquity: 300 }, ch: {}, expected: 300 },
    { portfolio: {}, ch: { equity: 400 }, expected: 400 },
    { portfolio: {}, ch: { accountValue: 500 }, expected: 500 },
    { portfolio: {}, ch: {}, expected: 0 },
  ])('selects best equity source -> $expected', ({ portfolio, ch, expected }) => {
    expect(extractEquity(portfolio as any, ch as any)).toBe(expected);
  });
});

describe('scoreFrom', () => {
  it('computes weighted score', () => {
    const w = { notional: 0.5, equity: 0.3, pos: 0.1, f1h: 0.05, f24h: 0.05 } as const;
    const v = scoreFrom(1_000_000, 5, 10, 50, 1_000_000, w);
    // notionalFactor = log10(1e6)=6; equityFactor=min(1,5)=1; posFactor=1; f1h=1; f24h=1
    const expected = 0.5 * 6 + 0.3 * 1 + 0.1 * 1 + 0.05 * 1 + 0.05 * 1; // 3.5 + 0.3 + 0.1 + 0.05 + 0.05 = 4.0
    expect(Number(v.toFixed(6))).toBe(Number(expected.toFixed(6)));
  });
});

describe('countPositions', () => {
  it.each`
    ch                                     | expected
    ${undefined}                           | ${0}
    ${{ positions: [{}] }}                 | ${1}
    ${{ assetPositions: [{}, {}, {}] }}    | ${3}
    ${{ perpPositions: [{}, {}] }}         | ${2}
    ${{ something: [{}, {}, {}, {}] }}     | ${4}
    ${{ something: [] }}                   | ${0}
  `('detects positions in object -> $expected', ({ ch, expected }) => {
    expect(countPositions(ch as any)).toBe(expected);
  });
});

describe('countFillsWithin', () => {
  it.each`
    nowOffset | windowMs      | expected
    ${0}      | ${60_000}     | ${1}
    ${30_000} | ${60_000}     | ${1}
    ${61_000} | ${60_000}     | ${0}
  `('counts fills within window -> $expected', ({ nowOffset, windowMs, expected }) => {
    const base = Date.now();
    const fills = [
      { time: base - nowOffset },
      { time: base - windowMs - 1 },
    ];
    expect(countFillsWithin(fills as any, windowMs)).toBe(expected);
  });
});
