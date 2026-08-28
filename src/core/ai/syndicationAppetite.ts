/**
 * syndicationAppetite.ts - Personality-driven syndicate share appetite
 *
 * Each NPC stable personality has a different appetite for buying into
 * syndicates: how large a stake it is willing to hold, how aggressively it
 * builds that stake, how much of its cash it will commit, and how much
 * on-track quality it demands before joining at all.
 */

import type { StablePersonality } from "@/game/types";
import { getSyndicationTuning } from "./syndicationTuning";


export interface SyndicationAppetite {
  /** Max fraction of a syndicate's total shares this personality will hold. */
  stakeCapPct: number;
  /** Fraction of the affordable/available shares bought per decision. */
  buyFraction: number;
  /** Max fraction of cash committed to a single share purchase. */
  cashFraction: number;
  /** Minimum G1 wins on the stallion before this personality buys in. */
  minG1Wins: number;
  /** Will chase a controlling stake to trigger ownership devolution. */
  chasesControl: boolean;
}

export const SYNDICATION_APPETITE: Record<StablePersonality, SyndicationAppetite> = {
  aggressive: {
    stakeCapPct: 0.3,
    buyFraction: 0.45,
    cashFraction: 0.5,
    minG1Wins: 0,
    chasesControl: true,
  },
  trader: {
    stakeCapPct: 0.28,
    buyFraction: 0.5,
    cashFraction: 0.45,
    minG1Wins: 0,
    chasesControl: true,
  },
  prestige: {
    stakeCapPct: 0.3,
    buyFraction: 0.35,
    cashFraction: 0.4,
    minG1Wins: 1,
    chasesControl: true,
  },
  breeder: {
    stakeCapPct: 0.3,
    buyFraction: 0.4,
    cashFraction: 0.35,
    minG1Wins: 0,
    chasesControl: false,
  },
  "win-now": {
    stakeCapPct: 0.25,
    buyFraction: 0.3,
    cashFraction: 0.3,
    minG1Wins: 1,
    chasesControl: false,
  },
  specialist: {
    stakeCapPct: 0.22,
    buyFraction: 0.25,
    cashFraction: 0.25,
    minG1Wins: 1,
    chasesControl: false,
  },
  developer: {
    stakeCapPct: 0.2,
    buyFraction: 0.2,
    cashFraction: 0.2,
    minG1Wins: 0,
    chasesControl: false,
  },
  conservative: {
    stakeCapPct: 0.2,
    buyFraction: 0.15,
    cashFraction: 0.15,
    minG1Wins: 0,
    chasesControl: false,
  },
};

const FALLBACK_APPETITE: SyndicationAppetite = SYNDICATION_APPETITE.conservative;

/** Broad intent bucket surfaced to the player in syndicate UI. */
export type SyndicateIntent = "aggressive" | "trader" | "prestige" | "steady" | "conservative";

export const SYNDICATE_INTENT_BY_PERSONALITY: Record<StablePersonality, SyndicateIntent> = {
  aggressive: "aggressive",
  trader: "trader",
  prestige: "prestige",
  breeder: "steady",
  "win-now": "steady",
  specialist: "steady",
  developer: "conservative",
  conservative: "conservative",
};

export const SYNDICATE_INTENT_META: Record<
  SyndicateIntent,
  { label: string; blurb: string; tone: string }
> = {
  aggressive: {
    label: "Aggressive",
    blurb: "Will bid up shares and chase a controlling stake. Expect firm terms.",
    tone: "text-red-400 border-red-400/40",
  },
  trader: {
    label: "Trader",
    blurb: "Buys big, flips fast. Terms move with perceived resale value.",
    tone: "text-amber-300 border-amber-400/40",
  },
  prestige: {
    label: "Prestige",
    blurb: "Pays up only for proven G1 quality, then wants the nameplate.",
    tone: "text-gold border-gold/40",
  },
  steady: {
    label: "Steady",
    blurb: "Takes a moderate stake on proven horses. Negotiable terms.",
    tone: "text-sky-300 border-sky-400/40",
  },
  conservative: {
    label: "Conservative",
    blurb: "Small stake, low cash exposure. Slow to commit.",
    tone: "text-cream-muted border-cream/20",
  },
};

export function getSyndicateIntent(personality: StablePersonality): SyndicateIntent {
  return SYNDICATE_INTENT_BY_PERSONALITY[personality] ?? "conservative";
}

/**
 * Base (untuned) appetite for a personality.
 */
export function getBaseSyndicationAppetite(personality: StablePersonality): SyndicationAppetite {
  return SYNDICATION_APPETITE[personality] ?? FALLBACK_APPETITE;
}

/**
 * Appetite after the configurable tuning layer is applied.
 */
export function getSyndicationAppetite(personality: StablePersonality): SyndicationAppetite {
  const base = getBaseSyndicationAppetite(personality);
  const tuning = getSyndicationTuning(personality);
  return {
    stakeCapPct: clamp01(base.stakeCapPct * (tuning.stakeCapMultiplier ?? 1)),
    buyFraction: clamp01(base.buyFraction * (tuning.buyFractionMultiplier ?? 1)),
    cashFraction: clamp01(base.cashFraction * (tuning.cashFractionMultiplier ?? 1)),
    minG1Wins: Math.max(0, base.minG1Wins + (tuning.g1WinsOffset ?? 0)),
    chasesControl: tuning.chasesControl ?? base.chasesControl,
  };
}

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(1, value);
}

