import type { Horse, Race, Jockey, Stable } from "@/game/types";
import type { PipelineContext } from "@/core/time/pipeline";
import { stepRunner, computePaceContext } from "@/core/race/engine/simulation";
import { buildRunner, getConditionsModifier, type Runner } from "@/core/race/engine/runnerBuilder";
import type { CourseSpecification } from "@/data/tracks";
import { generateHorse } from "@/core/horse/horseFactory";
import { generateJockey } from "@/core/jockey/generator";
import { calculateClassBonus } from "@/core/common/classBonus";
import { createRng, hashStr, type Rng } from "@/core/common/rng";
import { calculateAssignedWeight } from "@/core/race/entryScoring";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import type { StaffMember } from "@/core/staff/staffTypes";
import type { RunnerBonuses } from "@/core/race/engine/runnerBuilder";
import { MIN_GATE } from "@/constants/gateConstants";

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
  /** Optional granular weather pattern (prefers SimWeatherPattern over legacy race.weather). */
  weatherPattern?: import("@/core/weather/weatherTypes").SimWeatherPattern;
}

export interface SimulationResult {
  horseId: string;
  position: number;
  time: number;
}

// Seed any race simulation off the race id so reruns are reproducible.
/**
 * Generates a deterministic random number generator for a specific race, seeded by the race's unique ID.
 *
 * @param {Pick<Race, "id">} race - The race object (requires a valid `id`).
 * @returns {Rng} A seeded RNG instance.
 */
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
 * Builds the full field of runners for a race simulation.
 * Includes user entries and generates AI filler horses to meet the required field size.
 * Conditions like track surface and weather are factored into the runner statistics at this stage.
 *
 * @param {RaceSimulationDependencies} dependencies - The objects required for building the field (race, horses, jockeys, etc.).
 * @returns {RaceFieldResult} An object containing the final list of runners and any generated filler horses.
 */
export function buildRaceField(dependencies: RaceSimulationDependencies): RaceFieldResult {
  const {
    race,
    horses,
    npcStables,
    npcAIManager,
    currentDay,
    hiredStaff = [],
    weatherPattern,
  } = dependencies;
  const conditions = getConditionsModifier(race);
  const fillerHorses: Horse[] = [];
  const fillerJockeys: Jockey[] = [];
  const surface = race.surface || race.graded?.surface;
  const rng = rngForRace(race);

  // 1. Prepare the full list of entry data (carry gate from pre-assigned draws)
  const entriesData: {
    horseId: string;
    owned: boolean;
    jockeyId?: string;
    weight?: number;
    gate?: number;
  }[] = [];
  for (const entry of race.entries) {
    entriesData.push({
      horseId: entry.horseId,
      owned: entry.owned,
      jockeyId: entry.jockeyId,
      weight: entry.weight,
      gate: entry.gate,
    });
  }

  // 2. Fill remaining spots with AI horses
  const tier = getTierForRaceClass(race.raceClass);
  while (entriesData.length < race.fieldSize) {
    const aiHorse = generateHorse({ tier: tier as never }, rng);
    fillerHorses.push(aiHorse);
    const jk = generateJockey({ tier: tier as never, rng });
    fillerJockeys.push(jk);
    const weight = calculateAssignedWeight(aiHorse, race);
    entriesData.push({ horseId: aiHorse.id, owned: false, jockeyId: jk.id, weight });
  }

  // Empty-field guard: always return at least 1 runner so downstream
  // simulation doesn't have to handle a completely empty field.
  if (entriesData.length === 0) {
    const aiHorse = generateHorse({ tier: tier as never }, rng);
    fillerHorses.push(aiHorse);
    const jk = generateJockey({ tier: tier as never, rng });
    fillerJockeys.push(jk);
    const weight = calculateAssignedWeight(aiHorse, race);
    entriesData.push({ horseId: aiHorse.id, owned: false, jockeyId: jk.id, weight });
  }

  // 3. Assign gates: respect pre-assigned gates, shuffle the rest
  const preAssigned = entriesData.filter((e) => e.gate !== undefined);
  const unassigned = entriesData.filter((e) => e.gate === undefined);

  const usedGates = new Set(preAssigned.map((e) => e.gate!));
  const totalSize = entriesData.length;
  const remainingGates: number[] = [];
  for (let b = MIN_GATE; b <= totalSize; b++) {
    if (!usedGates.has(b)) {
      remainingGates.push(b);
    }
  }

  // Shuffle unassigned entries using Fisher-Yates with race-seeded RNG
  const shuffledUnassigned = [...unassigned];
  for (let i = shuffledUnassigned.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [shuffledUnassigned[i], shuffledUnassigned[j]] = [shuffledUnassigned[j], shuffledUnassigned[i]];
  }

  // Assign remaining gates to shuffled unassigned entries
  for (let i = 0; i < shuffledUnassigned.length; i++) {
    shuffledUnassigned[i].gate = remainingGates[i];
  }

  // Merge and sort by gate number for final runner order
  const allWithGates = [...preAssigned, ...shuffledUnassigned].sort(
    (a, b) => (a.gate ?? 0) - (b.gate ?? 0),
  );

  // 4. Build the final Runner objects with assigned gates
  const horseMap =
    horses instanceof Map ? (horses as Map<string, Horse>) : new Map(horses.map((h) => [h.id, h]));
  const jockeyMap =
    dependencies.jockeys instanceof Map
      ? (dependencies.jockeys as Map<string, Jockey>)
      : new Map(dependencies.jockeys.map((j) => [j.id, j]));
  for (const jk of fillerJockeys) {
    jockeyMap.set(jk.id, jk);
  }
  const stableMap =
    npcStables instanceof Map
      ? (npcStables as Map<string, Stable>)
      : npcStables
        ? new Map(npcStables.map((s) => [s.id, s]))
        : new Map();
  const fillerMap = new Map(fillerHorses.map((h) => [h.id, h]));

  const runners: Runner[] = [];
  for (let i = 0; i < allWithGates.length; i++) {
    const entryData = allWithGates[i];
    const gate = entryData.gate!;

    // Find the horse
    const horse = horseMap.get(entryData.horseId) || fillerMap.get(entryData.horseId);

    if (horse) {
      const jockeyObj = entryData.jockeyId ? jockeyMap.get(entryData.jockeyId) : undefined;
      // Get stable for AI-driven decisions
      const stableObj = horse.stableId ? stableMap.get(horse.stableId) : undefined;

      // Get staff for this stable - optimize with Map for role lookup
      const stableId = horse.stableId ?? "";
      const staffForStable = hiredStaff.filter((s) => s.stableId === stableId);
      const staffRoleMap = new Map(staffForStable.map((s) => [s.role, s]));

      const farrier = staffRoleMap.get("farrier");
      const groom = staffRoleMap.get("groom");

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
          gate,
          jockeyObj,
          entryData.weight,
          race.handedness,
          npcAIManager,
          currentDay,
          stableObj,
          race,
          runnerBonuses,
          weatherPattern,
        ),
      );
    }
  }

  return { runners, fillerHorses };
}

/**
 * Simulates a single time step for all runners in the field.
 * Updates runner positions, detects finishers, and maintains the current pace context.
 *
 * @param {Runner[]} runners - All runners currently participating in the race.
 * @param {number} dt - The time delta for the step in seconds.
 * @param {number} simTime - Total elapsed simulation time in seconds.
 * @param {number} distance - The total race distance in meters.
 * @param {Rng} rng - Seeded random number generator.
 * @param {CourseSpecification} [course] - Optional track geometry and turn specifications.
 * @param {number} [windKph] - Optional wind speed in kilometres per hour.
 * @param {number} [windDirectionDeg] - Optional wind direction in degrees.
 * @returns {Object} Status indicating if the race is still running and the latest finish order.
 */
export function simulateStep(
  runners: Runner[],
  dt: number,
  simTime: number,
  distance: number,
  rng: Rng,
  course?: CourseSpecification,
  windKph?: number,
  windDirectionDeg?: number,
): { stillRunning: boolean; finishOrder: SimulationResult[] } {
  const finishOrder: SimulationResult[] = [];
  let stillRunning = false;

  // Compute pace context for the full field so drafting, pace pressure,
  // and closer bonuses work identically to runRaceToCompletion.
  const pace = computePaceContext(runners, distance);

  // Sort runners by position for correct drafting / blocking lookups.
  const sortedField = [...runners].sort((a, b) => b.position - a.position);

  // Compute rank-from-front once per tick to avoid O(n²) per runner
  const rankMap = new Map<string, number>();
  let aliveRank = 0;
  for (const o of sortedField) {
    if (o.finishTime === null) {
      rankMap.set(o.horseId, aliveRank);
      aliveRank++;
    }
  }

  for (const runner of runners) {
    if (runner.finishTime === null) {
      stepRunner(
        runner,
        dt,
        simTime,
        distance,
        rng,
        sortedField,
        pace,
        course,
        rankMap.get(runner.horseId),
        aliveRank,
        windKph,
        windDirectionDeg,
      );
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
 * Get the appropriate AI horse tier for a race class.
 *
 * @param raceClass - The classification of the race
 * @returns "elite", "mid", or "budget"
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
 * Calculates any class-based performance bonuses applicable to the race.
 *
 * @param {Race} race - The race object.
 * @returns {number} The calculated class bonus value.
 */
export function getRaceClassBonus(race: Race): number {
  return calculateClassBonus(race.graded?.grade, race.raceClass);
}
