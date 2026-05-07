import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { runRaceToCompletion } from "@/game/raceSim";
import { getCourseForRace } from "@/game/tracks";
import type { Race, Horse, Jockey } from "@/game/types";

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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function simulateRace(race: Race, horses: Horse[], jockeys: any[]): RaceSimulationResult {
  const { runners, fillerHorses } = buildRaceField({
    race,
    horses,
    jockeys,
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
