import { describe, it, expect, vi } from 'vitest';

describe('Telegram service (public API)', async () => {
  const { telegram } = await import('./telegram');
  const { config } = await import('../config/runtimeConfig');

  it('is not configured without token and name', () => {
    // Ensure empty config
    (telegram as any).token = undefined;
    (telegram as any).botName = undefined;
    expect(telegram.isConfigured()).toBe(false);
  });

  it('sendChatMessage returns false when disabled', async () => {
    (telegram as any).token = undefined;
    (telegram as any).botName = undefined;
    const ok = await telegram.sendChatMessage(1, 'x');
    expect(ok).toBe(false);
  });

  it('broadcast sends to non-muted subscribers only', async () => {
    (telegram as any).token = 't';
    (telegram as any).botName = 'bot';
    // Spy sendChatMessage to always succeed
    const spy = vi.spyOn(telegram, 'sendChatMessage').mockResolvedValue(true);
    // reset subscribers
    (telegram as any).subscribers = new Set<number>();
    telegram.subscribeChat(1);
    telegram.subscribeChat(2);
    config.setMuted(2, true);
    const sent = await telegram.broadcast('hi');
    expect(sent === 1 && spy.mock.calls.length === 1).toBe(true);
  });
});
