/**
 * marketIndex.ts - Live Exchange price index and per-stable money flow.
 *
 * The index is the recency-weighted average of what horses actually traded
 * for versus their fair value (100 = trading at value). Rival stables quote
 * bids and asks against fair value × a damped index multiplier, so a hot
 * market lifts prices and a cold one drags them down — bounded so it can't
 * spiral. Money flow is each stable's net Exchange cash over the window;
 * stables that have been paying out more than they take in feel extra cash
 * pressure (list more, bid less, accept lower).
 *
 * Pure, deterministic; reads only recorded trades.
 */
import type { ExchangeTrade } from "@/domains/market/simulation/exchange";

export const MARKET_INDEX_WINDOW_DAYS = 30;
export const MARKET_INDEX_HALF_LIFE_DAYS = 10;
/** Fewer trades than this and the index stays at 100. */
export const MARKET_INDEX_MIN_TRADES = 3;
/** Share of the index move passed into rival quotes (damping prevents runaway). */
export const MARKET_INDEX_PASS_THROUGH = 0.5;
export const MARKET_MULTIPLIER_BOUNDS: readonly [number, number] = [0.85, 1.15];
/** Most extra cash pressure money outflow can add (0-1 scale). */
export const MAX_FLOW_PRESSURE = 0.3;

export type MarketIndex = {
  /** 100 = trades at fair value. */
  value: number;
  /** Multiplier rival stables apply to fair value when quoting. */
  multiplier: number;
  tradeCount: number;
  volume: number;
  /** Index 7 days ago, for the change badge. */
  previous: number;
};

function indexAt(trades: readonly ExchangeTrade[], day: number) {
  let wSum = 0;
  let rSum = 0;
  let count = 0;
  let volume = 0;
  for (const t of trades) {
    if (t.day > day || t.day <= day - MARKET_INDEX_WINDOW_DAYS) continue;
    if (!t.fairValue || t.fairValue <= 0) continue;
    const ratio = Math.min(2, Math.max(0.5, t.price / t.fairValue));
    const w = Math.pow(0.5, (day - t.day) / MARKET_INDEX_HALF_LIFE_DAYS);
    wSum += w;
    rSum += w * ratio;
    count++;
    volume += t.price;
  }
  const ratio = count >= MARKET_INDEX_MIN_TRADES && wSum > 0 ? rSum / wSum : 1;
  return { value: Math.round(ratio * 1000) / 10, count, volume };
}

/** Rival quoting multiplier for an index value. */
export function marketMultiplier(indexValue: number): number {
  const m = 1 + ((indexValue - 100) / 100) * MARKET_INDEX_PASS_THROUGH;
  return Math.min(MARKET_MULTIPLIER_BOUNDS[1], Math.max(MARKET_MULTIPLIER_BOUNDS[0], m));
}

export function computeMarketIndex(trades: readonly ExchangeTrade[], day: number): MarketIndex {
  const now = indexAt(trades, day);
  return {
    value: now.value,
    multiplier: marketMultiplier(now.value),
    tradeCount: now.count,
    volume: now.volume,
    previous: indexAt(trades, day - 7).value,
  };
}

/** Daily index points for a chart. */
export function marketIndexSeries(trades: readonly ExchangeTrade[], day: number, days = 30) {
  const out: { day: number; value: number }[] = [];
  for (let d = Math.max(1, day - days + 1); d <= day; d++) out.push({ day: d, value: indexAt(trades, d).value });
  return out;
}

export type StableMoneyFlow = { inflow: number; outflow: number; net: number };

/** Net Exchange cash per stable over the window (sales net of commission minus purchases). */
export function stableMoneyFlows(
  trades: readonly ExchangeTrade[],
  day: number,
): Map<string, StableMoneyFlow> {
  const flows = new Map<string, StableMoneyFlow>();
  const get = (id: string) => {
    let f = flows.get(id);
    if (!f) flows.set(id, (f = { inflow: 0, outflow: 0, net: 0 }));
    return f;
  };
  for (const t of trades) {
    if (t.day > day || t.day <= day - MARKET_INDEX_WINDOW_DAYS) continue;
    const s = get(t.sellerId);
    s.inflow += t.price - t.commission;
    s.net += t.price - t.commission;
    const b = get(t.buyerId);
    b.outflow += t.price;
    b.net -= t.price;
  }
  return flows;
}

/**
 * Extra cash pressure from money flowing out on the Exchange: paying out a
 * sum equal to remaining cash adds the full MAX_FLOW_PRESSURE.
 */
export function flowPressure(flow: StableMoneyFlow | undefined, cash: number): number {
  if (!flow || flow.net >= 0) return 0;
  const out = -flow.net;
  return Math.min(MAX_FLOW_PRESSURE, (out / Math.max(1, Math.max(0, cash) + out)) * MAX_FLOW_PRESSURE * 2);
}
