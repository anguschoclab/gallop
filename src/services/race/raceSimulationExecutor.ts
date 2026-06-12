import { buildRaceField, rngForRace } from "@/services/race/raceSimulationService";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { getCourseForRace } from "@/data/tracks";
import type { Race, Horse, Jockey, Stable } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

export interface RaceSimulationResult {
  raceId: string;
  result: Array<{ horseId: string; position: number; time: number }>;
  runners: Array<{
    horseId: string;
    name: string;
    silk: string;
    owned: boolean;
    jockeyId: string;
    jockeyName: string;
    barrier?: number;
    lane?: number;
  }>;
  snapshots: RaceSnapshot[];
}

/**
 * Simulates a race to completion.
 *
 * @param race - The race to simulate
 * @param horses - All horses in the game state
 * @param jockeys - All jockeys in the game state
 * @param hiredStaff - Optional staff members with active bonuses
 * @param npcStables - Optional array of NPC stables
 * @param npcAIManager - Optional AI manager for NPC decision making
 * @param currentDay - Current game day
 * @param recordSnapshots - Whether to record detailed race snapshots (default: only if player horse involved)
 * @returns Race simulation result including final positions and optional snapshots
 */
export function simulateRace(
  race: Race,
  horses: Horse[] | Map<string, Horse>,
  jockeys: Jockey[] | Map<string, Jockey>,
  hiredStaff?: StaffMember[],
  npcStables?: Stable[] | Map<string, Stable>,
  npcAIManager?: NpcAIManager,
  currentDay?: number,
  recordSnapshots?: boolean,
): RaceSimulationResult {
  const horsesArray = Array.isArray(horses) ? horses : Array.from(horses.values());
  const jockeysArray = Array.isArray(jockeys) ? jockeys : Array.from(jockeys.values());
  const npcStablesArray = npcStables
    ? Array.isArray(npcStables)
      ? npcStables
      : Array.from(npcStables.values())
    : undefined;

  const { runners, fillerHorses } = buildRaceField({
    race,
    horses: horsesArray,
    jockeys: jockeysArray,
    hiredStaff,
    npcStables: npcStablesArray,
    npcAIManager,
    currentDay,
  });

  const rng = rngForRace(race);
  const course = getCourseForRace(race);

  // Default to recording snapshots only if a player-owned horse is in the field
  const shouldRecord = recordSnapshots ?? runners.some((r) => r.owned);

  // Use a larger time step for background simulations to increase performance
  const dt = shouldRecord ? 0.1 : 5.0;

  const { result, snapshots } = runRaceToCompletion(
    runners,
    race.distance,
    rng,
    dt,
    30,
    course,
    shouldRecord,
  );

  return {
    raceId: race.id,
    result,
    runners: runners.map(({ horseId, name, silk, owned, jockey, barrier, lane }) => ({
      horseId,
      name,
      silk,
      owned,
      jockeyId: jockey?.id || "ai",
      jockeyName: jockey?.name || "AI Jockey",
      barrier,
      lane,
    })),

    snapshots,
  };
}
