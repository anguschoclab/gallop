/**
 * exchange.ts - Bloodstock exchange (order book market)
 *
 * A continuous two-sided market for horses that runs alongside auctions and
 * private sales. Sellers post asks; NPC stables post standing bids. Bids are
 * generated deterministically from the day, horse and stable so the same world
 * state always yields the same book. Prestige of the clearing house scales the
 * commission taken on each trade.
 *
 * Pure logic only - no store access, no mutation of inputs.
 *
 * Dependencies: @/core/horse/pricing, @/core/horse/ownership, @/core/common/rng,
 *   @/core/prestige, @/core/stable/cashPressure
 * Related files: src/game/store/slices/exchangeSlice.ts, src/components/market/Exchange*.tsx
 */

import type { Horse } from "@/core/horse/types";
import type { Stable, StablePersonality } from "@/core/stable/types";
import { horseMarketValue } from "@/core/horse/pricing";
import { isNpcOwned, isPlayerOwned } from "@/core/horse/ownership";
import { createRng } from "@/core/common/rng";
import { prestigeMultiplier } from "@/core/prestige/prestigeTypes";
import { npcAskPrice, npcBidQuote, sellerStance, type ExchangeIntent } from "./exchangeAI";

/** Base commission rate charged by the exchange on the sale proceeds. */
export const EXCHANGE_BASE_COMMISSION = 0.04;
/** Prestige score of the exchange itself (drives commission and bid strength). */
export const EXCHANGE_PRESTIGE = 68;
/** How many days a listing or bid stays live. */
export const EXCHANGE_ORDER_TTL_DAYS = 14;
/** Maximum simultaneous NPC bids per listed horse. */
export const MAX_BIDS_PER_HORSE = 4;

export type ExchangeSide = "ask" | "bid";

export type ExchangeAsk = {
  id: string;
  horseId: string;
  /** "player" or an NPC stable id. */
  sellerId: string;
  sellerName: string;
  price: number;
  /** Reference market valuation at listing time. */
  fairValue: number;
  createdDay: number;
  expiresDay: number;
  /** What the selling stable is trying to achieve (trading-AI signal). */
  intent?: ExchangeIntent;
  /** Seller's cash-pressure meter 0-100 at listing time. */
  pressureMeter?: number;
  /** Lowest price the seller's AI will accept from a standing bid. */
  acceptFloor?: number;
};

export type ExchangeBid = {
  id: string;
  horseId: string;
  /** "player" or an NPC stable id. */
  bidderId: string;
  bidderName: string;
  price: number;
  createdDay: number;
  expiresDay: number;
  /** Why this stable wants the horse — surfaced in the UI. */
  rationale: string;
  /** Bidder's trading posture (trading-AI signal). */
  intent?: ExchangeIntent;
  /** 0-1 measure of how badly the bidder wants the horse. */
  conviction?: number;
};

export type ExchangeTrade = {
  id: string;
  horseId: string;
  horseName: string;
  price: number;
  commission: number;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  day: number;
  /** Which side initiated the fill. */
  initiatedBy: ExchangeSide;
};

export type ExchangeState = {
  asks: ExchangeAsk[];
  bids: ExchangeBid[];
  trades: ExchangeTrade[];
  /** Day the NPC side of the book was last regenerated. */
  lastRefreshDay: number;
};

export function createDefaultExchangeState(): ExchangeState {
  return { asks: [], bids: [], trades: [], lastRefreshDay: 0 };
}

/** Commission rate after prestige scaling (higher prestige, higher fee). */
export function exchangeCommissionRate(prestige = EXCHANGE_PRESTIGE): number {
  return EXCHANGE_BASE_COMMISSION * prestigeMultiplier(prestige, 0.3);
}

/** Commission charged on a trade price. */
export function exchangeCommission(price: number, prestige = EXCHANGE_PRESTIGE): number {
  return Math.round(price * exchangeCommissionRate(prestige));
}

/** Net proceeds a seller receives after commission. */
export function netProceeds(price: number, prestige = EXCHANGE_PRESTIGE): number {
  return price - exchangeCommission(price, prestige);
}

export {
  npcBidPrice,
  npcBidQuote,
  npcAskPrice,
  sellerStance,
  resolveNpcExchangeTrades,
  PERSONALITY_BID_BIAS,
  type BidQuote,
  type SellerStance,
  type ExchangeIntent,
  type NpcSettlement,
} from "./exchangeAI";

/**
 * Regenerate the NPC side of the book: bids against every listed horse, plus
 * NPC asks for horses their owners are willing to move on. Listing counts,
 * markups and bid sizes all come from the trading AI (personality + cash
 * pressure + prestige).
 *
 * @param args.day - Current day
 * @param args.horses - All horses in the world
 * @param args.npcStables - NPC stables
 * @param args.existing - Current exchange state (player asks are preserved)
 * @returns New asks/bids for the NPC side
 */
export function generateNpcBook(args: {
  day: number;
  horses: Horse[];
  npcStables: Stable[];
  existing: ExchangeState;
}): { asks: ExchangeAsk[]; bids: ExchangeBid[] } {
  const { day, horses, npcStables, existing } = args;
  const horseList = horses.filter((h) => h.lifecycleStatus !== "deceased");
  const byId = new Map(horseList.map((h) => [h.id, h]));

  const playerAsks = existing.asks.filter((a) => a.sellerId === "player" && a.expiresDay >= day);

  // --- NPC asks: each stable lists a slice of its string sized by its stance.
  const npcAsks: ExchangeAsk[] = [];
  for (const stable of npcStables) {
    const owned = horseList.filter(
      (h) => isNpcOwned(h) && h.ownership.type === "npc" && h.ownership.stableId === stable.id,
    );
    if (owned.length === 0) continue;
    const stance = sellerStance(stable, owned.length);
    const rng = createRng(`exchAsk:${stable.id}:${day}`);
    const listCount = Math.min(owned.length, stance.listCount);
    const sorted = [...owned].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0; i < listCount; i++) {
      const horse = sorted[Math.floor(rng.next() * sorted.length)];
      if (!horse || horse.consignedSaleId) continue;
      if (npcAsks.some((a) => a.horseId === horse.id)) continue;
      const fairValue = horseMarketValue(horse, horseList);
      if (fairValue <= 0) continue;
      npcAsks.push({
        id: `ask-${stable.id}-${horse.id}-${day}`,
        horseId: horse.id,
        sellerId: stable.id,
        sellerName: stable.name,
        price: npcAskPrice(stance, fairValue, `${horse.id}:${day}`),
        fairValue: Math.round(fairValue),
        createdDay: day,
        expiresDay: day + EXCHANGE_ORDER_TTL_DAYS,
        intent: stance.intent,
        pressureMeter: stance.pressure.meter,
        acceptFloor: Math.round(fairValue * stance.acceptFloor),
      });
    }
  }

  // --- NPC bids: against player listings and other stables' listings.
  const bids: ExchangeBid[] = [];
  const allAsks = [...playerAsks, ...npcAsks];
  for (const ask of allAsks) {
    const horse = byId.get(ask.horseId);
    if (!horse) continue;
    const fairValue = ask.fairValue || horseMarketValue(horse, horseList);
    const rng = createRng(`exchBidPool:${ask.horseId}:${day}`);
    const pool = npcStables
      .filter((s) => s.id !== ask.sellerId && s.cash > fairValue * 0.3)
      .sort((a, b) => a.id.localeCompare(b.id));
    if (pool.length === 0) continue;
    const count = Math.min(MAX_BIDS_PER_HORSE, 1 + Math.floor(rng.next() * MAX_BIDS_PER_HORSE));
    const seen = new Set<string>();
    for (let i = 0; i < count; i++) {
      const stable = pool[Math.floor(rng.next() * pool.length)];
      if (!stable || seen.has(stable.id)) continue;
      seen.add(stable.id);
      const quote = npcBidQuote(horse, stable, day, fairValue);
      if (quote.price <= 0) continue;
      bids.push({
        id: `bid-${stable.id}-${horse.id}-${day}`,
        horseId: horse.id,
        bidderId: stable.id,
        bidderName: stable.name,
        price: quote.price,
        createdDay: day,
        expiresDay: day + EXCHANGE_ORDER_TTL_DAYS,
        rationale: quote.rationale,
        intent: quote.intent,
        conviction: Number(quote.conviction.toFixed(2)),
      });
    }
  }

  return { asks: npcAsks, bids: bids.sort((a, b) => b.price - a.price) };
}


export type OrderBookLevel = { price: number; count: number };

export type HorseOrderBook = {
  horseId: string;
  horseName: string;
  fairValue: number;
  asks: ExchangeAsk[];
  bids: ExchangeBid[];
  bestAsk?: number;
  bestBid?: number;
  /** bestAsk - bestBid, when both sides exist. */
  spread?: number;
  /** Midpoint of best bid/ask, else fair value. */
  mid: number;
  /** Last traded price for this horse, if any. */
  lastTrade?: number;
  isPlayerOwned: boolean;
};

/**
 * Build a per-horse order book for every horse with live orders.
 *
 * @param state - Exchange state
 * @param horses - All horses in the world
 * @param day - Current day (expired orders are excluded)
 */
export function buildOrderBooks(
  state: ExchangeState,
  horses: Horse[],
  day: number,
): HorseOrderBook[] {
  const live = horses.filter((h) => h.lifecycleStatus !== "deceased");
  const byId = new Map(live.map((h) => [h.id, h]));
  const ids = new Set<string>();
  const asks = state.asks.filter((a) => a.expiresDay >= day);
  const bids = state.bids.filter((b) => b.expiresDay >= day);
  for (const a of asks) ids.add(a.horseId);
  for (const b of bids) ids.add(b.horseId);

  const books: HorseOrderBook[] = [];
  for (const horseId of ids) {
    const horse = byId.get(horseId);
    if (!horse) continue;
    const horseAsks = asks.filter((a) => a.horseId === horseId).sort((a, b) => a.price - b.price);
    const horseBids = bids.filter((b) => b.horseId === horseId).sort((a, b) => b.price - a.price);
    const bestAsk = horseAsks[0]?.price;
    const bestBid = horseBids[0]?.price;
    const fairValue = Math.round(horseAsks[0]?.fairValue || horseMarketValue(horse, live));
    const lastTrade = [...state.trades].reverse().find((t) => t.horseId === horseId)?.price;
    books.push({
      horseId,
      horseName: horse.name,
      fairValue,
      asks: horseAsks,
      bids: horseBids,
      bestAsk,
      bestBid,
      spread: bestAsk !== undefined && bestBid !== undefined ? bestAsk - bestBid : undefined,
      mid:
        bestAsk !== undefined && bestBid !== undefined
          ? Math.round((bestAsk + bestBid) / 2)
          : (bestAsk ?? bestBid ?? fairValue),
      lastTrade,
      isPlayerOwned: isPlayerOwned(horse),
    });
  }

  return books.sort((a, b) => b.mid - a.mid);
}

export type MarketDepth = {
  askLevels: OrderBookLevel[];
  bidLevels: OrderBookLevel[];
  totalAskValue: number;
  totalBidValue: number;
  /** Volume-weighted mid across all books. */
  priceIndex: number;
  /** Number of live listings and bids. */
  openAsks: number;
  openBids: number;
  /** Trades in the last 30 days. */
  volume30d: number;
  turnover30d: number;
  /** Median spread across books with two sides. */
  medianSpread: number;
};

const DEPTH_BANDS = [10000, 25000, 50000, 100000, 250000, 500000, 1000000];

function bandFor(price: number): number {
  for (const band of DEPTH_BANDS) if (price <= band) return band;
  return DEPTH_BANDS[DEPTH_BANDS.length - 1] * 2;
}

/**
 * Market-wide depth, price index and volume statistics.
 *
 * @param books - Per-horse order books
 * @param state - Exchange state (for trade history)
 * @param day - Current day
 */
export function buildMarketDepth(
  books: HorseOrderBook[],
  state: ExchangeState,
  day: number,
): MarketDepth {
  const askMap = new Map<number, number>();
  const bidMap = new Map<number, number>();
  let totalAskValue = 0;
  let totalBidValue = 0;
  let openAsks = 0;
  let openBids = 0;
  const spreads: number[] = [];
  let indexSum = 0;

  for (const book of books) {
    for (const a of book.asks) {
      const band = bandFor(a.price);
      askMap.set(band, (askMap.get(band) ?? 0) + 1);
      totalAskValue += a.price;
      openAsks += 1;
    }
    for (const b of book.bids) {
      const band = bandFor(b.price);
      bidMap.set(band, (bidMap.get(band) ?? 0) + 1);
      totalBidValue += b.price;
      openBids += 1;
    }
    if (book.spread !== undefined) spreads.push(book.spread);
    indexSum += book.mid;
  }

  const recent = state.trades.filter((t) => t.day > day - 30);
  const sortedSpreads = spreads.sort((a, b) => a - b);

  return {
    askLevels: Array.from(askMap.entries())
      .map(([price, count]) => ({ price, count }))
      .sort((a, b) => a.price - b.price),
    bidLevels: Array.from(bidMap.entries())
      .map(([price, count]) => ({ price, count }))
      .sort((a, b) => a.price - b.price),
    totalAskValue,
    totalBidValue,
    priceIndex: books.length > 0 ? Math.round(indexSum / books.length) : 0,
    openAsks,
    openBids,
    volume30d: recent.length,
    turnover30d: recent.reduce((sum, t) => sum + t.price, 0),
    medianSpread:
      sortedSpreads.length > 0 ? sortedSpreads[Math.floor(sortedSpreads.length / 2)] : 0,
  };
}

/** Daily traded volume/turnover series for charting. */
export function tradeSeries(
  state: ExchangeState,
  day: number,
  windowDays = 30,
): { day: number; volume: number; turnover: number; avgPrice: number }[] {
  const out: { day: number; volume: number; turnover: number; avgPrice: number }[] = [];
  for (let d = Math.max(1, day - windowDays + 1); d <= day; d++) {
    const trades = state.trades.filter((t) => t.day === d);
    const turnover = trades.reduce((sum, t) => sum + t.price, 0);
    out.push({
      day: d,
      volume: trades.length,
      turnover,
      avgPrice: trades.length > 0 ? Math.round(turnover / trades.length) : 0,
    });
  }
  return out;
}

/** Remove expired orders. */
export function pruneExchange(state: ExchangeState, day: number): ExchangeState {
  return {
    ...state,
    asks: state.asks.filter((a) => a.expiresDay >= day),
    bids: state.bids.filter((b) => b.expiresDay >= day),
    trades: state.trades.slice(-500),
  };
}

/** Suggested listing price band for a horse the player owns. */
export function suggestAskPrice(
  horse: Horse,
  allHorses: Horse[],
): { fairValue: number; low: number; suggested: number; high: number } {
  const fairValue = Math.round(horseMarketValue(horse, allHorses));
  return {
    fairValue,
    low: Math.round((fairValue * 0.9) / 50) * 50,
    suggested: Math.round((fairValue * 1.15) / 50) * 50,
    high: Math.round((fairValue * 1.5) / 50) * 50,
  };
}
