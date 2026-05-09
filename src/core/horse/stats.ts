import type { Horse, RunningStyle } from "@/game/types";
import type { Rng } from "@/game/rng";

/**
 * Pure functions for horse stat calculations
 * Extracted from: horseGen.ts, stable.$horseId.tsx
 */

/**
 * Calculate overall horse rating from stats
 */
export function calculateOverallRating(horse: Horse): number {
  return Math.round(
    (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration + horse.stats.consistency) /
      4,
  );
}

/**
 * Calculate race-specific rating (3-stat average)
 * Used in AI contexts where consistency is intentionally excluded
 */
export function calculateRaceRating(horse: Horse): number {
  return Math.round((horse.stats.speed + horse.stats.stamina + horse.stats.acceleration) / 3);
}

export interface CareerStats {
  starts: number;
  wins: number;
  places: number; // finished exactly 2nd
  shows: number; // finished exactly 3rd
  gradedWins: number;
  gradedStarts: number;
  stakesWins: number;
  g1Wins: number;
  g2Wins: number;
  g3Wins: number;
  earnings: number;
}

/**
 * Calculate career performance summary from race history
 */
export function getCareerStats(horse: Horse): CareerStats {
  const history = horse.raceHistory || [];
  const stats: CareerStats = {
    starts: history.length,
    wins: 0,
    places: 0,
    shows: 0,
    gradedWins: 0,
    gradedStarts: 0,
    stakesWins: 0,
    g1Wins: 0,
    g2Wins: 0,
    g3Wins: 0,
    earnings: 0,
  };

  for (const entry of history) {
    if (entry.position === 1) stats.wins++;
    if (entry.position === 2) stats.places++;
    if (entry.position === 3) stats.shows++;

    if (entry.grade) {
      stats.gradedStarts++;
    }

    if (
      entry.position === 1 &&
      (entry.grade || entry.raceClass === "Stakes" || entry.raceClass === "Group")
    ) {
      stats.stakesWins++;
    }

    if (entry.position === 1 && entry.grade) {
      stats.gradedWins++;
      if (entry.grade === "G1") stats.g1Wins++;
      if (entry.grade === "G2") stats.g2Wins++;
      if (entry.grade === "G3") stats.g3Wins++;
    }

    stats.earnings += entry.purseEarned || 0;
  }

  return stats;
}

/**
 * Current and potential ability — single-number summary of a horse's level.
 * Current: average of the four stats today.
 * Potential: where those stats can grow to (capped by the horse's potential
 * ceiling). Both are 0–100. Use this for at-a-glance comparisons and for
 * sorting markets/stables.
 */
export function getAbility(horse: Horse): { current: number; potential: number } {
  const current = calculateOverallRating(horse);
  // Potential ability is the average ceiling each stat can reach. The
  // potential field caps every stat individually, so a horse can only
  // approach (potential, potential, potential, potential) at best — its
  // potential ability equals horse.potential.
  return { current, potential: horse.potential };
}

/**
 * Letter grade based on a 0–100 ability score. Convenient for UI badges.
 */
export function abilityGrade(score: number): string {
  if (score >= 90) return "S";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  if (score >= 50) return "D";
  return "F";
}

/**
 * Determine logical running style from base stats
 */
export function rollRunningStyle(
  stats: { speed: number; stamina: number; acceleration: number },
  rng: Rng,
): RunningStyle {
  const earlyBias = (stats.speed + stats.acceleration) / 2;
  const lateBias = stats.stamina;
  const tilt = earlyBias - lateBias; // ~ -50..+50
  const r = rng.next() * 100 - tilt; // tilt shifts the distribution
  if (r < 25) return "E";
  if (r < 55) return "EP";
  if (r < 80) return "P";
  return "S";
}
