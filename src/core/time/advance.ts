/**
 * advance.ts - Day advance functions
 *
 * This file provides functions for advancing multiple days with player race detection
 * and computing player race days for O(1) lookup.
 *
 * Dependencies: @/game/types (GameState, Race)
 * Related files: pipeline.ts (uses advance functions), phases/ (phases use advance)
 */

import type { Race } from "@/game/types";

/**
 * Pre-compute player race days for O(1) lookup during multi-day advance.
 *
 * @param races - All races in the game
 * @param startDay - Starting day of the range
 * @param endDay - Ending day of the range
 * @returns Set of day numbers where player has at least one entry
 */
export function computePlayerRaceDays(
  races: Race[],
  startDay: number,
  endDay: number,
): Set<number> {
  const playerRaceDays = new Set<number>();

  for (const race of races) {
    if (race.day >= startDay && race.day <= endDay && !race.resolved) {
      const hasPlayerEntry = race.entries.some((e) => e.owned);
      if (hasPlayerEntry) {
        playerRaceDays.add(race.day);
      }
    }
  }

  return playerRaceDays;
}
