/**
 * exchangeAI.ts - NPC trading AI for the bloodstock exchange
 *
 * Gives NPC stables real trading behaviour on the exchange: they decide how
 * many horses to offer and at what markup, how aggressively to bid, and when to
 * accept a standing bid on one of their own listings. Every decision blends
 * three signals:
 *
 *   1. Personality  - appetite, markup discipline and patience.
 *   2. Cash pressure - a squeezed stable lists more and accepts less.
 *   3. Prestige      - reputable stables demand (and can command) more.
 *
 * Pure logic only: NPC-vs-NPC crossings are returned as a settlement plan that
 * the store slice applies.
 *
 * Dependencies: @/core/horse/pricing, @/core/horse/ownership, @/core/common/rng,
 *   @/core/stable/cashPressure, ./exchange (types only)
 * Related files: src/core/market/exchange.ts, src/game/store/slices/exchangeSlice.ts,
 *   src/components/market/TradeTape.tsx
 */

import type { Horse } from "@/core/horse/types";
import type { Stable, StablePersonality } from "@/core/stable/types";
import { createRng } from "@/core/common/rng";
import { evaluateCashPressure, type CashPressure } from "@/core/stable/cashPressure";
import type { ExchangeAsk, ExchangeBid, ExchangeState, ExchangeTrade } from "./exchange";

/** How a stable is behaving on the exchange right now. */
export type ExchangeIntent = "accumulating" | "opportunistic" | "flipping" | "raising cash";

export type SellerStance = {
  stableId: string;
  /** How many horses this stable is willing to have listed at once. */
  listCount: number;
  /** Multiple of fair value the stable asks for. */
  markup: number;
  /** Lowest fraction of fair value it will accept from a standing bid. */
  acceptFloor: number;
  pressure: CashPressure;
  intent: ExchangeIntent;
};

export type BidQuote = {
  price: number;
  rationale: string;
  intent: ExchangeIntent;
  /** 0-1 signal of how badly the bidder wants the horse. */
  conviction: number;
};

/** Personality appetite multipliers applied to NPC bid prices. */
export const PERSONALITY_BID_BIAS: Record<StablePersonality, number> = {
  aggressive: 1.12,
  "win-now": 1.1,
  prestige: 1.08,
  trader: 1.02,
  breeder: 1.0,
  developer: 0.96,
  specialist: 0.95,
  conservative: 0.9,
};

/** How much markup each personality demands when selling. */
const PERSONALITY_ASK_MARKUP: Record<StablePersonality, number> = {
  trader: 1.12,
  aggressive: 1.2,
  "win-now": 1.22,
  prestige: 1.35,
  breeder: 1.3,
  developer: 1.28,
  specialist: 1.26,
  conservative: 1.18,
};

/** Base number of simultaneous listings by personality. */
const PERSONALITY_LIST_COUNT: Record<StablePersonality, number> = {
  trader: 3,
  aggressive: 2,
  "win-now": 2,
  conservative: 2,
  developer: 1,
  specialist: 1,
  breeder: 1,
  prestige: 1,
};

const PERSONALITY_RATIONALE: Record<StablePersonality, string> = {
  aggressive: "Buying up runners regardless of price",
  "win-now": "Chasing immediate black type",
  prestige: "Wants a marquee name in the yard",
  trader: "Sees a flip margin at this level",
  breeder: "Targeting future broodmare/stallion stock",
  developer: "Patient money on a young project",
  specialist: "Fits a narrow surface/trip programme",
  conservative: "Will only buy under fair value",
};

const PERSONALITY_INTENT: Record<StablePersonality, ExchangeIntent> = {
  aggressive: "accumulating",
  "win-now": "accumulating",
  prestige: "accumulating",
  trader: "flipping",
  breeder: "accumulating",
  developer: "opportunistic",
  specialist: "opportunistic",
  conservative: "opportunistic",
};

/** Reputation 0-100 mapped to a gentle price multiplier around 1. */
function prestigePull(reputation: number, strength = 1): number {
  return 1 + (((reputation ?? 50) - 50) / 500) * strength;
}

/**
 * Work out how a stable is positioned as a seller today.
 *
 * @param stable - The NPC stable
 * @param horseCount - Number of horses it owns (defaults to roster length)
 */
export function sellerStance(stable: Stable, horseCount?: number): SellerStance {
  const pressure = evaluateCashPressure(stable, horseCount);
  const base = PERSONALITY_LIST_COUNT[stable.personality] ?? 2;
  // Squeezed stables put more of the string on the market.
  const listCount = Math.min(6, base + Math.round(pressure.pressure * 3));

  const markup =
    (PERSONALITY_ASK_MARKUP[stable.personality] ?? 1.25) *
    prestigePull(stable.reputation, 2) *
    (1 - pressure.pressure * 0.22);

  // Prestige houses hold out; desperate ones take what's on the screen.
  const acceptFloor = Math.max(
    0.55,
    0.98 * prestigePull(stable.reputation, 1.5) - pressure.pressure * 0.3,
  );

  const intent: ExchangeIntent =
    pressure.pressure >= 0.5
      ? "raising cash"
      : (PERSONALITY_INTENT[stable.personality] ?? "opportunistic");

  return { stableId: stable.id, listCount, markup: Math.max(0.85, markup), acceptFloor, pressure, intent };
}

/**
 * Ask price an NPC stable posts for one of its horses.
 *
 * @param stance - Seller stance for the owning stable
 * @param fairValue - Reference market value
 * @param seed - Deterministic seed (horse + day)
 */
export function npcAskPrice(stance: SellerStance, fairValue: number, seed: string): number {
  const rng = createRng(`exchAskPrice:${seed}`);
  const noise = rng.range(0.96, 1.08);
  return Math.max(50, Math.round((fairValue * stance.markup * noise) / 50) * 50);
}

/**
 * Bid an NPC stable is willing to post for a horse, with the reasoning that
 * produced it. Cash-pressured stables bid less (or not at all); reputable
 * stables stretch a little further.
 *
 * @param horse - Horse being bid on
 * @param stable - Bidding stable
 * @param day - Current game day
 * @param fairValue - Reference market value
 */
export function npcBidQuote(
  horse: Horse,
  stable: Stable,
  day: number,
  fairValue: number,
): BidQuote {
  const rng = createRng(`exch:${horse.id}:${stable.id}:${day}`);
  const pressure = evaluateCashPressure(stable);
  const bias = PERSONALITY_BID_BIAS[stable.personality] ?? 1;
  const noise = rng.range(0.82, 1.06);

  // Squeezed buyers pull their horns in hard.
  const pressureDamp = 1 - pressure.pressure * 0.55;
  const raw = fairValue * bias * noise * prestigePull(stable.reputation) * pressureDamp;

  // Cash discipline tightens as the runway shortens.
  const cashSlice = 0.35 * (1 - pressure.pressure * 0.7);
  const capped = Math.min(raw, stable.cash * cashSlice);
  const price = Math.max(0, Math.round(capped / 50) * 50);

  const rationale =
    pressure.pressure >= 0.5
      ? `Short of cash (${pressure.label}) — bargain hunting only`
      : (PERSONALITY_RATIONALE[stable.personality] ?? "Adding to the string");

  return {
    price,
    rationale,
    intent: pressure.pressure >= 0.5 ? "raising cash" : (PERSONALITY_INTENT[stable.personality] ?? "opportunistic"),
    conviction: Math.max(0, Math.min(1, (price / Math.max(1, fairValue)) * (1 - pressure.pressure * 0.4))),
  };
}

/** Backwards-compatible price-only helper. */
export function npcBidPrice(horse: Horse, stable: Stable, day: number, fairValue: number): number {
  return npcBidQuote(horse, stable, day, fairValue).price;
}

export type NpcSettlement = {
  trades: ExchangeTrade[];
  /** horseId -> new owning stable id. */
  ownershipChanges: { horseId: string; buyerStableId: string }[];
  /** stableId -> net cash delta. */
  cashDeltas: Record<string, number>;
  /** Ask/bid ids consumed by the crossings. */
  filledAskIds: string[];
  filledBidIds: string[];
};

/**
 * Cross the NPC side of the book: where a standing NPC bid clears the seller's
 * accept floor, the trade settles and lands on the live trade tape. Player
 * orders are never touched.
 *
 * @param args.day - Current day
 * @param args.state - Live exchange state
 * @param args.horses - All horses in the world
 * @param args.npcStables - NPC stables
 * @param args.commission - Commission function for the exchange
 * @param args.maxTrades - Cap on crossings per day
 */
export function resolveNpcExchangeTrades(args: {
  day: number;
  state: ExchangeState;
  horses: Horse[];
  npcStables: Stable[];
  commission: (price: number) => number;
  maxTrades?: number;
  makeId?: (askId: string, bidId: string) => string;
}): NpcSettlement {
  const { day, state, horses, npcStables, commission } = args;
  const maxTrades = args.maxTrades ?? 5;
  const makeId = args.makeId ?? ((askId, bidId) => `trade-${day}-${askId}-${bidId}`);

  const byHorse = new Map(horses.map((h) => [h.id, h]));
  const byStable = new Map(npcStables.map((s) => [s.id, s]));
  const stances = new Map<string, SellerStance>();
  const cashDeltas: Record<string, number> = {};
  const cashOf = (id: string) => (byStable.get(id)?.cash ?? 0) + (cashDeltas[id] ?? 0);

  const trades: ExchangeTrade[] = [];
  const ownershipChanges: { horseId: string; buyerStableId: string }[] = [];
  const filledAskIds: string[] = [];
  const filledBidIds: string[] = [];
  const tradedHorses = new Set<string>();

  const npcAsks = state.asks
    .filter((a) => a.sellerId !== "player" && a.expiresDay >= day && byStable.has(a.sellerId))
    .sort((a, b) => a.price - b.price);

  for (const ask of npcAsks) {
    if (trades.length >= maxTrades) break;
    if (tradedHorses.has(ask.horseId)) continue;
    const horse = byHorse.get(ask.horseId);
    const seller = byStable.get(ask.sellerId);
    if (!horse || !seller) continue;

    let stance = stances.get(seller.id);
    if (!stance) {
      stance = sellerStance(seller);
      stances.set(seller.id, stance);
    }

    const fairValue = ask.fairValue > 0 ? ask.fairValue : ask.price;
    const floorPrice = fairValue * stance.acceptFloor;

    const candidates = state.bids
      .filter(
        (b) =>
          b.horseId === ask.horseId &&
          b.expiresDay >= day &&
          b.bidderId !== "player" &&
          b.bidderId !== seller.id &&
          byStable.has(b.bidderId),
      )
      .sort((a, b) => b.price - a.price);

    const bid = candidates.find((b) => b.price >= floorPrice && cashOf(b.bidderId) >= b.price);
    if (!bid) continue;
    const buyer = byStable.get(bid.bidderId);
    if (!buyer) continue;

    const fee = commission(bid.price);
    trades.push({
      id: makeId(ask.id, bid.id),
      horseId: horse.id,
      horseName: horse.name,
      price: bid.price,
      commission: fee,
      buyerId: buyer.id,
      buyerName: buyer.name,
      sellerId: seller.id,
      sellerName: seller.name,
      day,
      initiatedBy: "bid",
    });
    ownershipChanges.push({ horseId: horse.id, buyerStableId: buyer.id });
    cashDeltas[buyer.id] = (cashDeltas[buyer.id] ?? 0) - bid.price;
    cashDeltas[seller.id] = (cashDeltas[seller.id] ?? 0) + (bid.price - fee);
    filledAskIds.push(ask.id);
    filledBidIds.push(bid.id);
    tradedHorses.add(horse.id);
  }

  return { trades, ownershipChanges, cashDeltas, filledAskIds, filledBidIds };
}

export type { ExchangeAsk, ExchangeBid };
