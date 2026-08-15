import { buildRaceField, rngForRace } from "@/services/race/raceSimulationService";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { getCourseForRace } from "@/data/tracks";
import type { Race, Horse, Jockey, Stable, RaceRunner } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { DEFAULT_DT, defaultMaxTime } from "@/constants/raceEngineConstants";

export interface RaceSimulationResult {
  raceId: string;
  result: Array<{ horseId: string; position: number; time: number }>;
  runners: RaceRunner[];
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
 * @param weatherPattern
 * @param windKph
 * @param windDirectionDeg
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
  weatherPattern?: import("@/core/weather/weatherTypes").SimWeatherPattern,
  windKph?: number,
  windDirectionDeg?: number,
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
    weatherPattern,
  });

  const rng = rngForRace(race);
  const course = getCourseForRace(race);

  // Default to recording snapshots only if a player-owned horse is in the field
  const shouldRecord = recordSnapshots ?? runners.some((r) => r.owned);

  // Unified dt = 0.1 for all races so background results match watched races.
  const dt = DEFAULT_DT;
  const maxTime = defaultMaxTime(race.distance);

  const { result, snapshots } = runRaceToCompletion(
    runners,
    race.distance,
    rng,
    dt,
    maxTime,
    course,
    shouldRecord,
    windKph,
    windDirectionDeg,
  );

  // Dev assertion: if any runner never finished, the maxTime bound is too tight.
  if (import.meta.env?.DEV || process.env?.NODE_ENV === "development") {
    const unfinished = result.filter((r) => !Number.isFinite(r.time));
    if (unfinished.length > 0) {
      console.warn(
        `[raceSimulationExecutor] ${unfinished.length} runner(s) did not finish within maxTime=${maxTime}s for race ${race.id} (${race.distance}m).`,
      );
    }
  }

  return {
    raceId: race.id,
    result,
    runners: runners.map(
      ({ horseId, name, silk, owned, jockey, gate, lane, runningStyle, jockeyInstructions }) => ({
        horseId,
        name,
        silk,
        owned,
        jockeyId: jockey?.id || "ai",
        jockeyName: jockey?.name || "AI Jockey",
        gate,
        lane,
        runningStyle,
        jockeyInstructions: jockeyInstructions
          ? {
              ridingStyle: jockeyInstructions.ridingStyle,
              earlyPosition: jockeyInstructions.earlyPosition,
              moveTiming: jockeyInstructions.moveTiming,
              aggressiveness: jockeyInstructions.aggressiveness,
            }
          : undefined,
      }),
    ),

    snapshots,
  };
}
