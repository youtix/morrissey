import { extractEquity, scoreFrom, countPositions, countFillsWithin } from './scoring';
import { telegram } from './telegram';
import { hyperliquid, type Trade } from '../clients/hyperliquidClient';
import { config } from '../config/runtimeConfig';
import { logger } from '../logging/logger';

import type { WhaleHit } from '../types/trading';

export class WhaleWatcherService {
  private subscriptions = new Set<string>();

  async start(): Promise<void> {
    await hyperliquid.connect();
    if (config.getCoins().length === 0) {
      logger.warn('no coins configured');
      return;
    }
    await this.reloadSubscriptions();
    logger.info('subscriptions started', { coins: config.getCoins() });
  }

  async reloadSubscriptions() {
    const coins = config.getCoins();
    for (const coin of coins) {
      if (!this.subscriptions.has(coin)) {
        hyperliquid.subscribeToTrades(coin, (t) => this.onTrades(t));
        this.subscriptions.add(coin);
        logger.info('subscribed coin', { coin });
      }
    }
    // Attempt to remove outdated subscriptions if the SDK exposes a method
    for (const coin of Array.from(this.subscriptions)) {
      if (!coins.includes(coin)) {
        hyperliquid.unSubscribeToTrades(coin);
        this.subscriptions.delete(coin);
        logger.info('unsubscribed coin', { coin });
      }
    }
  }

  private async onTrades(trades: Trade[]) {
    for (const t of trades) {
      const px = Number(t.px);
      const sz = Number(t.sz);
      const notional = px * sz;
      if (notional >= config.getNotionalUSD()) {
        const hit: WhaleHit = {
          coin: t.coin,
          side: t.side === 'B' ? 'buy' : 'sell',
          px,
          sz,
          notional,
          time: t.time,
          buyer: t.users[0],
          seller: t.users[1],
        };
        await this.onWhaleTrade(hit);
      }
    }
  }

  private async onWhaleTrade(hit: WhaleHit) {
    logger.info('whale trade', { hit });

    const [chBuyer, chSeller] = await Promise.all([
      hyperliquid.getClearinghouseState(hit.buyer),
      hyperliquid.getClearinghouseState(hit.seller),
    ]);

    const [portfolioBuyer, portfolioSeller] = await Promise.all([
      hyperliquid.getPortfolio(hit.buyer),
      hyperliquid.getPortfolio(hit.seller),
    ]);

    const [fillsBuyer, fillsSeller] = await Promise.all([
      hyperliquid.getUserFills(hit.buyer),
      hyperliquid.getUserFills(hit.seller),
    ]);

    const equityBuyer = extractEquity(portfolioBuyer as any, chBuyer as any);
    const equitySeller = extractEquity(portfolioSeller as any, chSeller as any);
    const posBuyer = countPositions(chBuyer as any);
    const posSeller = countPositions(chSeller as any);
    const fills1hBuyer = countFillsWithin(fillsBuyer as any[], 60 * 60 * 1000);
    const fills24hBuyer = countFillsWithin(fillsBuyer as any[], 24 * 60 * 60 * 1000);
    const fills1hSeller = countFillsWithin(fillsSeller as any[], 60 * 60 * 1000);
    const fills24hSeller = countFillsWithin(fillsSeller as any[], 24 * 60 * 60 * 1000);

    const scoreBuyer = scoreFrom(
      equityBuyer,
      posBuyer,
      fills1hBuyer,
      fills24hBuyer,
      hit.notional,
      config.getWeights(),
    );
    const scoreSeller = scoreFrom(
      equitySeller,
      posSeller,
      fills1hSeller,
      fills24hSeller,
      hit.notional,
      config.getWeights(),
    );
    const score = Math.max(scoreBuyer, scoreSeller);

    const adopt =
      score >= config.getAdoptThreshold() ||
      equityBuyer >= config.getHardEqThreshold() ||
      equitySeller >= config.getHardEqThreshold() ||
      hit.notional >= config.getHardNotional();

    if (adopt) {
      const payload = {
        coin: hit.coin,
        side: hit.side,
        notional: hit.notional,
        score: Number(score.toFixed(2)),
        buyer: { equity: equityBuyer, positions: posBuyer, f1h: fills1hBuyer, f24h: fills24hBuyer },
        seller: {
          equity: equitySeller,
          positions: posSeller,
          f1h: fills1hSeller,
          f24h: fills24hSeller,
        },
      };
      logger.info('whale adopted', payload as any);

      const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
      const msg = [
        '🐳 <b>Whale trade adopted</b>',
        `${hit.side.toUpperCase()} ${hit.coin}`,
        `Notional: ${fmtUSD(hit.notional)}`,
        `Price: $${hit.px.toLocaleString('en-US')}`,
        `Size: ${hit.sz}`,
        `Score: ${score.toFixed(2)}`,
        `Buyer: <code>${hit.buyer}</code>`,
        `Buyer eq: ${fmtUSD(equityBuyer)} (pos ${posBuyer})`,
        `Seller: <code>${hit.seller}</code>`,
        `Seller eq: ${fmtUSD(equitySeller)} (pos ${posSeller})`,
      ].join('\n');
      await telegram.broadcast(msg, { disableNotification: true });
    } else {
      logger.info('whale skipped', { score: Number(score.toFixed(2)) } as any);
    }
  }
}

export const whaleWatcher = new WhaleWatcherService();
