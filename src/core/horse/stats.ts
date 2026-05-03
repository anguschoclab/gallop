import type { Horse } from "@/game/types";

/**
 * Pure functions for horse stat calculations
 * Extracted from: horseGen.ts, stable.$horseId.tsx
 */

/**
 * Calculate overall horse rating from stats
 */
export function calculateOverallRating(horse: Horse): number {
  return Math.round(
    (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration + horse.stats.consistency) / 4
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
