import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { runRaceToCompletion } from "@/game/raceSim";
import { getCourseForRace } from "@/game/tracks";
import type { Race, Horse, Jockey, Stable } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";

export interface RaceSimulationResult {
  raceId: string;
  result: Array<{ horseId: string; position: number; time: number }>;
  runners: Array<{ horseId: string; barrier?: number; lane?: number }>;
}

/**
 * Simulates a race to completion
 * @param race - The race to simulate
 * @param horses - All horses in the game state
 * @param jockeys - All jockeys in the game state
 * @returns Race simulation result
 */
export function simulateRace(
  race: Race, 
  horses: Horse[], 
  jockeys: Jockey[],
  hiredStaff?: StaffMember[],
  npcStables?: Stable[]
): RaceSimulationResult {
  const { runners, fillerHorses } = buildRaceField({
    race,
    horses,
    jockeys,
    hiredStaff,
    npcStables,
  });
  const rng = rngForRace(race);
  const course = getCourseForRace(race);
  const result = runRaceToCompletion(runners, race.distance, rng, 0.1, 600, course);

  return {
    raceId: race.id,
    result: result.map(({ horseId, position, time }) => ({ horseId, position, time })),
    runners: runners.map(({ horseId, barrier, lane }) => ({ horseId, barrier, lane })),
  };
}
