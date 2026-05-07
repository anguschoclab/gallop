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
 * Pick a running style biased by the horse's stat profile. Speed/acceleration
 * tilt toward front-runner; stamina tilts toward closer; balanced horses lean
 * stalker. There's still randomness so identical-stat horses can differ.
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
