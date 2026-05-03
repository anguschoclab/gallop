import type { Horse, Race } from "@/game/types";
import { buildRunner, stepRunner, getConditionsModifier, type Runner } from "@/game/raceSim";
import { generateHorse } from "@/game/horseGen";
import { calculateClassBonus } from "@/core/common/classBonus";
import { createRng, hashStr, type Rng } from "@/game/rng";

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

// Seed any race simulation off the race id so reruns are reproducible.
export function rngForRace(race: Pick<Race, "id">): Rng {
  return createRng(hashStr(race.id));
}

/**
 * Build the full field of runners for a race.
 * Owner entries first, then AI fillers up to fieldSize. Conditions
 * (weather + track surface) bake into runner stats here so the per-step
 * loop doesn't need to know about them.
 */
export function buildRaceField(
  dependencies: RaceSimulationDependencies
): Runner[] {
  const { race, horses } = dependencies;
  const conditions = getConditionsModifier(race);
  const built: Runner[] = [];

  // Add owner entries
  for (const entry of race.entries) {
    const horse = horses.find((h) => h.id === entry.horseId);
    if (horse) {
      built.push(buildRunner(horse, true, conditions));
    }
  }

  // Fill remaining spots with AI horses
  while (built.length < race.fieldSize) {
    const tier = getTierForRaceClass(race.raceClass);
    const aiHorse = generateHorse({ tier: tier as never });
    built.push(buildRunner(aiHorse, false, conditions));
  }

  // Empty-field guard: a race must always have at least one runner. This
  // can only happen if fieldSize was somehow set to 0; treat defensively.
  if (built.length === 0) {
    const aiHorse = generateHorse({ tier: getTierForRaceClass(race.raceClass) as never });
    built.push(buildRunner(aiHorse, false, conditions));
  }

  return built;
}

/**
 * Simulate a single time step for all runners.
 */
export function simulateStep(
  runners: Runner[],
  dt: number,
  simTime: number,
  distance: number,
  rng: Rng
): { stillRunning: boolean; finishOrder: SimulationResult[] } {
  const finishOrder: SimulationResult[] = [];
  let stillRunning = false;

  for (const runner of runners) {
    if (runner.finishTime === null) {
      stepRunner(runner, dt, simTime, distance, rng);
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
