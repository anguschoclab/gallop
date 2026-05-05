import type { Horse, StableTier, GameState } from "@/game/types";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";

/**
 * Canonical base valuation formula shared by horsePrice() and stallions.valueOf().
 * Avoids the circular-dep issue that forced a local copy in stallions.ts.
 */
export function calculateBaseHorseValue(horse: Horse, tier: StableTier): number {
  const overall =
    (horse.stats.speed + horse.stats.stamina + horse.stats.acceleration + horse.stats.consistency) /
    4;
  const ageMod = horse.age <= 3 ? 1.3 : horse.age >= 7 ? 0.5 : 0.9;
  const fameMod = 1 + horse.fame / 200;
  const tierMod = tier === "elite" ? 1.5 : tier === "mid" ? 1.2 : 1.0;
  return Math.round((overall * 100 * ageMod * fameMod * tierMod) / 100) * 100;
}

/**
 * Market price for a player-owned horse (no tier context needed).
 * Used in the horse market and consignment reserve pricing.
 */
export function horsePrice(h: Horse): number {
  const overall =
    (h.stats.speed + h.stats.stamina + h.stats.acceleration + h.stats.consistency) / 4;
  const ageMod = h.age <= 3 ? 1.2 : h.age >= 6 ? 0.7 : 1;
  const potMod = 0.5 + h.potential / 100;

  let bioMod = 1.0;
  if (h.conformation === "excellent") bioMod += 0.05;
  if (h.temperament === "excellent") bioMod += 0.05;
  if (h.conformation === "poor") bioMod -= 0.1;
  if (h.temperament === "poor") bioMod -= 0.1;

  if (h.injuryProneness < 0.04) bioMod += 0.15;
  if (h.injuryProneness > 0.08) bioMod -= 0.2;

  return Math.round((overall * 80 * ageMod * potMod * bioMod) / 50) * 50;
}

/**
 * Pedigree-aware market price. When a horses[] context is available,
 * applies the same multiplier the auction uses so reserve and mental
 * price track each other.
 */
export function horsePriceWithPedigree(h: Horse, allHorses: Horse[]): number {
  const base = horsePrice(h);
  return Math.round((base * pedigreeMultiplier(h, { horses: allHorses })) / 50) * 50;
}
