/**
 * npcPostRace.ts - NPC post-race fame updates
 *
 * This file updates horse fame after race results based on finishing position,
 * race grade, and purse size.
 *
 * Dependencies: ./types (Horse, Race)
 * Related files: raceSim.ts (uses for fame updates), npcRaceEntry.ts (uses for post-race processing)
 */

import type { Horse, Race } from "./types";

/**
 * Update horse fame after race results
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
          ? 20
          : race.graded?.grade === "G2"
            ? 15
            : race.graded?.grade === "G3"
              ? 10
              : 5;
    } else if (result.position <= 3) {
      fameGain =
        race.graded?.grade === "G1"
          ? 10
          : race.graded?.grade === "G2"
            ? 8
            : race.graded?.grade === "G3"
              ? 5
              : 2;
    } else if (result.position <= 5) {
      fameGain = 1;
    }

    // Big purse races give bonus fame
    if (race.purse > 500000) {
      fameGain += 3;
    } else if (race.purse > 100000) {
      fameGain += 1;
    }

    updatedHorses[horseIndex] = {
      ...horse,
      fame: Math.min(100, horse.fame + fameGain),
    };
  }

  return updatedHorses;
}
