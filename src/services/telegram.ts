import pkg from '../../package.json';
import { env, type LogLevel } from '../config/env';
import { config } from '../config/runtimeConfig';
import { logger } from '../logging/logger';

// Avoid runtime circular deps: define the watcher interface we need
export interface WatcherControls {
  reloadSubscriptions(): Promise<void>;
}

type SendOpts = {
  parseMode?: 'HTML' | 'MarkdownV2';
  disableNotification?: boolean;
};

class TelegramService {
  private subscribers = new Set<number>();
  private offset: number | undefined;
  private lastCmdAt = new Map<number, number>();
  private running = false;
  private admins: Set<number>;
  private token: string | undefined;
  private botName: string | undefined;
  private watcher?: WatcherControls | null;

  constructor() {
    this.admins = env.TELEGRAM_ADMIN_IDS;
    this.token = env.TELEGRAM_BOT_TOKEN;
    this.botName = env.TELEGRAM_BOT_NAME;
  }

  attachWatcher(w: WatcherControls) {
    this.watcher = w;
  }

  // Basic client helpers
  isConfigured() {
    return Boolean(this.token) && Boolean(this.botName);
  }

  async apiCall<T = any>(method: string, payload: Record<string, unknown>): Promise<T | null> {
    if (!this.isConfigured()) {
      logger.debug('Telegram disabled or not configured');
      return null;
    }
    const url = `https://api.telegram.org/bot${this.token}/${method}`;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return (await res.json()) as T;
    } catch (err) {
      logger.error('telegram api failed', { method, err: String(err) });
      return null;
    }
  }

  async getUpdates(offset?: number, timeoutSec = 30): Promise<any[] | null> {
    const res: any = await this.apiCall('getUpdates', {
      offset,
      timeout: timeoutSec,
      allowed_updates: ['message', 'callback_query'],
    });
    if (!res || !res.ok) return [];
    return res.result as any[];
  }

  async sendChatMessage(
    chatId: number | string,
    text: string,
    opts: SendOpts = {},
  ): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const parse_mode = opts.parseMode || 'HTML';
    const disable_notification = opts.disableNotification ?? true;
    const res: any = await this.apiCall('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode,
      disable_web_page_preview: true,
      disable_notification,
    });
    return Boolean(res && res.ok);
  }

  subscribeChat(chatId: number) {
    this.subscribers.add(Number(chatId));
  }

  unsubscribeChat(chatId: number) {
    this.subscribers.delete(Number(chatId));
  }

  listSubscribers(): number[] {
    return Array.from(this.subscribers);
  }

  async broadcast(text: string, opts: SendOpts = {}): Promise<number> {
    if (!this.isConfigured()) return 0;
    let sent = 0;
    for (const chatId of this.subscribers) {
      if (config.isChatMuted(chatId)) continue;
      const ok = await this.sendChatMessage(chatId, text, opts);
      if (ok) sent++;
    }
    return sent;
  }

  // Bot lifecycle
  start() {
    if (!this.isConfigured()) {
      logger.warn('telegram bot disabled (no token)');
      return;
    }
    if (this.running) return;
    this.running = true;
    this.pollLoop().catch((e) => logger.error('telegram poller crash', { err: String(e) }));
  }

  private async pollLoop() {
    logger.info('telegram poller started');
    while (this.running) {
      const updates = (await this.getUpdates(this.offset, 30)) || [];
      for (const upd of updates) {
        this.offset = Math.max(this.offset || 0, upd.update_id + 1);
        try {
          await this.handleUpdate(upd);
        } catch (err) {
          logger.error('update handling failed', { err: String(err) });
        }
      }
    }
  }

  // Command handling
  private isCommand(text: string) {
    return typeof text === 'string' && text.trim().startsWith('/');
  }

  private parseCtx(update: any) {
    const msg = update.message || update.edited_message || update.channel_post;
    if (!msg) return null;
    const text: string = msg.text || '';
    const chatId: number = msg.chat?.id;
    const chatType: string = msg.chat?.type || 'private';
    const userId: number | null = msg.from?.id || null;
    if (typeof chatId !== 'number') return null;
    return { chatId, userId, text, chatType } as const;
  }

  private rateLimited(chatId: number) {
    const now = Date.now();
    const last = this.lastCmdAt.get(chatId) || 0;
    if (now - last < 1000) return true;
    this.lastCmdAt.set(chatId, now);
    return false;
  }

  private requireAdmin(userId: number | null): boolean {
    return !!(userId && this.admins.has(userId));
  }

  private async handleUpdate(update: any) {
    const ctx = this.parseCtx(update);
    if (!ctx) return;
    // Only commands in groups; everywhere else, still prefer commands for simplicity
    if (ctx.chatType.includes('group') && !this.isCommand(ctx.text)) return;
    if (!this.isCommand(ctx.text)) return;
    if (this.rateLimited(ctx.chatId)) return;

    // Auto-subscribe chat when any command is received
    this.subscribeChat(ctx.chatId);

    const [raw = '', botId] = ctx.text.trim().split('@');
    if (botId !== this.botName) return;
    const cmd = raw?.split('\n')[0]?.trim();
    // split by space or underscore
    const parts = cmd?.split(/[\s_]+/) ?? [];
    const base = parts[0]?.toLowerCase() ?? '';

    switch (true) {
      case base.startsWith('/help'):
        await this.onHelp(ctx.chatId);
        break;
      case base.startsWith('/ping'):
        await this.reply(ctx.chatId, 'pong');
        break;
      case base.startsWith('/version'):
        await this.onVersion(ctx.chatId);
        break;
      case base.startsWith('/status'):
        await this.onStatus(ctx.chatId);
        break;
      case base.startsWith('/thresholds'):
        await this.onThresholds(ctx.chatId);
        break;
      case base.startsWith('/get'):
        await this.onGet(ctx.chatId, parts);
        break;
      case base.startsWith('/set'):
        if (!this.requireAdmin(ctx.userId)) {
          await this.reply(ctx.chatId, 'Unauthorized');
          break;
        }
        await this.onSet(ctx.chatId, raw);
        break;
      case base.startsWith('/coins'):
        await this.onCoins(ctx.chatId, raw, this.requireAdmin(ctx.userId));
        break;
      case base.startsWith('/mute'):
        config.setMuted(ctx.chatId, true);
        await this.reply(ctx.chatId, 'Muted alerts for this chat.');
        break;
      case base.startsWith('/unmute'):
        config.setMuted(ctx.chatId, false);
        await this.reply(ctx.chatId, 'Unmuted alerts for this chat.');
        break;
      case base.startsWith('/loglevel'):
        await this.onLogLevel(ctx.chatId, raw, this.requireAdmin(ctx.userId));
        break;
      default:
        await this.reply(ctx.chatId, 'Unknown command. Use /help');
        break;
    }
  }

  private async reply(chatId: number, text: string) {
    await this.sendChatMessage(chatId, text, { disableNotification: true });
  }

  // Command implementations
  private async onHelp(chatId: number) {
    const lines = [
      '<b>Commands</b>',
      '/status — current config state',
      '/thresholds — show thresholds and weights',
      '/get_KEY — read a value (e.g., /get_NOTIONAL_USD)',
      '/set_KEY_VALUE — set a value (admin)',
      '/coins_list — list coins',
      '/coins_add_SYMBOL — add coin (admin)',
      '/coins_remove_SYMBOL — remove coin (admin)',
      '/mute, /unmute — toggle alerts for this chat',
      '/loglevel_LEVEL — debug|info|warn|error (admin)',
      '/version, /ping',
      '',
      'Keys: NOTIONAL_USD, ADOPT_THRESHOLD, HARD_EQ_THRESHOLD, HARD_NOTIONAL, WEIGHT_NOTIONAL, WEIGHT_EQUITY, WEIGHT_POS, WEIGHT_F1H, WEIGHT_F24H',
    ];
    await this.reply(chatId, lines.join('\n'));
  }

  private async onVersion(chatId: number) {
    try {
      await this.reply(chatId, `Version: ${pkg.version || 'unknown'}`);
    } catch {
      await this.reply(chatId, 'Version: unknown');
    }
  }

  private async onStatus(chatId: number) {
    const snap = config.snapshot();
    const muted = snap.MUTED_CHATS.includes(chatId) ? 'yes' : 'no';
    const lines = [
      '<b>Status</b>',
      `Log level: ${snap.LOG_LEVEL}`,
      `Coins: ${snap.COINS.join(', ') || 'none'}`,
      `Muted in this chat: ${muted}`,
      `NOTIONAL_USD: ${snap.NOTIONAL_USD}`,
      `ADOPT_THRESHOLD: ${snap.ADOPT_THRESHOLD}`,
      `HARD_EQ_THRESHOLD: ${snap.HARD_EQ_THRESHOLD}`,
      `HARD_NOTIONAL: ${snap.HARD_NOTIONAL}`,
      `Weights: notional=${snap.WEIGHTS.notional}, equity=${snap.WEIGHTS.equity}, pos=${snap.WEIGHTS.pos}, f1h=${snap.WEIGHTS.f1h}, f24h=${snap.WEIGHTS.f24h}`,
    ];
    await this.reply(chatId, lines.join('\n'));
  }

  private async onThresholds(chatId: number) {
    const s = config.snapshot();
    const w = s.WEIGHTS;
    const lines = [
      '<b>Thresholds</b>',
      `ADOPT_THRESHOLD: ${s.ADOPT_THRESHOLD}`,
      `HARD_EQ_THRESHOLD: ${s.HARD_EQ_THRESHOLD}`,
      `NOTIONAL_USD: ${s.NOTIONAL_USD}`,
      `HARD_NOTIONAL: ${s.HARD_NOTIONAL}`,
      '<b>Weights (sum=1)</b>',
      `notional=${w.notional}, equity=${w.equity}, pos=${w.pos}, f1h=${w.f1h}, f24h=${w.f24h}`,
    ];
    await this.reply(chatId, lines.join('\n'));
  }

  private async onGet(chatId: number, parts: string[]) {
    const key = (parts[0]?.split('_')[1] || '').toUpperCase();
    if (!key) return this.reply(chatId, 'Usage: /get_KEY');
    const s = config.snapshot();
    const map: Record<string, any> = {
      NOTIONAL_USD: s.NOTIONAL_USD,
      ADOPT_THRESHOLD: s.ADOPT_THRESHOLD,
      HARD_EQ_THRESHOLD: s.HARD_EQ_THRESHOLD,
      HARD_NOTIONAL: s.HARD_NOTIONAL,
      WEIGHT_NOTIONAL: s.WEIGHTS.notional,
      WEIGHT_EQUITY: s.WEIGHTS.equity,
      WEIGHT_POS: s.WEIGHTS.pos,
      WEIGHT_F1H: s.WEIGHTS.f1h,
      WEIGHT_F24H: s.WEIGHTS.f24h,
    };
    if (!(key in map)) return this.reply(chatId, `Unknown key ${key}`);
    await this.reply(chatId, `${key} = ${map[key]}`);
  }

  private async onSet(chatId: number, raw: string) {
    const firstLine = raw.trim().split('\n')[0] ?? '';
    const regex = /^(\/set)_([A-Z0-9_]+)_([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/;
    const match = regex.exec(firstLine);
    if (!match) return this.reply(chatId, 'Usage: /set_KEY_VALUE');
    const key = (match[2] ?? '').toUpperCase();
    const val = Number(match[3]);
    if (!Number.isFinite(val)) return this.reply(chatId, 'Value must be a number');
    let err: string | null = 'Unknown key';
    switch (key) {
      case 'NOTIONAL_USD':
        err = config.setNotionalUSD(val);
        break;
      case 'ADOPT_THRESHOLD':
        err = config.setAdoptThreshold(val);
        break;
      case 'HARD_EQ_THRESHOLD':
        err = config.setHardEqThreshold(val);
        break;
      case 'HARD_NOTIONAL':
        err = config.setHardNotional(val);
        break;
      case 'WEIGHT_NOTIONAL':
        err = config.setWeight('notional', val);
        break;
      case 'WEIGHT_EQUITY':
        err = config.setWeight('equity', val);
        break;
      case 'WEIGHT_POS':
        err = config.setWeight('pos', val);
        break;
      case 'WEIGHT_F1H':
        err = config.setWeight('f1h', val);
        break;
      case 'WEIGHT_F24H':
        err = config.setWeight('f24h', val);
        break;
      default:
        break;
    }
    if (err) return this.reply(chatId, `Rejected: ${err}`);
    await this.reply(chatId, `Updated ${key} to ${val}`);
  }

  private async onCoins(chatId: number, raw: string, isAdmin: boolean) {
    const segs = raw.trim().split(/[\s_]+/);
    const action = (segs[1] || '').toLowerCase();
    if (!action || action === 'list') {
      const coins = config.getCoins();
      return this.reply(chatId, `Coins: ${coins.join(', ') || 'none'}`);
    }
    if (!isAdmin) return this.reply(chatId, 'Unauthorized');
    const sym = segs[2];
    if (!sym) return this.reply(chatId, 'Usage: /coins_add_SYMBOL or /coins_remove_SYMBOL');
    let err: string | null = null;
    if (action === 'add') err = config.addCoin(sym);
    else if (action === 'remove') err = config.removeCoin(sym);
    else return this.reply(chatId, 'Unknown coins action');
    if (err) return this.reply(chatId, `Rejected: ${err}`);
    if (this.watcher) await this.watcher.reloadSubscriptions();
    const coins = config.getCoins();
    await this.reply(chatId, `Updated coins. Now subscribed: ${coins.join(', ') || 'none'}`);
  }

  private async onLogLevel(chatId: number, raw: string, isAdmin: boolean) {
    if (!isAdmin) return this.reply(chatId, 'Unauthorized');
    const segs = raw.trim().split(/[\s_]+/);
    const level = (segs[1] || '').toLowerCase();
    if (!['debug', 'info', 'warn', 'error'].includes(level)) {
      return this.reply(chatId, 'Usage: /loglevel_LEVEL (debug|info|warn|error)');
    }
    logger.setLevel(level as LogLevel);
    await this.reply(chatId, `Log level set to ${level}`);
  }
}

export const telegram = new TelegramService();
