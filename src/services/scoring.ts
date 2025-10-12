import { toNumber as num } from '../utils/number';

import type { Weights } from '../config/runtimeConfig';

export const extractEquity = (portfolio: any, ch: any): number => {
  return (
    num(portfolio?.equity) ||
    num(portfolio?.accountValue) ||
    num(portfolio?.totalEquity) ||
    num(ch?.equity) ||
    num(ch?.accountValue) ||
    0
  );
};

export const scoreFrom = (
  equity: number,
  pos: number,
  f1h: number,
  f24h: number,
  notional: number,
  weights?: Weights,
) => {
  const w = weights || { notional: 0.45, equity: 0.35, pos: 0.1, f1h: 0.06, f24h: 0.04 };
  const notionalFactor = Math.log10(Math.max(notional, 1)); // 6 ~ 1M
  const equityFactor = Math.min(equity / 1_000_000, 5); // cap at 5 (>=5M)
  const posFactor = Math.min(pos / 5, 1); // 1 if >=5 actives
  const f1hFactor = Math.min(f1h / 10, 1); // 1 if >=10 fills/1h
  const f24hFactor = Math.min(f24h / 50, 1); // 1 if >=50 fills/24h
  return (
    w.notional * notionalFactor +
    w.equity * equityFactor +
    w.pos * posFactor +
    w.f1h * f1hFactor +
    w.f24h * f24hFactor
  );
};

export const countPositions = (ch: any): number => {
  if (!ch) return 0;
  if (Array.isArray(ch.positions)) return ch.positions.length;
  if (Array.isArray(ch.assetPositions)) return ch.assetPositions.length;
  if (Array.isArray(ch.perpPositions)) return ch.perpPositions.length;
  for (const k of Object.keys(ch)) {
    const v: any = (ch as any)[k];
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
      return v.length;
    }
  }
  return 0;
};

export const countFillsWithin = (fills: any[], windowMs: number): number => {
  const now = Date.now();
  let n = 0;
  for (let i = 0; i < (fills?.length || 0); i++) {
    const t = num((fills as any)[i]?.time);
    if (t && now - t <= windowMs) n++;
  }
  return n;
};
