import type { Horse, Race, Stable, Pregnancy, Jockey } from "@/game/types";
import { runNpcTraining, runNpcRaceEntry, updateHorseFame } from "@/game/npcRaceEntry";
import { createRng, hashStr, type Rng } from "@/game/rng";
import {
  NpcAIManager,
  getOrCreateStableAIState,
  updateStableAIState,
  pruneAllLearningData,
} from "@/core/ai/npcCycleAI";

/**
 * NPC Cycle Result
 */
export interface NpcCycleResult {
  horses: Horse[];
  races: Race[];
  jockeys: Jockey[];
  aiManager: NpcAIManager;
}

/**
 * Run the complete NPC cycle for a single day
 * This orchestrates:
 * 1. NPC Training
 * 2. NPC Race Entry (3 days ahead)
 * 3. Horse Fame Updates for yesterday's races
 * 4. AI state management and pruning
 *
 * @param npcStables - Array of NPC stables
 * @param horses - Current horse roster
 * @param races - Current race schedule
 * @param currentDay - The current game day
 * @param raceEntryDaysAhead - How many days ahead to enter races (default: 3)
 * @param aiManager - Existing AI manager (optional, for persistence)
 * @returns Updated horses, races, and AI manager
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
  aiManager: NpcAIManager = { stableStates: new Map(), globalDay: currentDay },
): NpcCycleResult {
  // Skip if no NPC stables
  if (npcStables.length === 0) {
    return { horses, races, jockeys, aiManager };
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

  // 4. AI state management
  let updatedAiManager = aiManager;
  updatedAiManager.globalDay = currentDay;

  // Create or update AI state for each stable
  for (const stable of npcStables) {
    const stableAIState = getOrCreateStableAIState(updatedAiManager, stable, currentDay);
    updatedAiManager.stableStates.set(stable.id, updateStableAIState(stableAIState, currentDay));
  }

  // Prune old learning data (90-day memory depth)
  const cutoffDay = currentDay - 90;
  updatedAiManager = pruneAllLearningData(updatedAiManager, cutoffDay);

  return {
    horses: horsesAfterFame,
    races: racesAfterEntry,
    jockeys,
    aiManager: updatedAiManager,
  };
}
