import { env, type LogLevel } from '../config/env';
import pkg from '../../package.json';

type Levels = Record<LogLevel, number>;
const LEVELS: Levels = { debug: 10, info: 20, warn: 30, error: 40 } as const;

export class Logger {
  private current: LogLevel;
  private context: Record<string, unknown>;

  constructor(level: LogLevel = 'info', context: Record<string, unknown> = {}) {
    this.current = level;
    this.context = context;
  }

  setLevel(level: LogLevel) {
    this.current = level;
  }
  getLevel() {
    return this.current;
  }

  private shouldLog(level: LogLevel) {
    return LEVELS[level] >= LEVELS[this.current];
  }

  private write(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;
    const entry = {
      level,
      time: new Date().toISOString(),
      msg,
      ...this.context,
      ...(meta || {}),
    };
    // Structured log as JSON
    if (level === 'error') console.error(JSON.stringify(entry));
    else if (level === 'warn') console.warn(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  }

  debug(msg: string, meta?: Record<string, unknown>) {
    this.write('debug', msg, meta);
  }
  info(msg: string, meta?: Record<string, unknown>) {
    this.write('info', msg, meta);
  }
  warn(msg: string, meta?: Record<string, unknown>) {
    this.write('warn', msg, meta);
  }
  error(msg: string, meta?: Record<string, unknown>) {
    this.write('error', msg, meta);
  }
}

export const logger = new Logger('debug', { service: pkg.name });
