/**
 * advance.ts - Day advance functions
 *
 * This file provides functions for advancing multiple days with player race detection
 * and computing player race days for O(1) lookup.
 *
 * Dependencies: @/game/types (GameState, Race)
 * Related files: pipeline.ts (uses advance functions), phases/ (phases use advance)
 */

import type { GameState, Race } from "@/game/types";

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

/**
 * Advance multiple days with player race detection.
 *
 * Advancing may be less than requested if a player race is encountered.
 *
 * @param state - Current game state
 * @param daysToAdvance - Number of days requested to advance
 * @param advanceDayFn - Function to call for each day advancement
 * @param headless - Whether to ignore player races (defaults to false)
 * @returns Result object with days advanced and race detection info
 */
export function advanceMultipleDaysWithRaceDetection(
  state: GameState,
  daysToAdvance: number,
  advanceDayFn: () => void,
  headless: boolean = false,
): { daysAdvanced: number; encounteredPlayerRace: boolean; playerRaceDay?: number } {
  let daysAdvanced = 0;

  for (let i = 0; i < daysToAdvance; i++) {
    const currentDay = state.day;
    const nextDay = currentDay + 1;

    // Check for player race on next day
    const playerRace = state.races.find(
      (r) => !r.resolved && r.day === nextDay && r.entries.some((e) => e.owned),
    );

    if (playerRace && !headless) {
      return {
        daysAdvanced,
        encounteredPlayerRace: true,
        playerRaceDay: nextDay,
      };
    }

    // If player race found in headless mode, resolve it automatically
    if (playerRace && headless) {
      // This would need to call resolveRace headlessly
      // For now, we'll just advance and let advanceDay handle it
    }

    advanceDayFn();
    daysAdvanced++;
  }

  return {
    daysAdvanced,
    encounteredPlayerRace: false,
  };
}
