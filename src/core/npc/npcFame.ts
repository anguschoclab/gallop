/**
 * npc/npcFame.ts - NPC fame calculation and application
 *
 * Extracted from npcCycle.ts for modularity.
 *
 * Dependencies: @/game/types (Horse, Race), @/constants (fame constants)
 */

import type { Horse, Race } from "@/game/types";
import {
  FAME_GAIN_G1_WIN,
  FAME_GAIN_G2_WIN,
  FAME_GAIN_G3_WIN,
  FAME_GAIN_OTHER_WIN,
  FAME_GAIN_G1_TOP3,
  FAME_GAIN_G2_TOP3,
  FAME_GAIN_G3_TOP3,
  FAME_GAIN_OTHER_TOP3,
  FAME_GAIN_TOP5,
  FAME_BONUS_LARGE_PURSE,
  FAME_BONUS_MEDIUM_PURSE,
  LARGE_PURSE_THRESHOLD,
  MEDIUM_PURSE_THRESHOLD,
  MAX_FAME,
} from "@/constants";

/**
 * Calculate fame gains for horses based on race results.
 *
 * @param races - Array of resolved races with results.
 * @returns A map of horseId to fame gain amount.
 */
export function calculateFameGainsForRaces(races: Race[]): Map<string, number> {
  try {
    const fameGains = new Map<string, number>();

    for (const race of races) {
      if (!race.result) continue;
      for (const result of race.result) {
        let fameGain = 0;

        if (result.position === 1) {
          fameGain =
            race.graded?.grade === "G1"
              ? FAME_GAIN_G1_WIN
              : race.graded?.grade === "G2"
                ? FAME_GAIN_G2_WIN
                : race.graded?.grade === "G3"
                  ? FAME_GAIN_G3_WIN
                  : FAME_GAIN_OTHER_WIN;
        } else if (result.position <= 3) {
          fameGain =
            race.graded?.grade === "G1"
              ? FAME_GAIN_G1_TOP3
              : race.graded?.grade === "G2"
                ? FAME_GAIN_G2_TOP3
                : race.graded?.grade === "G3"
                  ? FAME_GAIN_G3_TOP3
                  : FAME_GAIN_OTHER_TOP3;
        } else if (result.position <= 5) {
          fameGain = FAME_GAIN_TOP5;
        }

        if (race.purse > LARGE_PURSE_THRESHOLD) {
          fameGain += FAME_BONUS_LARGE_PURSE;
        } else if (race.purse > MEDIUM_PURSE_THRESHOLD) {
          fameGain += FAME_BONUS_MEDIUM_PURSE;
        }

        if (fameGain > 0) {
          const current = fameGains.get(result.horseId) || 0;
          fameGains.set(result.horseId, current + fameGain);
        }
      }
    }

    return fameGains;
  } catch (error) {
    console.error("Error calculating fame gains for races:", error);
    return new Map<string, number>();
  }
}

/**
 * Apply fame gains to horses.
 *
 * @param horses - Array of horses to update.
 * @param fameGains - Map of horseId to fame gain amount.
 * @returns Updated horses array with applied fame changes.
 */
export function applyFameGainsToHorses(horses: Horse[], fameGains: Map<string, number>): Horse[] {
  return horses.map((h) => {
    const gain = fameGains.get(h.id);
    if (gain) {
      return { ...h, fame: Math.min(MAX_FAME, h.fame + gain) };
    }
    return h;
  });
}
