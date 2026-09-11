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
 * Related files: src/routes/strategy.tsx
 */

import type { Horse } from "@/core/horse/types";
import { TRACK_BY_ID } from "@/data/tracks";
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
  /** Cost of the targeted syndication stake at this price. */
  stakeCost: number;
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
 */
export function scoreCandidate(args: {
  horse: Horse;
  price: number;
  fairValue: number;
  source: StrategySource;
  sourceLabel: string;
  strategy: MarketStrategy;
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

  const stakeCost = Math.round((price * clamp(strategy.targetSyndicationStakePct)) / 100);

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
 */
export function runMarketStrategy(args: {
  strategy: MarketStrategy;
  day: number;
  horses: Horse[];
  exchange: ExchangeState;
  playerReputation?: number;
}): StrategyRun {
  const { strategy, day, horses, exchange } = args;
  const byId = new Map(horses.map((h) => [h.id, h]));
  const candidates: StrategyCandidate[] = [];

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
    totalStakeCost: qualifying.reduce((sum, c) => sum + c.stakeCost, 0),
  };
}
