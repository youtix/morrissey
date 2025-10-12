import { env, type LogLevel } from './env';
import { logger } from '../logging/logger';

export type Weights = {
  notional: number;
  equity: number;
  pos: number;
  f1h: number;
  f24h: number;
};

export type RuntimeConfigSnapshot = {
  NOTIONAL_USD: number;
  ADOPT_THRESHOLD: number;
  HARD_EQ_THRESHOLD: number;
  HARD_NOTIONAL: number;
  WEIGHTS: Weights;
  COINS: string[];
  MUTED_CHATS: number[];
  LOG_LEVEL: LogLevel;
};

const DEFAULT_WEIGHTS: Weights = {
  notional: 0.45,
  equity: 0.35,
  pos: 0.1,
  f1h: 0.06,
  f24h: 0.04,
};

class ConfigStore {
  private notionalUSD = 1_000_000;
  private adoptThreshold = 3.2;
  private hardEqThreshold = 5_000_000;
  private hardNotional = 2_000_000;
  private weights: Weights = { ...DEFAULT_WEIGHTS };
  private coins: Set<string>;
  private mutedChats = new Set<number>();

  constructor() {
    this.coins = new Set(env.HYPERLIQUID_COINS.map((c) => c.toUpperCase()));
  }

  snapshot(): RuntimeConfigSnapshot {
    return {
      NOTIONAL_USD: this.notionalUSD,
      ADOPT_THRESHOLD: this.adoptThreshold,
      HARD_EQ_THRESHOLD: this.hardEqThreshold,
      HARD_NOTIONAL: this.hardNotional,
      WEIGHTS: { ...this.weights },
      COINS: Array.from(this.coins),
      MUTED_CHATS: Array.from(this.mutedChats),
      LOG_LEVEL: logger.getLevel(),
    };
  }

  // Getters
  getNotionalUSD() {
    return this.notionalUSD;
  }
  getAdoptThreshold() {
    return this.adoptThreshold;
  }
  getHardEqThreshold() {
    return this.hardEqThreshold;
  }
  getHardNotional() {
    return this.hardNotional;
  }
  getWeights(): Weights {
    return { ...this.weights };
  }
  getCoins(): string[] {
    return Array.from(this.coins);
  }
  hasCoin(sym: string) {
    return this.coins.has(sym.toUpperCase());
  }

  isChatMuted(chatId: number) {
    return this.mutedChats.has(chatId);
  }

  // Mutations with validation
  setNotionalUSD(val: number): string | null {
    if (!Number.isFinite(val) || val <= 0) return 'Value must be a positive number';
    if (val < 10_000) return 'NOTIONAL_USD must be >= 10000';
    this.notionalUSD = val;
    return null;
  }

  setAdoptThreshold(val: number): string | null {
    if (!Number.isFinite(val)) return 'Value must be a number';
    if (val < 0 || val > 10) return 'ADOPT_THRESHOLD must be between 0 and 10';
    this.adoptThreshold = val;
    return null;
  }

  setHardEqThreshold(val: number): string | null {
    if (!Number.isFinite(val) || val <= 0) return 'Value must be a positive number';
    if (val < 100_000) return 'HARD_EQ_THRESHOLD must be >= 100000';
    this.hardEqThreshold = val;
    return null;
  }

  setHardNotional(val: number): string | null {
    if (!Number.isFinite(val) || val <= 0) return 'Value must be a positive number';
    if (val < 100_000) return 'HARD_NOTIONAL must be >= 100000';
    this.hardNotional = val;
    return null;
  }

  setWeight(key: keyof Weights, val: number): string | null {
    if (!Number.isFinite(val) || val < 0) return 'Weight must be a non-negative number';
    const next = { ...this.weights, [key]: val };
    const sum = next.notional + next.equity + next.pos + next.f1h + next.f24h;
    if (Math.abs(sum - 1) > 1e-6) return 'Weights must sum to 1.0';
    this.weights = next;
    return null;
  }

  addCoin(sym: string): string | null {
    const s = sym.trim().toUpperCase();
    if (!s) return 'Symbol is empty';
    this.coins.add(s);
    return null;
  }

  removeCoin(sym: string): string | null {
    const s = sym.trim().toUpperCase();
    if (!this.coins.has(s)) return `Symbol ${s} not in list`;
    this.coins.delete(s);
    return null;
  }

  setMuted(chatId: number, muted: boolean) {
    if (muted) this.mutedChats.add(chatId);
    else this.mutedChats.delete(chatId);
  }
}

export const config = new ConfigStore();
