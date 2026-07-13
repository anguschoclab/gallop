/**
 * pedigreePricing.ts - Pedigree-based pricing multipliers
 *
 * This file provides pricing adjustments based on pedigree quality, including
 * sire standing fee and dam blue-hen status. Yearlings lean harder on pedigree
 * (60/40) while older horses lean on stats (30/70).
 *
 * Dependencies: @/game/types (Horse, GameState)
 * Related files: pricing.ts (uses pedigreeMultiplier for horse pricing), horseFactory.ts (uses for procedural horse pricing)
 */

import type { Horse, GameState } from "@/game/types";

// Multiplier applied on top of the stat-based base price to account for
// pedigree quality. Sire's standing fee and dam's blue-hen score both
// contribute. Yearlings (age 1) lean harder on pedigree (60/40); older
// horses lean on stats (30/70). Returns 1 when no pedigree exists.
/**
 * Calculate pedigree-based pricing multiplier.
 *
 * Returns a multiplier applied on top of the stat-based base price to account
 * for pedigree quality. Sire's standing fee and dam's blue-hen score both contribute.
 * Yearlings (age 1) lean harder on pedigree (60/40); older horses lean on stats (30/70).
 * Returns 1 when no pedigree exists.
 *
 * @param horse - The horse to evaluate
 * @param state - Game state containing the horses array
 * @param state.horses
 * @param horseMap - Optional pre-built horse map for faster lookups
 * @returns Multiplier value (1+ when pedigree exists)
 *
 * @example
 * const multiplier = pedigreeMultiplier(horse, gameState);
 */
export function pedigreeMultiplier(
  horse: Horse,
  state: { horses: Record<string, Horse> },
  horseMap?: Map<string, Horse>,
): number {
  if (!horse.pedigree) return 1;

  let sire: Horse | undefined;
  let dam: Horse | undefined;

  if (horseMap) {
    sire = horse.pedigree.sireId ? horseMap.get(horse.pedigree.sireId) : undefined;
    dam = horse.pedigree.damId ? horseMap.get(horse.pedigree.damId) : undefined;
  } else {
    sire = horse.pedigree.sireId ? state.horses[horse.pedigree.sireId] : undefined;
    dam = horse.pedigree.damId ? state.horses[horse.pedigree.damId] : undefined;
  }

  // Normalize sire fee against the upper end of the elite range ($250k).
  const sireFeeNorm = Math.min(1, (sire?.stud?.standingFee ?? 0) / 250000);
  const blueHenNorm = (dam?.blueHenStatus?.blueHenScore ?? 0) / 100;

  // Yearling-weighted pedigree influence — drops with age as race results
  // start carrying the price instead.
  const pedigreeWeight = horse.age <= 1 ? 0.6 : horse.age <= 3 ? 0.4 : 0.25;
  const pedigreeBoost = (sireFeeNorm * 0.5 + blueHenNorm * 0.5) * pedigreeWeight;
  return 1 + pedigreeBoost;
}

// Helper for callers that want a pre-blended price including base value
// and pedigree multiplier in a single call.
/**
 * Calculate pedigree-adjusted price.
 *
 * Helper for callers that want a pre-blended price including base value
 * and pedigree multiplier in a single call. Rounds to nearest $50.
 *
 * @param basePrice - The stat-based base price
 * @param horse - The horse to evaluate
 * @param state - Game state containing the horses array
 * @returns Pedigree-adjusted price rounded to nearest $50
 *
 * @example
 * const price = pedigreeAdjustedPrice(basePrice, horse, gameState);
 */
export function pedigreeAdjustedPrice(
  basePrice: number,
  horse: Horse,
  state: Pick<GameState, "horses">,
): number {
  return Math.round((basePrice * pedigreeMultiplier(horse, state)) / 50) * 50;
}
