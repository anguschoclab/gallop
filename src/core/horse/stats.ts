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
