import { describe, it, expect, vi } from 'vitest';

import { Logger } from './logger';

describe('Logger', () => {
  it('respects log level threshold', () => {
    const log = new Logger('warn');
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    log.info('hello');
    expect(spy).not.toHaveBeenCalled();
  });

  it('writes to correct console method', () => {
    const log = new Logger('debug');
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    log.warn('msg');
    expect(spyWarn).toHaveBeenCalledTimes(1);
  });
});

