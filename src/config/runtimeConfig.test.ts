import { describe, it, expect } from 'vitest';

import { config } from './runtimeConfig';

describe('runtime config getters', () => {
  it('has default snapshot shape', () => {
    const s = config.snapshot();
    expect(Object.keys(s).sort().join(',')).toBe(
      ['NOTIONAL_USD','ADOPT_THRESHOLD','HARD_EQ_THRESHOLD','HARD_NOTIONAL','WEIGHTS','COINS','MUTED_CHATS','LOG_LEVEL'].sort().join(',')
    );
  });
});

describe('numeric setters validation', () => {
  it.each`
    fn                     | value      | ok
    ${'setNotionalUSD'}    | ${5_000}   | ${false}
    ${'setNotionalUSD'}    | ${50_000}  | ${true}
    ${'setAdoptThreshold'} | ${-1}      | ${false}
    ${'setAdoptThreshold'} | ${3.5}     | ${true}
    ${'setHardEqThreshold'}| ${50_000}  | ${false}
    ${'setHardEqThreshold'}| ${500_000} | ${true}
    ${'setHardNotional'}   | ${50_000}  | ${false}
    ${'setHardNotional'}   | ${500_000} | ${true}
  `('$fn($value) -> ok=$ok', ({ fn, value, ok }) => {
    const err = (config as any)[fn](value);
    expect(err === null).toBe(ok);
  });
});

describe('weights', () => {
  it('rejects non-summing weights', () => {
    const err = config.setWeight('notional', 0.5);
    expect(!!err).toBe(true);
  });

  it('accepts no-op update that keeps sum=1', () => {
    const current = config.getWeights();
    const err = config.setWeight('pos', current.pos);
    expect(err === null).toBe(true);
  });
});

describe('coins', () => {
  it('adds and removes coins case-insensitively', () => {
    const a = config.addCoin('eth');
    const b = config.addCoin('BTC');
    const r = config.removeCoin('Eth');
    expect(a === null && b === null && r === null && config.hasCoin('BTC')).toBe(true);
  });
});

describe('muted chats', () => {
  it('toggles muted state', () => {
    const id = 12345;
    config.setMuted(id, true);
    const first = config.isChatMuted(id);
    config.setMuted(id, false);
    const second = config.isChatMuted(id);
    expect(first === true && second === false).toBe(true);
  });
});
