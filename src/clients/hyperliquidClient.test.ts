import { describe, it, expect, vi } from 'vitest';

vi.mock('hyperliquid', () => {
  class FakeHyperliquid {
    connected = false;
    subscriptions = {
      subscribeToTrades: vi.fn(),
      unsubscribeFromTrades: vi.fn(),
    };
    info: any = {
      perpetuals: { getClearinghouseState: vi.fn() },
      portfolio: vi.fn(),
      getUserFills: vi.fn(),
    };
    async connect() {
      this.connected = true;
    }
  }
  return { Hyperliquid: FakeHyperliquid };
});

describe('hyperliquid client wrapper', async () => {
  const mod = await import('./hyperliquidClient');
  const client = mod.hyperliquid;

  it('connects underlying SDK', async () => {
    await client.connect();
    const sdk = (client as any).sdk;
    expect(sdk.connected).toBe(true);
  });

  it('subscribes and unsubscribes to trades', () => {
    const sdk = (client as any).sdk;
    const cb = () => {};
    client.subscribeToTrades('BTC', cb);
    const called = sdk.subscriptions.subscribeToTrades.mock.calls[0]?.[0] === 'BTC';
    client.unSubscribeToTrades('BTC');
    const uncalled = sdk.subscriptions.unsubscribeFromTrades.mock.calls[0]?.[0] === 'BTC';
    expect(called && uncalled).toBe(true);
  });

  it('getClearinghouseState returns null on failure', async () => {
    const sdk = (client as any).sdk;
    sdk.info.perpetuals.getClearinghouseState.mockRejectedValue(new Error('boom'));
    const v = await client.getClearinghouseState('addr');
    expect(v === null).toBe(true);
  });

  it('getPortfolio returns value when function exists', async () => {
    const sdk = (client as any).sdk;
    sdk.info.portfolio.mockResolvedValue({ ok: true });
    const v = await client.getPortfolio('addr');
    expect(!!v && (v as any).ok === true).toBe(true);
  });

  it('getUserFills returns [] on failure', async () => {
    const sdk = (client as any).sdk;
    sdk.info.getUserFills.mockRejectedValue(new Error('nope'));
    const v = await client.getUserFills('addr');
    expect(Array.isArray(v) && v.length === 0).toBe(true);
  });
});

