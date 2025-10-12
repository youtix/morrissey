import { Hyperliquid } from 'hyperliquid';

export type Trade = {
  coin: string;
  side: 'B' | 'S';
  px: number;
  sz: number;
  time: number;
  users: [string, string];
};

class HyperliquidClient {
  private sdk: Hyperliquid;

  constructor() {
    this.sdk = new Hyperliquid({ enableWs: true });
  }

  async connect() {
    await this.sdk.connect();
  }

  subscribeToTrades(coin: string, cb: (trades: Trade[]) => void) {
    this.sdk.subscriptions.subscribeToTrades(coin, cb);
  }

  unSubscribeToTrades(coin: string) {
    this.sdk.subscriptions.unsubscribeFromTrades(coin);
  }

  async getClearinghouseState(addr: string): Promise<any | null> {
    try {
      return await this.sdk.info.perpetuals.getClearinghouseState(addr);
    } catch {
      return null;
    }
  }

  async getPortfolio(addr: string): Promise<any | null> {
    try {
      // Some SDK versions expose portfolio as a function
      if (typeof this.sdk.info.portfolio === 'function') {
        return await this.sdk.info.portfolio(addr);
      }
      return null;
    } catch {
      return null;
    }
  }

  async getUserFills(addr: string): Promise<any[]> {
    try {
      if (typeof this.sdk.info.getUserFills === 'function') {
        return await this.sdk.info.getUserFills(addr);
      }
      return [];
    } catch {
      return [];
    }
  }
}

export const hyperliquid = new HyperliquidClient();
