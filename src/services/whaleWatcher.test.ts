import { describe, it, expect, vi } from 'vitest';

import { WhaleWatcherService } from './whaleWatcher';

vi.mock('../clients/hyperliquidClient', () => {
  return {
    hyperliquid: {
      connect: vi.fn(),
      subscribeToTrades: vi.fn(),
      unSubscribeToTrades: vi.fn(),
      getClearinghouseState: vi.fn().mockResolvedValue({ equity: 1_000_000 }),
      getPortfolio: vi.fn().mockResolvedValue({ equity: 1_000_000 }),
      getUserFills: vi.fn().mockResolvedValue([]),
    },
  };
});


vi.mock('../services/telegram', () => ({
  telegram: {
    broadcast: vi.fn().mockResolvedValue(1),
  },
}));

vi.mock('../logging/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    setLevel: vi.fn(),
  },
}));

describe('WhaleWatcherService', async () => {
  const svc = new WhaleWatcherService();
  const { hyperliquid } = await import('../clients/hyperliquidClient');
  const { config } = await import('../config/runtimeConfig');
  const { telegram } = await import('./telegram');

  it('start connects and subscribes when coins configured', async () => {
    vi.spyOn(config, 'getCoins').mockReturnValue(['BTC']);
    await svc.start();
    const called = (hyperliquid.connect as any).mock.calls.length === 1 && (hyperliquid.subscribeToTrades as any).mock.calls.length === 1;
    expect(called).toBe(true);
  });

  it('reloadSubscriptions adds new and removes old coins', async () => {
    vi.spyOn(config, 'getCoins').mockReturnValueOnce(['BTC', 'ETH']);
    await svc.reloadSubscriptions();
    const addCalled = (hyperliquid.subscribeToTrades as any).mock.calls.some((c: any[]) => c[0] === 'ETH');
    ;(config.getCoins as any).mockReturnValueOnce(['BTC']);
    await svc.reloadSubscriptions();
    const removeCalled = (hyperliquid.unSubscribeToTrades as any).mock.calls.some((c: any[]) => c[0] === 'ETH');
    expect(addCalled && removeCalled).toBe(true);
  });

  it('onTrades triggers onWhaleTrade for large notionals only', async () => {
    vi.spyOn(config, 'getNotionalUSD').mockReturnValue(1000);
    const spy = vi.spyOn<any, any>(svc as any, 'onWhaleTrade').mockResolvedValue(undefined);
    const trades = [
      { coin: 'BTC', side: 'B', px: 10, sz: 10, time: Date.now(), users: ['b','s'] }, // 100 >= 1000? no
      { coin: 'BTC', side: 'S', px: 100, sz: 20, time: Date.now(), users: ['b','s'] }, // 2000 >= 1000 yes
    ];
    await (svc as any).onTrades(trades);
    expect(spy.mock.calls.length === 1).toBe(true);
  });

  it('onWhaleTrade adopts and broadcasts when score high', async () => {
    // Lower adopt threshold to ensure adoption
    vi.spyOn(config, 'getAdoptThreshold').mockReturnValueOnce(0.1);
    await (svc as any).onWhaleTrade({
      coin: 'BTC', side: 'buy', px: 100, sz: 50, notional: 5000, time: Date.now(), buyer: 'b', seller: 's',
    });
    expect((telegram.broadcast as any).mock.calls.length >= 1).toBe(true);
  });
});
