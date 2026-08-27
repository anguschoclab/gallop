/**
 * syndicationAppetite.ts - Personality-driven syndicate share appetite
 *
 * Each NPC stable personality has a different appetite for buying into
 * syndicates: how large a stake it is willing to hold, how aggressively it
 * builds that stake, how much of its cash it will commit, and how much
 * on-track quality it demands before joining at all.
 */

import type { StablePersonality } from "@/game/types";

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

export function getSyndicationAppetite(personality: StablePersonality): SyndicationAppetite {
  return SYNDICATION_APPETITE[personality] ?? FALLBACK_APPETITE;
}
