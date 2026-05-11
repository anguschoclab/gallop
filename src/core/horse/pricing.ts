/**
 * pricing.ts - Horse valuation and pricing
 *
 * This file provides functions for calculating horse values, stud fees, and broodmare
 * fees based on stats, age, fame, and tier.
 *
 * Dependencies: @/game/types (Horse, StableTier, GameState, Stable), ./stats (calculateOverallRating), ../breeding/pedigreePricing (pedigreeMultiplier)
 * Related files: stallions.ts (uses for stud fee calculation), market.ts (uses for horse pricing)
 */

import type { Horse, StableTier, GameState, Stable } from "@/game/types";
import { calculateOverallRating } from "@/core/horse/stats";
import { pedigreeMultiplier } from "@/core/breeding/pedigreePricing";
import {
  AGE_YOUNG_THRESHOLD,
  AGE_OLD_THRESHOLD,
  AGE_RETIREMENT_THRESHOLD,
  INJURY_PRONENESS_LOW_THRESHOLD,
  INJURY_PRONENESS_HIGH_THRESHOLD,
} from "@/game/constants/gameConstants";

/**
 * Canonical base valuation formula shared by horsePrice() and stallions.valueOf().
 *
 * Calculates horse value based on overall rating, age, fame, and stable tier.
 * Avoids circular dependency issues.
 *
 * @param horse - The horse to value
 * @param tier - The stable tier for valuation
 * @returns Base horse value
 */
export function calculateBaseHorseValue(horse: Horse, tier: StableTier): number {
  const overall = calculateOverallRating(horse);
  const ageMod = horse.age <= AGE_YOUNG_THRESHOLD ? 1.3 : horse.age >= AGE_OLD_THRESHOLD ? 0.5 : 0.9;
  const fameMod = 1 + horse.fame / 200;
  const tierMod = tier === "elite" ? 1.5 : tier === "mid" ? 1.2 : 1.0;
  return Math.round((overall * 100 * ageMod * fameMod * tierMod) / 100) * 100;
}

/**
 * NPC Stable valuation alias.
 *
 * Calculates horse value for NPC stables using the base valuation formula.
 *
 * @param horse - The horse to value
 * @param tier - The NPC stable tier
 * @returns Horse value for NPC stable
 */
export function calculateNpcHorseValue(horse: Horse, tier: StableTier): number {
  return calculateBaseHorseValue(horse, tier);
}

/**
 * Get stud fee for a horse based on its value.
 *
 * Returns the stud fee for a stallion or colt age 4+. Returns 0 for other genders or younger horses.
 *
 * @param horse - The horse to calculate stud fee for
 * @param stable - The stable with tier information
 * @returns Stud fee value
 */
export function getStudFee(horse: Horse, stable: Pick<Stable, "tier">): number {
  if (horse.gender !== "horse" && horse.gender !== "colt") return 0;
  if (horse.age < 4) return 0;
  return calculateNpcHorseValue(horse, stable.tier);
}

/**
 * Get broodmare fee for a horse based on its value.
 *
 * Returns the broodmare fee for a mare or filly age 3+. Returns 0 for other genders or younger horses.
 *
 * @param horse - The horse to calculate broodmare fee for
 * @param stable - The stable with tier information
 * @returns Broodmare fee value
 */
export function getBroodmareFee(horse: Horse, stable: Pick<Stable, "tier">): number {
  if (horse.gender !== "mare" && horse.gender !== "filly") return 0;
  if (horse.age < 3) return 0;
  return Math.round(calculateNpcHorseValue(horse, stable.tier) * 0.3);
}

/**
 * Market price for a player-owned horse (no tier context needed).
 *
 * Calculates market price based on overall rating, age, potential, conformation,
 * temperament, and injury proneness. Used in the horse market and consignment reserve pricing.
 *
 * @param h - The horse to price
 * @returns Market price
 */
export function horsePrice(h: Horse): number {
  const overall = calculateOverallRating(h);
  const ageMod = h.age <= AGE_YOUNG_THRESHOLD ? 1.2 : h.age >= AGE_RETIREMENT_THRESHOLD ? 0.7 : 1;
  const potMod = 0.5 + h.potential / 100;

  let bioMod = 1.0;
  if (h.conformation === "excellent") bioMod += 0.05;
  if (h.temperament === "excellent") bioMod += 0.05;
  if (h.conformation === "poor") bioMod -= 0.1;
  if (h.temperament === "poor") bioMod -= 0.1;

  if (h.injuryProneness < INJURY_PRONENESS_LOW_THRESHOLD) bioMod += 0.15;
  if (h.injuryProneness > INJURY_PRONENESS_HIGH_THRESHOLD) bioMod -= 0.2;

  return Math.round((overall * 80 * ageMod * potMod * bioMod) / 50) * 50;
}

/**
 * Pedigree-aware market price.
 *
 * When a horses[] context is available, applies the same multiplier the auction uses
 * so reserve and mental price track each other.
 *
 * @param h - The horse to price
 * @param allHorses - All horses in the game for pedigree context
 * @returns Pedigree-adjusted market price
 */
export function horsePriceWithPedigree(h: Horse, allHorses: Horse[]): number {
  const base = horsePrice(h);
  return Math.round((base * pedigreeMultiplier(h, { horses: allHorses })) / 50) * 50;
}
