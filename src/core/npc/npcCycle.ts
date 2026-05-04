import type { Horse, Race, Stable, Pregnancy } from "@/game/types";
import { runNpcTraining, runNpcRaceEntry, updateHorseFame } from "@/game/npcRaceEntry";

/**
 * NPC Cycle Result
 */
export interface NpcCycleResult {
  horses: Horse[];
  races: Race[];
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
  races: Race[],
  currentDay: number,
  raceEntryDaysAhead: number = 3
): NpcCycleResult {
  // Skip if no NPC stables
  if (npcStables.length === 0) {
    return { horses, races };
  }

  // Get pregnant mare IDs to prevent entry
  const pregnantIds = new Set<Pregnancy | undefined>();
  // Note: pregnancies are not passed here, but the phase that calls this should handle it
  
  // 1. NPC Training
  let horsesAfterTraining = runNpcTraining(npcStables, horses, currentDay);
  
  // 2. NPC Race Entry (look ahead)
  let racesAfterEntry = runNpcRaceEntry(
    npcStables,
    horsesAfterTraining,
    races,
    currentDay,
    raceEntryDaysAhead,
    new Set() // Empty set for pregnant IDs - should be passed by caller
  );
  
  // 3. Update fame for horses in yesterday's races
  const yesterdayRaces = races.filter(r => r.day === currentDay && r.resolved && r.result);
  let horsesAfterFame = horsesAfterTraining;
  for (const race of yesterdayRaces) {
    horsesAfterFame = updateHorseFame(horsesAfterFame, race);
  }

  return {
    horses: horsesAfterFame,
    races: racesAfterEntry,
  };
}
