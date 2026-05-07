import type { Horse, Stable } from "@/game/types";
import type { Leaderboard } from "@/core/breeding/leaderboardTypes";
import { calculateBreedingCompatibility } from "@/game/breedingCompatibility";

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
];

// Per-personality budget: max share of stable's cash to spend on a single
// stud fee. Breeders splurge; developers hunt value; prestige stables go all-in
// on top stallions; specialists are picky and willing to pay for the right fit.
export const SINGLE_FEE_CAP_FRACTION: Record<Stable["personality"], number> = {
  breeder: 0.35,
  developer: 0.2,
  prestige: 0.5,
  specialist: 0.3,
  aggressive: 0,
  conservative: 0,
  "win-now": 0,
  trader: 0,
};

// Mare-quality floor — below this overall ability, the stable doesn't bother
// breeding the mare (would waste a stud fee). Personality-driven.
export const MIN_MARE_OVERALL: Record<Stable["personality"], number> = {
  breeder: 50,
  developer: 35,
  prestige: 60,
  specialist: 45,
  aggressive: 0,
  conservative: 0,
  "win-now": 0,
  trader: 0,
};

// Inbreeding tolerance — max COI before the stable refuses the cross. Prestige
// stables tolerate close inbreeding when chasing fashionable lines.
export const MAX_COI: Record<Stable["personality"], number> = {
  breeder: 0.0625,
  developer: 0.05,
  prestige: 0.1,
  specialist: 0.0625,
  aggressive: 1,
  conservative: 1,
  "win-now": 1,
  trader: 1,
};

/**
 * Calculate overall rating for a horse
 */
export function overallRating(h: Horse): number {
  return (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4;
}

/**
 * Personality-specific stallion scoring. Compatibility, fee, stakes record,
 * fertility, fame, and leaderboard rankings all weight differently per personality.
 */
export function scoreStallion(
  stallion: Horse,
  mare: Horse,
  stable: Stable,
  maxFee: number,
  leaderboards?: Record<string, Leaderboard>,
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

  switch (stable.personality) {
    case "breeder":
      // Balanced: compatibility, proven record, value, fertility, fame, leaderboard influence.
      return (
        compat * 0.45 +
        stakesRate * 0.25 +
        (1 - feeNorm) * 0.15 +
        fertilityBonus * 0.05 +
        fameBonus * 0.05 +
        leaderboardBonus * 0.05
      );
    case "developer":
      // Value-hunters: heavily weight inverse fee + leaderboard value rankings.
      return (
        compat * 0.3 +
        (1 - feeNorm) * 0.35 +
        stakesRate * 0.15 +
        fertilityBonus * 0.1 +
        leaderboardBonus * 0.1
      );
    case "prestige":
      // Brand-chasers: weight fame, classification, high fee, and G1 leaderboards.
      return (
        compat * 0.25 +
        stakesRate * 0.25 +
        fameBonus * 0.2 +
        feeNorm * 0.1 +
        fertilityBonus * 0.05 +
        leaderboardBonus * 0.15
      );
    case "specialist": {
      // Match stallion's distance aptitude to the stable's preference + specialist leaderboards.
      const stableDist = stable.preferredDistance ?? 1600;
      const stallionDistDiff = Math.abs((stallion.distanceAptitude ?? 1600) - stableDist);
      const distMatch = Math.max(0, 1 - stallionDistDiff / 1000);
      return (
        compat * 0.35 +
        distMatch * 0.25 +
        stakesRate * 0.2 +
        (1 - feeNorm) * 0.1 +
        leaderboardBonus * 0.1
      );
    }
    default:
      return compat + leaderboardBonus * 0.1;
  }
}
