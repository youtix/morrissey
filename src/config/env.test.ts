import { describe, it, expect, vi } from 'vitest';

describe('env loader', () => {
  it('parses TELEGRAM_ADMIN_IDS and coins', async () => {
    vi.resetModules();
    process.env.TELEGRAM_ADMIN_IDS = '1, 2, x, 3';
    process.env.HYPERLIQUID_COINS = 'BTC, eth ,  ,SOL';
    process.env.TELEGRAM_BOT_TOKEN = '';
    process.env.TELEGRAM_BOT_NAME = '';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { env } = await import('./env');
    const ok = env.TELEGRAM_ADMIN_IDS.has(1) && env.TELEGRAM_ADMIN_IDS.has(3) && env.HYPERLIQUID_COINS.includes('BTC') && env.HYPERLIQUID_COINS.includes('eth') && warnSpy.mock.calls.length >= 1;
    expect(ok).toBe(true);
  });
});

