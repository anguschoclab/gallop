/**
 * strategy.ts - Buying strategy runner for the Exchange and Auction Houses
 *
 * The player sets a strategy - which grades they want, how prestigious a horse's
 * home track must be, what they will pay, and how large a syndication stake they
 * want - and this module scores every live Exchange ask and auction-house lot
 * against it.
 *
 * Pure logic only - no store access, no mutation of inputs.
 *
 * Dependencies: ./exchange, ./houseQuotes, ./priceAlerts,
 *   @/core/prestige/racecoursePrestige, @/data/tracks
 * Related files: src/components/market/MarketStrategyPanel.tsx, src/routes/market.tsx
 */

import type { Horse } from "@/core/horse/types";
import type { Syndicate } from "@/core/breeding/types";
import { TRACK_BY_ID } from "@/core/data/tracksAccessor";
import { getRacecoursePrestige } from "@/core/prestige/racecoursePrestige";
import { AUCTION_HOUSES } from "@/core/prestige/auctionHouses";
import { buildHouseCatalogue } from "./houseQuotes";
import { horseGradeSegment, horseTrackSegment, GRADE_SEGMENTS } from "./priceAlerts";
import type { ExchangeState } from "./exchange";

export type MarketStrategy = {
  /** Grade segments to target (empty means any). */
  targetGrades: string[];
  /** Minimum prestige (0-100) of the horse's home track. */
  minTrackPrestige: number;
  /** Most the player will pay for one horse. */
  maxPrice: number;
  /** Share of a horse the player wants to hold via syndication (0-100). */
  targetSyndicationStakePct: number;
};

export const DEFAULT_MARKET_STRATEGY: MarketStrategy = {
  targetGrades: ["G1", "G2"],
  minTrackPrestige: 50,
  maxPrice: 250_000,
  targetSyndicationStakePct: 25,
};

export type StrategySource =
  { kind: "exchange" } | { kind: "house"; houseId: string; houseName: string };

export type StrategyCandidate = {
  horseId: string;
  horseName: string;
  age?: number;
  source: StrategySource;
  sourceLabel: string;
  price: number;
  fairValue: number;
  /** Percentage discount (positive) or premium (negative) against fair value. */
  valueEdgePct: number;
  grade: string;
  trackId?: string;
  trackName?: string;
  trackPrestige: number;
  /**
   * Real cost of the targeted syndication stake — only set when the horse is
   * actually syndicated and shares remain purchasable.
   */
  stakeCost?: number;
  /** Live syndicate id — present when the horse is syndicated. */
  syndicateId?: string;
  /** Shares the strategy would buy (target % of total, capped by availability). */
  sharesToBuy?: number;
  /** Current share price inside the syndicate. */
  sharePrice?: number;
  /** Live Exchange ask id — present on exchange candidates so the UI can buy. */
  askId?: string;
  /** Most recent fill for this horse on the tape, if it has ever traded. */
  lastTrade?: { price: number; day: number };
  /** 0-100 fit against the strategy. */
  score: number;
  reasons: string[];
  warnings: string[];
};

export type StrategyRun = {
  candidates: StrategyCandidate[];
  /** Lots examined across both venues. */
  scanned: number;
  /** How many cleared every hard rule (grade, prestige, price). */
  qualified: number;
  /** Average score of qualifying candidates. */
  averageScore: number;
  /** Total cash needed to take the targeted stake in every qualifying lot. */
  totalStakeCost: number;
};

const clamp = (v: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, v));

/**
 * Grade rank, best first, used for "better than target" credit.
 * @param grade
 */
function gradeRank(grade: string): number {
  const idx = GRADE_SEGMENTS.indexOf(grade as (typeof GRADE_SEGMENTS)[number]);
  return idx === -1 ? GRADE_SEGMENTS.length : idx;
}

/**
 * Score one horse offered at a price against the strategy.
 *
 * @param args - Scoring inputs
 * @param args.horse - Horse on offer
 * @param args.price - Asking price
 * @param args.fairValue - Reference valuation
 * @param args.source - Where the lot is offered
 * @param args.sourceLabel - Human label for the venue
 * @param args.strategy - Player strategy
 * @param args.askId - Live ask id for exchange candidates
 * @param args.lastTrade - Most recent fill for this horse, if any
 * @param args.lastTrade.price
 * @param args.lastTrade.day
 * @param args.syndicate - Live syndicate for this horse, if syndicated
 */
export function scoreCandidate(args: {
  horse: Horse;
  price: number;
  fairValue: number;
  source: StrategySource;
  sourceLabel: string;
  strategy: MarketStrategy;
  askId?: string;
  lastTrade?: { price: number; day: number };
  /** Live syndicate for this horse, if it is syndicated at all. */
  syndicate?: Syndicate;
}): StrategyCandidate {
  const { horse, price, fairValue, source, sourceLabel, strategy } = args;
  const grade = horseGradeSegment({
    id: horse.id,
    name: horse.name,
    raceHistory: horse.raceHistory,
    courseVisits: horse.courseVisits,
  });
  const trackId = horseTrackSegment({
    id: horse.id,
    name: horse.name,
    raceHistory: horse.raceHistory,
    courseVisits: horse.courseVisits,
  });
  const trackName = trackId ? (TRACK_BY_ID[trackId]?.name ?? trackId) : undefined;
  const trackPrestige = trackId ? getRacecoursePrestige(trackId) : 0;
  const valueEdgePct = fairValue > 0 ? ((fairValue - price) / fairValue) * 100 : 0;

  const reasons: string[] = [];
  const warnings: string[] = [];

  // Grade fit (0-35)
  let gradeScore = 0;
  const wantsAny = strategy.targetGrades.length === 0;
  if (wantsAny) {
    gradeScore = 20;
  } else if (strategy.targetGrades.includes(grade)) {
    gradeScore = 35;
    reasons.push(`${grade} form matches your target grades`);
  } else {
    const best = Math.min(...strategy.targetGrades.map(gradeRank));
    if (gradeRank(grade) < best) {
      gradeScore = 35;
      reasons.push(`${grade} form is above your target grades`);
    } else {
      warnings.push(`Only ${grade} form, below your target grades`);
    }
  }

  // Track prestige fit (0-25)
  let prestigeScore = 0;
  if (trackPrestige >= strategy.minTrackPrestige) {
    prestigeScore = 25;
    if (trackName)
      reasons.push(`Campaigns at ${trackName} (prestige ${Math.round(trackPrestige)})`);
  } else {
    prestigeScore = clamp((trackPrestige / Math.max(1, strategy.minTrackPrestige)) * 25, 0, 25);
    warnings.push(
      trackId
        ? `${trackName} prestige ${Math.round(trackPrestige)} is under your floor of ${strategy.minTrackPrestige}`
        : "No established home track yet",
    );
  }

  // Value edge (0-30)
  const valueScore = clamp(15 + valueEdgePct, 0, 30);
  if (valueEdgePct >= 5) reasons.push(`${valueEdgePct.toFixed(0)}% below fair value`);
  if (valueEdgePct <= -10) warnings.push(`${Math.abs(valueEdgePct).toFixed(0)}% over fair value`);

  // Budget fit (0-10)
  const withinBudget = price <= strategy.maxPrice;
  const budgetScore = withinBudget ? 10 : 0;
  if (!withinBudget) warnings.push("Above your price ceiling");

  // Syndication stake — only real when a syndicate exists for this horse.
  const syndicate = args.syndicate;
  let stakeCost: number | undefined;
  let sharesToBuy: number | undefined;
  let sharePrice: number | undefined;
  let syndicateId: string | undefined;
  if (syndicate) {
    syndicateId = syndicate.id;
    sharePrice = syndicate.sharePrice;
    if (strategy.targetSyndicationStakePct > 0) {
      const held = Object.values(syndicate.shareHolders ?? {}).reduce((sum, n) => sum + n, 0);
      const available = Math.max(0, syndicate.totalShares - held);
      const target = Math.round(
        (clamp(strategy.targetSyndicationStakePct) / 100) * syndicate.totalShares,
      );
      sharesToBuy = Math.min(target, available);
      if (sharesToBuy > 0) {
        stakeCost = Math.round(sharesToBuy * sharePrice);
      } else {
        warnings.push("Syndicate is fully subscribed — no shares available");
      }
    }
  }

  return {
    horseId: horse.id,
    horseName: horse.name,
    age: horse.age,
    source,
    sourceLabel,
    price,
    fairValue,
    valueEdgePct,
    grade,
    trackId,
    trackName,
    trackPrestige,
    stakeCost,
    syndicateId,
    sharesToBuy,
    sharePrice,
    askId: args.askId,
    lastTrade: args.lastTrade,
    score: Math.round(gradeScore + prestigeScore + valueScore + budgetScore),
    reasons,
    warnings,
  };
}

/**
 * Run the strategy across every live Exchange ask and auction-house catalogue.
 *
 * @param args - World inputs
 * @param args.strategy - Player strategy
 * @param args.day - Current day
 * @param args.horses - All horses in the world
 * @param args.exchange - Exchange state (asks are scanned)
 * @param args.playerReputation - Player reputation score, for house quotes
 * @param args.syndicates - Live stallion syndicates keyed by stallion id
 */
export function runMarketStrategy(args: {
  strategy: MarketStrategy;
  day: number;
  horses: Horse[];
  exchange: ExchangeState;
  playerReputation?: number;
  syndicates?: Record<string, Syndicate>;
}): StrategyRun {
  const { strategy, day, horses, exchange } = args;
  const byId = new Map(horses.map((h) => [h.id, h]));
  // Syndicates are stored under a syndicate id — index by stallion for lookup.
  const syndicateByStallion = new Map(
    Object.values(args.syndicates ?? {}).map((s) => [s.stallionId, s]),
  );
  const candidates: StrategyCandidate[] = [];

  // Latest fill per horse from the tape, so candidates can show real comps.
  const lastTradeByHorse = new Map<string, { price: number; day: number }>();
  for (const trade of exchange.trades) {
    const prev = lastTradeByHorse.get(trade.horseId);
    if (!prev || trade.day >= prev.day) {
      lastTradeByHorse.set(trade.horseId, { price: trade.price, day: trade.day });
    }
  }

  for (const ask of exchange.asks) {
    if (ask.sellerId === "player") continue;
    const horse = byId.get(ask.horseId);
    if (!horse) continue;
    candidates.push(
      scoreCandidate({
        horse,
        price: ask.price,
        fairValue: ask.fairValue || ask.price,
        source: { kind: "exchange" },
        sourceLabel: `Exchange · ${ask.sellerName}`,
        strategy,
        askId: ask.id,
        lastTrade: lastTradeByHorse.get(ask.horseId),
        syndicate: syndicateByStallion.get(horse.id),
      }),
    );
  }

  for (const house of AUCTION_HOUSES) {
    const catalogue = buildHouseCatalogue({ day, house, horses });
    for (const listing of catalogue) {
      candidates.push(
        scoreCandidate({
          horse: listing.horse,
          price: listing.buyPrice,
          fairValue: listing.fairValue,
          source: { kind: "house", houseId: house.id, houseName: house.name },
          sourceLabel: `${house.name} (prestige ${house.prestige})`,
          strategy,
          lastTrade: lastTradeByHorse.get(listing.horse.id),
          syndicate: syndicateByStallion.get(listing.horse.id),
        }),
      );
    }
  }

  candidates.sort((a, b) => b.score - a.score || a.price - b.price);

  const qualifying = candidates.filter((c) => c.warnings.length === 0);
  const averageScore =
    qualifying.length > 0
      ? Math.round(qualifying.reduce((sum, c) => sum + c.score, 0) / qualifying.length)
      : 0;

  return {
    candidates,
    scanned: candidates.length,
    qualified: qualifying.length,
    averageScore,
    totalStakeCost: qualifying.reduce((sum, c) => sum + (c.stakeCost ?? 0), 0),
  };
}
