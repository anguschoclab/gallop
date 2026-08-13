/**
 * affinity.ts - Jockey-Horse relationship logic
 *
 * Provides functions for calculating "The Hand" affinity bonus and
 * managing relationship growth (XP) between jockeys and horses.
 */

import type { Jockey } from "./types";
import type { Horse } from "@/game/types";
import {
  AFFINITY_LEVEL_FAMILIAR,
  AFFINITY_LEVEL_TRUSTED,
  AFFINITY_LEVEL_BONDED,
  AFFINITY_LEVEL_SOULMATES,
  AFFINITY_XP_PER_RACE,
  AFFINITY_XP_PER_WORKOUT,
  AFFINITY_XP_PER_WIN_BONUS,
  AFFINITY_XP_POOR_RACE_PENALTY,
  AFFINITY_BONUS_FAMILIAR,
  AFFINITY_BONUS_TRUSTED,
  AFFINITY_BONUS_BONDED,
  AFFINITY_BONUS_SOULMATES,
} from "@/constants";

export const AFFINITY_CONSTANTS = {
  LEVELS: {
    familiar: AFFINITY_LEVEL_FAMILIAR,
    trusted: AFFINITY_LEVEL_TRUSTED,
    bonded: AFFINITY_LEVEL_BONDED,
    soulmates: AFFINITY_LEVEL_SOULMATES,
  },

  XP_PER_RACE: AFFINITY_XP_PER_RACE,
  XP_PER_WORKOUT: AFFINITY_XP_PER_WORKOUT,
  XP_PER_WIN_BONUS: AFFINITY_XP_PER_WIN_BONUS,
  XP_POOR_RACE_PENALTY: AFFINITY_XP_POOR_RACE_PENALTY,

  BONUS: {
    familiar: AFFINITY_BONUS_FAMILIAR,
    trusted: AFFINITY_BONUS_TRUSTED,
    bonded: AFFINITY_BONUS_BONDED,
    soulmates: AFFINITY_BONUS_SOULMATES,
  },
};

/**
 * Calculate the total affinity bonus ("The Hand") for a Jockey-Horse pair.
 * Factors in horse-specific XP and stable-wide retainer bonus.
 * @param jockey - The jockey object containing affinity data
 * @param horseId - The ID of the horse to calculate affinity for
 * @returns The total affinity bonus as a decimal (e.g., 0.05 for 5%)
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
 * @param xp - The affinity XP value
 * @returns The partnership level name (e.g., "Soulmates", "Bonded", "Trusted", "Familiar", "Acquaintances")
 */
export function getAffinityLevel(xp: number): string {
  if (xp >= AFFINITY_CONSTANTS.LEVELS.soulmates) return "Soulmates";
  if (xp >= AFFINITY_CONSTANTS.LEVELS.bonded) return "Bonded";
  if (xp >= AFFINITY_CONSTANTS.LEVELS.trusted) return "Trusted";
  if (xp >= AFFINITY_CONSTANTS.LEVELS.familiar) return "Familiar";
  return "Acquaintances";
}

/**
 * Calculate the trait-affinity synergy multiplier for a jockey-horse pair.
 * When a jockey's traits match the horse's running style, affinity XP grows faster.
 * @param jockey - The jockey
 * @param horse - The horse
 * @returns Multiplier (1.0–2.0) applied to affinity XP gains
 */
export function calculateTraitAffinitySynergy(jockey: Jockey, horse: Horse): number {
  const traits = jockey.traits ?? [];
  const style = horse.runningStyle;
  let multiplier = 1.0;

  if (traits.includes("gate_master") && style === "E") multiplier += 0.5;
  if (traits.includes("closer_instinct") && (style === "S" || style === "P")) multiplier += 0.5;
  if (traits.includes("pace_presser") && style === "EP") multiplier += 0.3;

  return Math.min(multiplier, 2.0);
}
