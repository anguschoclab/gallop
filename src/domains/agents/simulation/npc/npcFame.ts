/**
 * npc/npcFame.ts - NPC fame calculation and application
 *
 * Extracted from npcCycle.ts for modularity.
 *
 * Dependencies: @/game/types (Horse, Race), @/constants (fame constants)
 */

import type { Horse, Race } from "@/platform/game/types";
import { raceFameGain } from "@/domains/prestige/simulation/raceFame";
import { MAX_FAME } from "@/domains/prestige/model/fameConstants";

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
        const fameGain = raceFameGain(race, result.position);

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
