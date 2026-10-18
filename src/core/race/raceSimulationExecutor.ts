import { buildRaceField, rngForRace } from "@/core/race/raceSimulationService";
import { runRaceToCompletion } from "@/core/race/engine/simulation";
import { getCourseForRace } from "@/core/data/tracksAccessor";
import type { Race, Horse, Jockey, Stable, RaceRunner } from "@/game/types";
import { makePlayerOwned, makeUnowned } from "@/core/horse/ownership";
import { asHorseId, asJockeyId } from "@/core/types/branded";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { RaceSnapshot, PaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import type { NpcAIManager } from "@/domains/agents/simulation/npcCycleAI";
import { DEFAULT_DT, defaultMaxTime } from "@/constants/raceEngineConstants";
import type { RunnerFactorLedger } from "@/core/race/factorLedger";

export interface RaceSimulationResult {
  raceId: string;
  result: Array<{ horseId: string; position: number; time: number }>;
  runners: RaceRunner[];
  snapshots: RaceSnapshot[];
  paceSnapshots: PaceSnapshot[];
  factorLedgers: Record<string, RunnerFactorLedger>;
}

/**
 * Project a physics Runner (from RaceSimulationSession / buildRaceField) into
 * the slim serializable RaceRunner carried by results and resolution intents.
 * @param r
 * @param r.horseId
 * @param r.name
 * @param r.silk
 * @param r.isPlayer
 * @param r.jockey
 * @param r.jockey.id
 * @param r.jockey.name
 * @param r.gate
 * @param r.lane
 * @param r.runningStyle
 * @param r.jockeyInstructions
 */
export function toRaceRunner(r: {
  horseId: string;
  name: string;
  silk: string;
  isPlayer: boolean;
  jockey?: { id?: string; name?: string };
  gate?: number;
  lane?: number;
  runningStyle?: RaceRunner["runningStyle"];
  jockeyInstructions?: RaceRunner["jockeyInstructions"];
}): RaceRunner {
  return {
    horseId: asHorseId(r.horseId),
    name: r.name,
    silk: r.silk,
    ownership: r.isPlayer ? makePlayerOwned() : makeUnowned(),
    jockeyId: asJockeyId(r.jockey?.id || "ai"),
    jockeyName: r.jockey?.name || "AI Jockey",
    gate: r.gate,
    lane: r.lane,
    runningStyle: r.runningStyle,
    jockeyInstructions: r.jockeyInstructions
      ? {
          ridingStyle: r.jockeyInstructions.ridingStyle,
          earlyPosition: r.jockeyInstructions.earlyPosition,
          moveTiming: r.jockeyInstructions.moveTiming,
          aggressiveness: r.jockeyInstructions.aggressiveness,
        }
      : undefined,
  };
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
  const shouldRecord = recordSnapshots ?? runners.some((r) => r.isPlayer);

  // Use coarser timestep for non-player races to reduce simulation cost 4x.
  // Player races keep DEFAULT_DT (0.1) for accuracy and replay fidelity.
  const hasPlayerHorse = runners.some((r) => r.isPlayer);
  const dt = hasPlayerHorse ? DEFAULT_DT : 0.4;
  const maxTime = defaultMaxTime(race.distance);

  const { result, snapshots, paceSnapshots, factorLedgers } = runRaceToCompletion(
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
    runners: runners.map(toRaceRunner),

    snapshots,
    paceSnapshots,
    factorLedgers,
  };
}
