import type { Horse, Race } from "@/game/types";
import { buildRunner, stepRunner, type Runner } from "@/game/raceSim";
import { generateHorse } from "@/game/horseGen";
import { calculateClassBonus } from "@/core/common/classBonus";

/**
 * Race simulation orchestration with dependency injection
 * Extracted from: race.$raceId.tsx
 */

export interface RaceSimulationDependencies {
  race: Race;
  horses: Horse[];
}

export interface SimulationResult {
  horseId: string;
  position: number;
  time: number;
}

/**
 * Build the full field of runners for a race
 * Includes owner entries + AI fillers to reach field size
 */
export function buildRaceField(
  dependencies: RaceSimulationDependencies
): Runner[] {
  const { race, horses } = dependencies;
  const built: Runner[] = [];

  // Add owner entries
  for (const entry of race.entries) {
    const horse = horses.find((h) => h.id === entry.horseId);
    if (horse) {
      built.push(buildRunner(horse, true));
    }
  }

  // Fill remaining spots with AI horses
  while (built.length < race.fieldSize) {
    const tier = getTierForRaceClass(race.raceClass);
    const aiHorse = generateHorse({ tier: tier as never });
    built.push(buildRunner(aiHorse, false));
  }

  return built;
}

/**
 * Simulate a single time step for all runners
 */
export function simulateStep(
  runners: Runner[],
  dt: number,
  simTime: number,
  distance: number
): { stillRunning: boolean; finishOrder: SimulationResult[] } {
  const finishOrder: SimulationResult[] = [];
  let stillRunning = false;

  for (const runner of runners) {
    if (runner.finishTime === null) {
      stepRunner(runner, dt, simTime, distance);
      if (runner.finishTime !== null) {
        finishOrder.push({
          horseId: runner.horseId,
          position: finishOrder.length + 1,
          time: runner.finishTime,
        });
      } else {
        stillRunning = true;
      }
    }
  }

  return { stillRunning, finishOrder };
}

/**
 * Get the appropriate AI horse tier for a race class
 */
function getTierForRaceClass(raceClass: Race["raceClass"]): string {
  const tierMap: Record<Race["raceClass"], string> = {
    Group: "elite",
    Stakes: "mid",
    Allowance: "mid",
    Maiden: "budget",
    Graded: "elite",
  };
  return tierMap[raceClass] || "budget";
}

/**
 * Calculate class bonus for a race
 */
export function getRaceClassBonus(race: Race): number {
  return calculateClassBonus(race.graded?.grade, race.raceClass);
}
