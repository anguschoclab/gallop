import type { Horse, Race } from "@/game/types";
import { buildRunner, stepRunner, getConditionsModifier, computePaceContext, type Runner } from "@/game/raceSim";
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

export interface RaceFieldResult {
  runners: Runner[];
  /** Filler Horse objects generated to pad the field. Callers should persist
   *  these into state.horses so that resolveRace can find them by ID. */
  fillerHorses: Horse[];
}

/**
 * Build the full field of runners for a race.
 * Owner entries first, then AI fillers up to fieldSize. Conditions
 * (weather + track surface) bake into runner stats here so the per-step
 * loop doesn't need to know about them.
 *
 * Returns both the Runner array and any generated filler Horse objects so
 * callers can persist them into game state (avoids ghost IDs in results).
 */
export function buildRaceField(
  dependencies: RaceSimulationDependencies
): RaceFieldResult {
  const { race, horses } = dependencies;
  const conditions = getConditionsModifier(race);
  const built: Runner[] = [];
  const fillerHorses: Horse[] = [];
  const surface = race.surface || race.graded?.surface;
  const rng = rngForRace(race);

  // Add owner entries
  for (const entry of race.entries) {
    const horse = horses.find((h) => h.id === entry.horseId);
    if (horse) {
      built.push(buildRunner(horse, entry.owned, race.distance, surface, conditions));
    }
  }

  // Fill remaining spots with AI horses. Each filler is also recorded so
  // the caller can persist them into state and race.entries.
  while (built.length < race.fieldSize) {
    const tier = getTierForRaceClass(race.raceClass);
    const aiHorse = generateHorse(rng, { tier: tier as never });
    fillerHorses.push(aiHorse);
    built.push(buildRunner(aiHorse, false, race.distance, surface, conditions));
  }

  // Empty-field guard: a race must always have at least one runner. This
  // can only happen if fieldSize was somehow set to 0; treat defensively.
  if (built.length === 0) {
    const aiHorse = generateHorse(rng, { tier: getTierForRaceClass(race.raceClass) as never });
    fillerHorses.push(aiHorse);
    built.push(buildRunner(aiHorse, false, race.distance, surface, conditions));
  }

  return { runners: built, fillerHorses };
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

  // Compute pace context for the full field so drafting, pace pressure,
  // and closer bonuses work identically to runRaceToCompletion.
  const pace = computePaceContext(runners, distance);

  for (const runner of runners) {
    if (runner.finishTime === null) {
      stepRunner(runner, dt, simTime, distance, rng, runners, pace);
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
    Graded: "elite",
    Stakes: "mid",
    Listed: "mid",
    Handicap: "mid",
    Allowance: "mid",
    OptionalClaiming: "mid",
    StarterAllowance: "mid",
    StarterHandicap: "mid",
    MaidenStakes: "mid",
    Maiden: "budget",
    MaidenSpecialWeight: "budget",
    MaidenClaiming: "budget",
    MaidenOptionalClaiming: "budget",
    Claiming: "budget",
  };
  return tierMap[raceClass] || "budget";
}

/**
 * Calculate class bonus for a race
 */
export function getRaceClassBonus(race: Race): number {
  return calculateClassBonus(race.graded?.grade, race.raceClass);
}
