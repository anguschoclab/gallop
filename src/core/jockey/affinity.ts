/**
 * affinity.ts - Jockey-Horse relationship logic
 * 
 * Provides functions for calculating "The Hand" affinity bonus and
 * managing relationship growth (XP) between jockeys and horses.
 */

import type { Jockey } from "./types";

export const AFFINITY_CONSTANTS = {
  // XP thresholds for "The Hand" levels
  LEVELS: {
    familiar: 50,    // ~2-3 races or 5 workouts
    trusted: 150,    // ~8 races or 15 workouts
    bonded: 400,     // ~20 races or 40 workouts
    soulmates: 1000, // Legendary partnership
  },
  
  // XP gains
  XP_PER_RACE: 20,
  XP_PER_WORKOUT: 10,
  XP_PER_WIN_BONUS: 10,
  
  // Bonus values (percentage buffer against simulation noise/interference)
  BONUS: {
    familiar: 0.02,   // 2%
    trusted: 0.05,    // 5%
    bonded: 0.10,     // 10%
    soulmates: 0.15,  // 15%
  },
};

/**
 * Calculate the total affinity bonus ("The Hand") for a Jockey-Horse pair.
 * Factors in horse-specific XP and stable-wide retainer bonus.
 */
export function calculateTheHandBonus(jockey: Jockey, horseId: string): number {
  const horseXP = jockey.affinityMap[horseId] || 0;
  let bonus = 0;

  // 1. Calculate horse-specific bonus
  if (horseXP >= AFFINITY_CONSTANTS.LEVELS.soulmates) {
    bonus = AFFINITY_CONSTANTS.BONUS.soulmates;
  } else if (horseXP >= AFFINITY_CONSTANTS.LEVELS.bonded) {
    bonus = AFFINITY_CONSTANTS.BONUS.bonded;
  } else if (horseXP >= AFFINITY_CONSTANTS.LEVELS.trusted) {
    bonus = AFFINITY_CONSTANTS.BONUS.trusted;
  } else if (horseXP >= AFFINITY_CONSTANTS.LEVELS.familiar) {
    bonus = AFFINITY_CONSTANTS.BONUS.familiar;
  }

  // 2. Factor in Stable Affinity (Retainers)
  // Stable affinity acts as a baseline. We take the higher of the two 
  // but cap the combined effect.
  const stableBonus = (jockey.stableAffinity / 100) * 0.05; // Max 5% baseline
  
  return Math.max(bonus, stableBonus);
}

/**
 * Get the descriptive level of the partnership.
 */
export function getAffinityLevel(xp: number): string {
  if (xp >= AFFINITY_CONSTANTS.LEVELS.soulmates) return "Soulmates";
  if (xp >= AFFINITY_CONSTANTS.LEVELS.bonded) return "Bonded";
  if (xp >= AFFINITY_CONSTANTS.LEVELS.trusted) return "Trusted";
  if (xp >= AFFINITY_CONSTANTS.LEVELS.familiar) return "Familiar";
  return "Acquaintances";
}
