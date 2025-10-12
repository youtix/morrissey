import { logger } from '../logging/logger';

export type AppEnv = 'development' | 'production';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Env {
  NODE_ENV: AppEnv;
  LOG_LEVEL: LogLevel;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_BOT_NAME?: string;
  HYPERLIQUID_COINS: string[];
  TELEGRAM_ADMIN_IDS: Set<number>;
}

function loadEnv(): Env {
  const NODE_ENV = (process.env.NODE_ENV === 'production' ? 'production' : 'development') as AppEnv;
  const LOG_LEVEL =
    (process.env.LOG_LEVEL as LogLevel) || (NODE_ENV === 'development' ? 'debug' : 'info');

  logger.setLevel(LOG_LEVEL);

  const HYPERLIQUID_COINS = (process.env.HYPERLIQUID_COINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || undefined;
  const TELEGRAM_BOT_NAME = process.env.TELEGRAM_BOT_NAME || undefined;
  const TELEGRAM_ADMIN_IDS = new Set<number>(
    (process.env.TELEGRAM_ADMIN_IDS ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter(Number.isFinite),
  );

  if (HYPERLIQUID_COINS.length === 0) {
    // No coins configured; service will start but do nothing — warn the user.
    logger.warn('HYPERLIQUID_COINS is empty — no subscriptions will be created.');
  }

  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN not set — Telegram features disabled.');
  }
  if (!TELEGRAM_BOT_NAME) {
    logger.warn('TELEGRAM_BOT_NAME not set — Telegram features disabled.');
  }

  return {
    NODE_ENV,
    LOG_LEVEL,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_BOT_NAME,
    HYPERLIQUID_COINS,
    TELEGRAM_ADMIN_IDS,
  };
}

export const env = loadEnv();
