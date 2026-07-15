/**
 * strategy.ts - Personality-driven breeding strategy configuration
 *
 * This file provides breeding strategy parameters and scoring logic tied to stable
 * personalities. Each personality has different preferences for stud fees, mare quality,
 * inbreeding tolerance, and stallion scoring weights.
 *
 * Dependencies: @/game/types (Horse, Stable), @/core/breeding/leaderboardTypes (Leaderboard), @/game/breedingCompatibility (calculateBreedingCompatibility)
 * Related files: archetypes.ts (program archetype matching), npcDailyCycle.ts (uses strategy for NPC breeding decisions)
 */

import type { Horse, Stable } from "@/game/types";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import { calculateBreedingCompatibility } from "@/core/breeding/compatibility";

// How much program archetype fit contributes to stallion score per personality.
const PROGRAM_WEIGHT: Record<Stable["personality"], number> = {
  breeder: 0.2,
  developer: 0.1,
  prestige: 0.3,
  specialist: 0.4,
  aggressive: 0.05,
  conservative: 0.1,
  "win-now": 0.05,
  trader: 0.1,
};

/**
 * Breeding Strategy Configuration
 * Personality-driven breeding parameters and scoring logic
 */

// Personalities that actively breed each season. Others skip breeding rounds.
export const BREEDING_PERSONALITIES: readonly Stable["personality"][] = [
  "breeder",
  "developer",
  "prestige",
  "specialist",
  "aggressive",
  "conservative",
  "win-now",
  "trader",
];

// Per-personality budget: max share of stable's cash to spend on a single
// stud fee. Breeders splurge; developers hunt value; prestige stables go all-in
// on top stallions; specialists are picky and willing to pay for the right fit.
export const SINGLE_FEE_CAP_FRACTION: Record<Stable["personality"], number> = {
  breeder: 0.35,
  developer: 0.2,
  prestige: 0.5,
  specialist: 0.3,
  aggressive: 0.25,
  conservative: 0.15,
  "win-now": 0.3,
  trader: 0.2,
};

// Mare-quality floor — below this overall ability, the stable doesn't bother
// breeding the mare (would waste a stud fee). Personality-driven.
export const MIN_MARE_OVERALL: Record<Stable["personality"], number> = {
  breeder: 50,
  developer: 35,
  prestige: 60,
  specialist: 45,
  aggressive: 40,
  conservative: 55,
  "win-now": 50,
  trader: 30,
};

// Inbreeding tolerance — max COI before the stable refuses the cross. Prestige
// stables tolerate close inbreeding when chasing fashionable lines.
export const MAX_COI: Record<Stable["personality"], number> = {
  breeder: 0.0625,
  developer: 0.05,
  prestige: 0.1,
  specialist: 0.0625,
  aggressive: 0.15,
  conservative: 0.03,
  "win-now": 0.08,
  trader: 0.0625,
};

/**
 * Parameters passed to personality scoring strategies.
 */
interface ScoringContext {
  compat: number;
  stakesRate: number;
  feeNorm: number;
  fertilityBonus: number;
  fameBonus: number;
  leaderboardBonus: number;
  programTerm: number;
  stallion: Horse;
  mare: Horse;
  stable: Stable;
}

/**
 * Strategy function for stallion scoring.
 */
type ScoringStrategy = (ctx: ScoringContext) => number;

/**
 * Registry of scoring strategies indexed by stable personality.
 * Strictly typed to ensure all personalities are handled.
 */
const SCORING_STRATEGIES: Record<Stable["personality"], ScoringStrategy> = {
  breeder: (ctx) =>
    ctx.compat * 0.45 +
    ctx.stakesRate * 0.25 +
    (1 - ctx.feeNorm) * 0.15 +
    ctx.fertilityBonus * 0.05 +
    ctx.fameBonus * 0.05 +
    ctx.leaderboardBonus * 0.05 +
    ctx.programTerm,

  developer: (ctx) =>
    ctx.compat * 0.3 +
    (1 - ctx.feeNorm) * 0.35 +
    ctx.stakesRate * 0.15 +
    ctx.fertilityBonus * 0.1 +
    ctx.leaderboardBonus * 0.1 +
    ctx.programTerm,

  prestige: (ctx) =>
    ctx.compat * 0.25 +
    ctx.stakesRate * 0.25 +
    ctx.fameBonus * 0.2 +
    ctx.feeNorm * 0.1 +
    ctx.fertilityBonus * 0.05 +
    ctx.leaderboardBonus * 0.15 +
    ctx.programTerm,

  specialist: (ctx) => {
    const stableDist = ctx.stable.preferredDistance ?? 1600;
    const stallionDistDiff = Math.abs((ctx.stallion.distanceAptitude ?? 1600) - stableDist);
    const distMatch = Math.max(0, 1 - stallionDistDiff / 1000);
    return (
      ctx.compat * 0.35 +
      distMatch * 0.25 +
      ctx.stakesRate * 0.2 +
      (1 - ctx.feeNorm) * 0.1 +
      ctx.leaderboardBonus * 0.1 +
      ctx.programTerm
    );
  },

  // Personalities with distinct breeding priorities
  aggressive: (ctx) =>
    ctx.compat * 0.3 +
    ctx.stakesRate * 0.3 +
    ctx.fameBonus * 0.15 +
    (1 - ctx.feeNorm) * 0.1 +
    ctx.fertilityBonus * 0.05 +
    ctx.leaderboardBonus * 0.1 +
    ctx.programTerm,

  conservative: (ctx) =>
    ctx.compat * 0.4 +
    (1 - ctx.feeNorm) * 0.25 +
    ctx.stakesRate * 0.1 +
    ctx.fertilityBonus * 0.15 +
    ctx.fameBonus * 0.05 +
    ctx.leaderboardBonus * 0.05 +
    ctx.programTerm,

  "win-now": (ctx) =>
    ctx.compat * 0.2 +
    ctx.stakesRate * 0.35 +
    ctx.fameBonus * 0.2 +
    ctx.feeNorm * 0.1 +
    ctx.fertilityBonus * 0.05 +
    ctx.leaderboardBonus * 0.1 +
    ctx.programTerm,

  trader: (ctx) =>
    ctx.compat * 0.25 +
    (1 - ctx.feeNorm) * 0.3 +
    ctx.fertilityBonus * 0.15 +
    ctx.stakesRate * 0.1 +
    ctx.fameBonus * 0.1 +
    ctx.leaderboardBonus * 0.1 +
    ctx.programTerm,
};

/**
 * Personality-specific stallion scoring.
 *
 * Compatibility, fee, stakes record, fertility, fame, and leaderboard rankings
 * all weight differently per personality. Returns a score used for stallion
 * selection during NPC breeding.
 *
 * @param stallion - The stallion horse being evaluated
 * @param mare - The mare being bred
 * @param stable - The stable making the breeding decision
 * @param maxFee - Maximum stud fee the stable is willing to pay
 * @param leaderboards - Optional leaderboard data for ranking bonuses
 * @param archetypeFitDelta - Optional archetype fit bonus
 * @returns Stallion score (higher is better)
 */
export function scoreStallion(
  stallion: Horse,
  mare: Horse,
  stable: Stable,
  maxFee: number,
  leaderboards?: Record<string, Leaderboard>,
  archetypeFitDelta: number = 0,
): number {
  const compat = calculateBreedingCompatibility(stallion, mare).overallScore;
  const stud = stallion.stud!;
  const feeNorm = stud.standingFee / Math.max(1, maxFee);
  const stakesRate =
    stud.lifetimeFoals > 0
      ? (stud.lifetimeStakesFoals + 2 * stud.lifetimeG1Foals) / Math.max(5, stud.lifetimeFoals)
      : 0;
  // Fertility — high-fertility sires preferred (a wasted cover is a wasted year).
  const fertilityBonus = (stallion.fertility ?? 0.85) - 0.7; // 0..0.29
  const fameBonus = stallion.fame / 200;

  // Leaderboard bonuses
  let leaderboardBonus = 0;
  if (leaderboards) {
    const overallRank = leaderboards.overall?.rankings.find((r) => r.stallionId === stallion.id);
    const valueRank = leaderboards.value_sires?.rankings.find((r) => r.stallionId === stallion.id);

    if (overallRank && overallRank.rank <= 10) {
      leaderboardBonus += (11 - overallRank.rank) * 0.02; // Top 10 bonus
    }

    if (valueRank && valueRank.rank <= 5 && stable.personality === "developer") {
      leaderboardBonus += (6 - valueRank.rank) * 0.03; // Value bonus for developers
    }

    // Personality-specific leaderboard preferences
    if (stable.personality === "prestige") {
      const g1Rank = leaderboards.g1_producers?.rankings.find((r) => r.stallionId === stallion.id);
      if (g1Rank && g1Rank.rank <= 5) {
        leaderboardBonus += (6 - g1Rank.rank) * 0.04; // G1 bonus for prestige
      }
    }

    if (stable.personality === "specialist") {
      const specialistRank =
        stable.preferredSurface === "Turf"
          ? leaderboards.turf_specialists?.rankings.find((r) => r.stallionId === stallion.id)
          : leaderboards.dirt_specialists?.rankings.find((r) => r.stallionId === stallion.id);
      if (specialistRank && specialistRank.rank <= 5) {
        leaderboardBonus += (6 - specialistRank.rank) * 0.03;
      }
    }
  }

  const programWeight = PROGRAM_WEIGHT[stable.personality] ?? 0;
  const programTerm = archetypeFitDelta * programWeight;

  const strategy = SCORING_STRATEGIES[stable.personality];
  return strategy({
    compat,
    stakesRate,
    feeNorm,
    fertilityBonus,
    fameBonus,
    leaderboardBonus,
    programTerm,
    stallion,
    mare,
    stable,
  });
}
