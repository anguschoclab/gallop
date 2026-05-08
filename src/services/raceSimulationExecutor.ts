import { buildRaceField, rngForRace } from "@/services/raceSimulationService";
import { runRaceToCompletion } from "@/game/raceSim";
import { getCourseForRace } from "@/game/tracks";
import type { Race, Horse, Jockey, Stable } from "@/game/types";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";

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
    lane?: number 
  }>;
  snapshots: RaceSnapshot[];
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
  
  // For now, record snapshots for all races. We might want to filter this later
  // to only record for player-involved races if state size becomes an issue.
  const { result, snapshots } = runRaceToCompletion(runners, race.distance, rng, 0.1, 600, course, true);

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
      lane 
    })),

    snapshots,
  };
}
