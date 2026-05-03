import type { Horse } from "@/game/types";

/**
 * Pure horse stat calculations
 * Extracted from: HorseBits.tsx, horseGen.ts
 */

/**
 * Calculate overall rating from horse stats
 * Average of speed, stamina, acceleration, and consistency
 */
export function calculateOverallRating(horse: Horse): number {
  return Math.round(
    (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration + horse.stats.consistency) / 4
  );
}

/**
 * Calculate horse price based on stats, age, and potential
 * Extracted from: horseGen.ts
 */
export function calculateHorsePrice(horse: Horse): number {
  const overall = calculateOverallRating(horse);
  const ageMod = horse.age <= 3 ? 1.2 : horse.age >= 6 ? 0.7 : 1;
  const potMod = 0.5 + horse.potential / 100;
  return Math.round((overall * 80 * ageMod * potMod) / 50) * 50;
}
