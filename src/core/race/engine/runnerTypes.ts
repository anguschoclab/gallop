/**
 * runnerTypes.ts - Shared runner types, constants, and utility functions
 *
 * Extracted from runnerBuilder.ts for modularity.
 *
 * Dependencies: @/game/types (RunningStyle, Race), @/core/common/math (clamp), @/core/race/types (TrackCondition, Weather), @/core/tactics/tacticsTypes (JockeyInstructions), @/constants/raceEngineConstants, @/constants/gateConstants, @/core/race/runnerConditions (RunnerMood)
 */

import type { Horse as HorseT, Race as RaceT, RunningStyle as RunningStyleT } from "@/game/types";
import type { TrackCondition, Weather } from "@/core/race/types";
import { clamp } from "@/core/common/math";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { DEFAULT_GATE } from "@/constants/gateConstants";
import type { RunnerMood } from "@/core/race/runnerConditions";
import type { FactorLedgerCollector, RunnerFactorLedger } from "@/core/race/factorLedger";

export type RunnerBonuses = {
  farrier?: number;
  groom?: number;
  trainer?: number;
  veterinarian?: number;
};

export type Runner = {
  horseId: string;
  name: string;
  silk: string;
  coatColor?: string;
  isPlayer: boolean;
  position: number;
  velocity: number;
  finishTime: number | null;
  lane: number;
  targetLane: number;
  laneVelocity: number;
  gate: number;
  topSpeed: number;
  accel: number;
  staminaFactor: number;
  noise: number;
  affinityBonus: number;
  runningStyle: RunningStyleT;
  draftingHorseId: string | null;
  horse: HorseT;
  jockey?: import("@/game/types").Jockey;
  jockeyName?: string;
  weight: number;
  jockeyInstructions?: JockeyInstructions;
  courseFamiliarityMultiplier?: number;
  lastSeekContribution?: number;
  lastSpurtContribution?: number;
  preferredDistance?: number;
  distanceRatio?: number;
  distanceDeviation?: number;
  distanceMod?: number;
  distanceStaminaMul?: number;
  finalMood?: RunnerMood;
  trackCondition?: TrackCondition;
  weather?: Weather;
  rivalHorseIds?: string[];
  railPreference?: number;
  factorLedger?: FactorLedgerCollector;
  finalizedLedger?: RunnerFactorLedger;
};

export type ConditionsModifier = {
  speedMul: number;
  staminaDrainMul: number;
};

export type PaceContext = {
  leaderPos: number;
  leaderVelocity: number;
  leadGroupCount: number;
  pacePressure: number;
  progress: number;
  laneDensity: number[];
  paceRating: number;
};

const TRACK_SPEED_MUL: Record<string, number> = {
  fast: 1.0,
  good: 0.985,
  soft: 0.95,
  heavy: 0.93,
  yielding: 0.9,
};

const WEATHER_SPEED_MUL: Record<string, number> = {
  sunny: 1.0,
  cloudy: 1.0,
  sunset: 1.0,
  night: 0.99,
  rainy: 0.97,
};

const WEATHER_DRAIN_MUL: Record<string, number> = {
  sunny: 1.0,
  cloudy: 1.0,
  sunset: 1.0,
  night: 1.0,
  rainy: 1.06,
};

/**
 * Derive default jockey instructions from a horse's genetic running style.
 * Used for filler horses that have an ephemeral jockey but no entry instructions.
 *
 * @param runningStyle - The horse's genetic running style.
 * @param horseId - Unique horse identifier.
 * @param raceId - Unique race identifier.
 * @returns Jockey instructions derived from the running style.
 */
export function deriveDefaultInstructions(
  runningStyle: RunningStyleT,
  horseId: string,
  raceId: string,
): JockeyInstructions {
  switch (runningStyle) {
    case "E":
      return {
        horseId,
        raceId,
        ridingStyle: "front_runner",
        earlyPosition: "lead",
        moveTiming: "early",
        aggressiveness: 90,
      };
    case "S":
      return {
        horseId,
        raceId,
        ridingStyle: "closer",
        earlyPosition: "drop_back",
        moveTiming: "late",
        aggressiveness: 50,
      };
    case "P":
      return {
        horseId,
        raceId,
        ridingStyle: "tactical",
        earlyPosition: "midpack",
        moveTiming: "mid",
        aggressiveness: 50,
      };
    case "EP":
      return {
        horseId,
        raceId,
        ridingStyle: "stalker",
        earlyPosition: "press",
        moveTiming: "mid",
        aggressiveness: 60,
      };
    default:
      return {
        horseId,
        raceId,
        ridingStyle: "tactical",
        earlyPosition: "midpack",
        moveTiming: "mid",
        aggressiveness: 50,
      };
  }
}

/**
 * Calculate pace shape multiplier based on running style and race progress.
 *
 * @param style - The horse's running style
 * @param progress - Race progress (0-1)
 * @returns Velocity multiplier
 */
export function paceShapeMul(style: RunningStyleT, progress: number): number {
  switch (style) {
    case "E":
      if (progress < 0.1) return 1.02 + 0.1 * progress;
      return 1.04 - 0.06 * progress;
    case "EP":
      if (progress < 0.1) return 1.0 + 0.1 * progress;
      return 1.01 - 0.02 * progress;
    case "P":
      return 0.98 + 0.04 * Math.sin(Math.PI * progress);
    case "S":
      if (progress < 0.1) return 0.95;
      if (progress < 0.6) return 0.94 + 0.04 * progress;
      return 0.96 + 0.11 * ((progress - 0.6) / 0.4);
  }
}

/**
 * Calculate stamina factor based on running style.
 *
 * @param style - The horse's running style
 * @param baseStaminaFactor - Base stamina factor
 * @returns Adjusted stamina factor
 */
export function styleStaminaFactor(style: RunningStyleT, baseStaminaFactor: number): number {
  switch (style) {
    case "E":
      return clamp(baseStaminaFactor - 0.05, 0.2, 1);
    case "EP":
      return baseStaminaFactor;
    case "P":
      return baseStaminaFactor;
    case "S":
      return clamp(baseStaminaFactor + 0.05, 0.2, 1);
  }
}

/**
 * Get conditions modifier based on weather and track condition.
 *
 * @param race - Race with weather and track condition
 * @returns Conditions modifier object
 */
export function getConditionsModifier(
  race: Pick<RaceT, "weather" | "trackCondition">,
): ConditionsModifier {
  const trackMul = race.trackCondition ? TRACK_SPEED_MUL[race.trackCondition] : 1;
  const weatherSpeedMul = race.weather ? WEATHER_SPEED_MUL[race.weather] : 1;
  const weatherDrainMul = race.weather ? WEATHER_DRAIN_MUL[race.weather] : 1;
  const trackDrainMul = trackMul < 1 ? 1 + (1 - trackMul) * 1.5 : 1;
  return {
    speedMul: trackMul * weatherSpeedMul,
    staminaDrainMul: weatherDrainMul * trackDrainMul,
  };
}

/**
 * Compute distance scaling factors from distance aptitude and race distance.
 *
 * @param distanceAptitude - The horse's preferred distance
 * @param raceDistance - The actual race distance
 * @returns Distance scaling metrics
 */
export function computeDistanceScaling(
  distanceAptitude: number | undefined,
  raceDistance: number,
): {
  preferredDistance: number;
  distanceRatio: number;
  distanceDeviation: number;
  distanceMod: number;
  distanceStaminaMul: number;
} {
  const preferredDistance = Math.max(200, distanceAptitude || 1600);
  const distanceRatio = raceDistance / preferredDistance;
  const distanceDeviation = Math.log2(distanceRatio);
  const distanceMod = 1 - Math.min(0.15, Math.abs(distanceDeviation) * 0.08);
  const distanceStaminaMul =
    distanceDeviation > 0 ? 1 + Math.min(0.25, distanceDeviation * 0.2) : 1;
  return { preferredDistance, distanceRatio, distanceDeviation, distanceMod, distanceStaminaMul };
}

export { DEFAULT_GATE };
