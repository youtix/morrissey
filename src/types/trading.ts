export type WhaleHit = {
  coin: string;
  side: 'buy' | 'sell';
  px: number;
  sz: number;
  notional: number;
  time: number;
  buyer: string;
  seller: string;
};
