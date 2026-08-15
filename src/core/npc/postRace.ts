/**
 * npcPostRace.ts - NPC post-race fame updates
 *
 * This file updates horse fame after race results based on finishing position,
 * race grade, and purse size.
 *
 * Dependencies: ./types (Horse, Race)
 * Related files: raceSim.ts (uses for fame updates), npcRaceEntry.ts (uses for post-race processing)
 */

import type { Horse, Race } from "@/game/types";
import {
  FAN_GAIN_G1_WIN,
  FAN_GAIN_G2_WIN,
  FAN_GAIN_G3_WIN,
  FAN_GAIN_OTHER_WIN,
  FAN_GAIN_TOP3_G1,
  FAN_GAIN_TOP3_G2,
  FAN_GAIN_TOP3_G3,
  FAN_GAIN_TOP3_OTHER,
  FAN_GAIN_TOP5,
  FAN_BONUS_LARGE_PURSE,
  FAN_BONUS_MEDIUM_PURSE,
  LARGE_PURSE_THRESHOLD,
  MEDIUM_PURSE_THRESHOLD,
} from "@/constants";

// Fame gain constants
const FAME_GAIN = {
  WINNER_G1: 20,
  WINNER_G2: 15,
  WINNER_G3: 10,
  WINNER_OTHER: 5,
  TOP3_G1: 10,
  TOP3_G2: 8,
  TOP3_G3: 5,
  TOP3_OTHER: 2,
  TOP5: 1,
  LARGE_PURSE_BONUS: 3,
  MEDIUM_PURSE_BONUS: 1,
  LARGE_PURSE_THRESHOLD: 500000,
  MEDIUM_PURSE_THRESHOLD: 100000,
  MAX_FAME: 100,
} as const;

/**
 * Update horse fame after race results.
 *
 * Updates horse fame based on finishing position, race grade, and purse size.
 * Winners get more fame for graded races, with bonuses for high-purse events.
 *
 * @param horses - Array of horses to update
 * @param race - Race with results
 * @param horseMap - Optional map of horse IDs to array indices
 * @returns Updated array of horses with modified fame values
 */
export function updateHorseFame(
  horses: Horse[],
  race: Race,
  horseMap?: Map<string, number>,
): Horse[] {
  const updatedHorses = [...horses];
  if (!race.result) return updatedHorses;

  const horseToIndex = horseMap || new Map(updatedHorses.map((h, i) => [h.id, i]));

  for (const result of race.result) {
    const horseIndex = horseToIndex.get(result.horseId);
    if (horseIndex === undefined) continue;

    const horse = updatedHorses[horseIndex];
    let fameGain = 0;

    // Fame gains based on result
    if (result.position === 1) {
      fameGain =
        race.graded?.grade === "G1"
          ? FAME_GAIN.WINNER_G1
          : race.graded?.grade === "G2"
            ? FAME_GAIN.WINNER_G2
            : race.graded?.grade === "G3"
              ? FAME_GAIN.WINNER_G3
              : FAME_GAIN.WINNER_OTHER;
    } else if (result.position <= 3) {
      fameGain =
        race.graded?.grade === "G1"
          ? FAME_GAIN.TOP3_G1
          : race.graded?.grade === "G2"
            ? FAME_GAIN.TOP3_G2
            : race.graded?.grade === "G3"
              ? FAME_GAIN.TOP3_G3
              : FAME_GAIN.TOP3_OTHER;
    } else if (result.position <= 5) {
      fameGain = FAME_GAIN.TOP5;
    }

    // Big purse races give bonus fame
    if (race.purse > FAME_GAIN.LARGE_PURSE_THRESHOLD) {
      fameGain += FAME_GAIN.LARGE_PURSE_BONUS;
    } else if (race.purse > FAME_GAIN.MEDIUM_PURSE_THRESHOLD) {
      fameGain += FAME_GAIN.MEDIUM_PURSE_BONUS;
    }

    // Calculate fan gain mirroring fame gain logic
    let fanGain = 0;
    if (result.position === 1) {
      fanGain =
        race.graded?.grade === "G1"
          ? FAN_GAIN_G1_WIN
          : race.graded?.grade === "G2"
            ? FAN_GAIN_G2_WIN
            : race.graded?.grade === "G3"
              ? FAN_GAIN_G3_WIN
              : FAN_GAIN_OTHER_WIN;
    } else if (result.position <= 3) {
      fanGain =
        race.graded?.grade === "G1"
          ? FAN_GAIN_TOP3_G1
          : race.graded?.grade === "G2"
            ? FAN_GAIN_TOP3_G2
            : race.graded?.grade === "G3"
              ? FAN_GAIN_TOP3_G3
              : FAN_GAIN_TOP3_OTHER;
    } else if (result.position <= 5) {
      fanGain = FAN_GAIN_TOP5;
    }

    if (race.purse > LARGE_PURSE_THRESHOLD) {
      fanGain += FAN_BONUS_LARGE_PURSE;
    } else if (race.purse > MEDIUM_PURSE_THRESHOLD) {
      fanGain += FAN_BONUS_MEDIUM_PURSE;
    }

    updatedHorses[horseIndex] = {
      ...horse,
      fame: Math.min(FAME_GAIN.MAX_FAME, horse.fame + fameGain),
      fanCount: Math.max(0, (horse.fanCount ?? 0) + fanGain),
    };
  }

  return updatedHorses;
}
