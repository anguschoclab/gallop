import type { Horse, Race, Jockey, Stable } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import {
  buildRunner,
  stepRunner,
  getConditionsModifier,
  computePaceContext,
  type Runner,
} from "@/game/raceSim";
import type { CourseSpecification } from "@/game/tracks";
import { generateHorse } from "@/game/horseGen";
import { calculateClassBonus } from "@/core/common/classBonus";
import { createRng, hashStr, type Rng } from "@/game/rng";
import { calculateAssignedWeight } from "@/core/race/entryScoring";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { RunnerBonuses } from "@/core/race/engine/simulation";

/**
 * Race simulation orchestration with dependency injection
 * Extracted from: race.$raceId.tsx
 */

export interface RaceSimulationDependencies {
  race: Race;
  horses: Horse[];
  jockeys: Jockey[];
  npcStables?: Stable[];
  npcAIManager?: NpcAIManager;
  currentDay?: number;
  hiredStaff?: StaffMember[];
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
export function buildRaceField(dependencies: RaceSimulationDependencies): RaceFieldResult {
  const { race, horses, npcStables, npcAIManager, currentDay, hiredStaff = [] } = dependencies;
  const conditions = getConditionsModifier(race);
  const fillerHorses: Horse[] = [];
  const surface = race.surface || race.graded?.surface;
  const rng = rngForRace(race);

  // 1. Prepare the full list of entry data
  const entriesData: { horseId: string; owned: boolean; jockeyId?: string; weight?: number }[] = [];
  for (const entry of race.entries) {
    entriesData.push({
      horseId: entry.horseId,
      owned: entry.owned,
      jockeyId: entry.jockeyId,
      weight: entry.weight,
    });
  }

  // 2. Fill remaining spots with AI horses
  while (entriesData.length < race.fieldSize) {
    const tier = getTierForRaceClass(race.raceClass);
    const aiHorse = generateHorse({ tier: tier as never }, rng);
    fillerHorses.push(aiHorse);
    const weight = calculateAssignedWeight(aiHorse, race);
    entriesData.push({ horseId: aiHorse.id, owned: false, weight });
  }

  // Empty-field guard: always return at least 1 runner so downstream
  // simulation doesn't have to handle a completely empty field.
  if (entriesData.length === 0) {
    const tier = getTierForRaceClass(race.raceClass);
    const aiHorse = generateHorse({ tier: tier as never }, rng);
    fillerHorses.push(aiHorse);
    const weight = calculateAssignedWeight(aiHorse, race);
    entriesData.push({ horseId: aiHorse.id, owned: false, weight });
  }

  // 3. Shuffle all entries to assign unique barriers (1 to N)
  // We use the race-seeded RNG for deterministic shuffling.
  const shuffled = [...entriesData];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 4. Build the final Runner objects with assigned barriers
  const horseMap = new Map(horses.map(h => [h.id, h]));
  const jockeyMap = new Map(dependencies.jockeys.map(j => [j.id, j]));
  const stableMap = npcStables ? new Map(npcStables.map(s => [s.id, s])) : new Map();
  const fillerMap = new Map(fillerHorses.map(h => [h.id, h]));
  
  const runners: Runner[] = [];
  for (let i = 0; i < shuffled.length; i++) {
    const entryData = shuffled[i];
    const barrier = i + 1;

    // Find the horse
    let horse = horseMap.get(entryData.horseId) || fillerMap.get(entryData.horseId);

    if (horse) {
      const jockeyObj = entryData.jockeyId ? jockeyMap.get(entryData.jockeyId) : undefined;
      // Get stable for AI-driven decisions
      const stableObj = horse.stableId ? stableMap.get(horse.stableId) : undefined;
        
      // Get staff for this stable
      const stableId = horse.stableId ?? "";
      const staffForStable = hiredStaff.filter(s => s.stableId === stableId);
      
      const farrier = staffForStable.find(s => s.role === "farrier");
      const groom = staffForStable.find(s => s.role === "groom");

      
      const runnerBonuses: RunnerBonuses = {
        farrier: farrier?.bonusValue,
        groom: groom?.bonusValue,
      };

      runners.push(
        buildRunner(
          horse,
          entryData.owned,
          race.distance,
          surface ?? null,
          conditions,
          barrier,
          jockeyObj,
          entryData.weight,
          race.handedness,
          npcAIManager,
          currentDay,
          stableObj,
          race,
          runnerBonuses,
        ),
      );
    }
  }

  return { runners, fillerHorses };
}

/**
 * Simulate a single time step for all runners.
 */
export function simulateStep(
  runners: Runner[],
  dt: number,
  simTime: number,
  distance: number,
  rng: Rng,
  course?: CourseSpecification,
): { stillRunning: boolean; finishOrder: SimulationResult[] } {
  const finishOrder: SimulationResult[] = [];
  let stillRunning = false;

  // Compute pace context for the full field so drafting, pace pressure,
  // and closer bonuses work identically to runRaceToCompletion.
  const pace = computePaceContext(runners, distance);

  for (const runner of runners) {
    if (runner.finishTime === null) {
      stepRunner(runner, dt, simTime, distance, rng, runners, pace, course);
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
