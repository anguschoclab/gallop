import type { Horse, Race, Stable, Pregnancy, Jockey } from "@/game/types";
import { runNpcTraining, runNpcRaceEntry, updateHorseFame } from "@/game/npcRaceEntry";
import { createRng, hashStr, type Rng } from "@/game/rng";

/**
 * NPC Cycle Result
 */
export interface NpcCycleResult {
  horses: Horse[];
  races: Race[];
  jockeys: Jockey[];
}

/**
 * Run the complete NPC cycle for a single day
 * This orchestrates:
 * 1. NPC Training
 * 2. NPC Race Entry (3 days ahead)
 * 3. Horse Fame Updates for yesterday's races
 *
 * @param npcStables - Array of NPC stables
 * @param horses - Current horse roster
 * @param races - Current race schedule
 * @param currentDay - The current game day
 * @param raceEntryDaysAhead - How many days ahead to enter races (default: 3)
 * @returns Updated horses and races
 */
export function runNpcCycle(
  npcStables: Stable[],
  horses: Horse[],
  jockeys: Jockey[],
  races: Race[],
  currentDay: number,
  rng: Rng,
  raceEntryDaysAhead: number = 3,
  pregnantIds: Set<string> = new Set(),
): NpcCycleResult {
  // Skip if no NPC stables
  if (npcStables.length === 0) {
    return { horses, races, jockeys };
  }

  // 1. NPC Training
  const horsesAfterTraining = runNpcTraining(npcStables, horses, currentDay, rng);

  // 2. NPC Race Entry (look ahead)
  const racesAfterEntry = runNpcRaceEntry(
    npcStables,
    horsesAfterTraining,
    jockeys,
    races,
    currentDay,
    rng,
    raceEntryDaysAhead,
    pregnantIds,
  );

  // 3. Update fame for horses in yesterday's races
  const yesterdayRaces = races.filter((r) => r.day === currentDay && r.resolved && r.result);
  let horsesAfterFame = horsesAfterTraining;
  for (const race of yesterdayRaces) {
    horsesAfterFame = updateHorseFame(horsesAfterFame, race);
  }

  return {
    horses: horsesAfterFame,
    races: racesAfterEntry,
    jockeys,
  };
}
