/**
 * runnerBuilder.ts - Race runner construction
 *
 * This file provides functions for building race runner objects from horse data,
 * applying modifiers for form, energy, distance, surface, weather, track conditions,
 * bloodline, dosage, gender, weight, and running style.
 *
 * Dependencies: @/game/types (Horse, Race, Stable, Jockey, RunningStyle), @/core/genetics/phenotype (TRAIT_VALUES, fiberDistanceModifier), @/game/math (clamp), @/core/breeding/populationGenetics (REGIONAL_LINE_BIAS, Bloodline), @/game/dosage (calculateDosageMetrics), @/core/ai/jockeyStrategyAI (calculateOptimalRunningStyle), @/core/ai/npcCycleAI (NpcAIManager)
 * Related files: simulation.ts (uses runners for race simulation), tacticalAI.ts (uses runner data for tactical decisions)
 */

import type {
  Horse as HorseT,
  Race as RaceT,
  Stable as StableT,
  Jockey as JockeyT,
  RunningStyle as RunningStyleT,
} from "@/game/types";
import { TRAIT_VALUES, fiberDistanceModifier } from "@/core/genetics/phenotype";
import { clamp } from "@/game/math";
import { REGIONAL_LINE_BIAS, type Bloodline } from "@/core/breeding/populationGenetics";
import { calculateDosageMetrics } from "@/game/dosage";
import { calculateOptimalRunningStyle } from "@/core/ai/jockeyStrategyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { calculateTheHandBonus } from "@/core/jockey/affinity";

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
  owned: boolean;
  position: number;
  velocity: number;
  finishTime: number | null;
  lane: number;
  targetLane: number;
  laneVelocity: number;
  barrier: number;
  topSpeed: number;
  accel: number;
  staminaFactor: number;
  noise: number;
  affinityBonus: number; // Imperial Expansion: The Hand
  runningStyle: RunningStyleT;
  draftingHorseId: string | null;
  horse: HorseT;
  jockey?: JockeyT;
  weight: number;
  tactics: string;
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
  paceRating: number; // 0.8 = crawl, 1.0 = normal, 1.2 = blistering
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
 * Calculate pace shape multiplier based on running style and race progress.
 *
 * Returns a velocity modifier that varies through the race based on the
 * horse's running style (E, EP, P, S).
 *
 * @param style - The horse's running style
 * @param progress - Race progress (0-1)
 * @returns Velocity multiplier
 *
 * @example
 * const mul = paceShapeMul("E", 0.5);
 */
export function paceShapeMul(style: RunningStyleT, progress: number): number {
  switch (style) {
    case "E":
      return 1.05 - 0.07 * progress;
    case "EP":
      return 1.01 - 0.02 * progress;
    case "P":
      return 0.98 + 0.04 * Math.sin(Math.PI * progress);
    case "S":
      if (progress < 0.6) return 0.93 + 0.05 * progress;
      return 0.96 + 0.11 * ((progress - 0.6) / 0.4);
  }
}

/**
 * Calculate stamina factor based on running style.
 *
 * Adjusts base stamina factor based on running style: early runners (E) have
 * reduced stamina, stalkers (EP/P) have standard, and closers (S) have increased.
 *
 * @param style - The horse's running style
 * @param baseStaminaFactor - Base stamina factor
 * @returns Adjusted stamina factor
 *
 * @example
 * const stamina = styleStaminaFactor("E", 0.8);
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
 * Returns speed and stamina drain multipliers based on current weather
 * and track conditions.
 *
 * @param race - Race with weather and track condition
 * @returns Conditions modifier object
 *
 * @example
 * const modifier = getConditionsModifier({ weather: "rainy", trackCondition: "heavy" });
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

const MAX_FORM_ENERGY_MUL = 1.25;
const TOP_SPEED_CEILING = 22;

/**
 * Build a race runner from horse data.
 *
 * Creates a complete Runner object with all modifiers applied for form, energy,
 * distance, surface, weather, track conditions, bloodline, dosage, gender, weight,
 * running style, and stable bonuses.
 *
 * @param h - The horse to build a runner for
 * @param owned - Whether the horse is owned by the player
 * @param raceDistance - The race distance in meters
 * @param surface - The race surface
 * @param conditions - Conditions modifier for weather/track
 * @param barrier - The horse's barrier position
 * @param jockey - Optional jockey
 * @param weight - Optional assigned weight
 * @param handedness - Track handedness
 * @param npcAIManager - Optional NPC AI manager
 * @param currentDay - Current game day
 * @param stable - The horse's stable
 * @param race - The race
 * @param bonuses - Optional runner bonuses
 * @returns Complete Runner object
 *
 * @example
 * const runner = buildRunner(horse, true, 1600, "Turf", conditions, 1, jockey, 126, "left");
 */
export function buildRunner(
  h: HorseT,
  owned: boolean,
  raceDistance: number,
  surface: "Turf" | "Dirt" | "Synthetic" | null,
  conditions: ConditionsModifier = { speedMul: 1, staminaDrainMul: 1 },
  barrier: number = 1,
  jockey?: JockeyT,
  weight?: number,
  handedness?: "left" | "right" | "balanced",
  npcAIManager?: NpcAIManager,
  currentDay?: number,
  stable?: StableT,
  race?: RaceT,
  bonuses?: RunnerBonuses,
): Runner {
  const farrierBonus = bonuses?.farrier ?? 0;
  const groomBonus = bonuses?.groom ?? 0;

  const formMod = 1 + h.form / 100;
  const energyMod = 0.8 + (h.energy / 100) * 0.2;
  const formEnergy = clamp(formMod * energyMod, 0.5, MAX_FORM_ENERGY_MUL);

  const distDiff = Math.abs(h.distanceAptitude - raceDistance);
  const distanceMod = 1 - Math.min(0.1, Math.max(0, distDiff - 400) / 8000);
  const surfaceMod = surface ? (h.surfaceAptitude[surface] ?? 0.95) * (1 + farrierBonus) : 1.0;

  const fiberMods = h.fiberBias
    ? fiberDistanceModifier(h.fiberBias, raceDistance)
    : { speedMul: 1, staminaMul: 1 };

  const conditionsHarsh = conditions.speedMul < 0.97;
  const mudMod = conditionsHarsh ? (h.mudAptitude ?? 1.0) * (1 + farrierBonus) : 1.0;

  const lineBias = h.bloodline ? REGIONAL_LINE_BIAS[h.bloodline as Bloodline] : undefined;
  const lineSurfaceMul =
    lineBias && (!lineBias.surface || lineBias.surface === surface) ? 1 + lineBias.boost : 1;

  const handednessMod =
    handedness && h.trackPreference
      ? handedness === "balanced" || h.trackPreference === "balanced"
        ? 1.0
        : handedness === h.trackPreference
          ? 1.02
          : 0.98
      : 1.0;

  const dosageMetrics = calculateDosageMetrics(h.sireName);
  const dosageDI = dosageMetrics.dosageIndex;
  let dosageDistanceMod = 1.0;
  if (isFinite(dosageDI)) {
    const preferredDistance =
      dosageDI >= 4.0
        ? 1200
        : dosageDI >= 3.0
          ? 1400
          : dosageDI >= 2.4
            ? 1600
            : dosageDI >= 1.5
              ? 2000
              : 2400;
    const dosageDistDiff = Math.abs(raceDistance - preferredDistance);
    dosageDistanceMod = 1 - Math.min(0.03, dosageDistDiff / 10000);
  }

  // Dynamic Form: Calculate fatigue modifier based on recoveryPoints
  let fatigueMod = 1.0;
  const recoveryPoints = h.recoveryPoints ?? 100;
  if (recoveryPoints < 50) {
    // Fatigue reduces performance when recoveryPoints are low
    fatigueMod = 0.7 + (recoveryPoints / 50) * 0.3; // 0.7 to 1.0
  }

  // Dynamic Form: Calculate bounce penalty
  let bouncePenalty = 1.0;
  if (h.lastBeyer && h.lastRaceDay && currentDay) {
    const daysSinceLastRace = currentDay - h.lastRaceDay;
    // Calculate average Beyer from race history
    const beyerHistory = h.raceHistory.filter((r) => r.beyer !== undefined).map((r) => r.beyer!);
    const avgBeyer =
      beyerHistory.length > 0
        ? beyerHistory.reduce((sum, b) => sum + b, 0) / beyerHistory.length
        : 80;

    // Bounce condition: lastBeyer > avgBeyer + 15 and raced within 28 days
    if (h.lastBeyer > avgBeyer + 15 && daysSinceLastRace < 28) {
      bouncePenalty = 0.9; // 10% reduction
    }
  }

  const rawTopSpeed =
    (12 + (h.stats.speed / 100) * 10) *
    formEnergy *
    conditions.speedMul *
    distanceMod *
    surfaceMod *
    fiberMods.speedMul *
    mudMod *
    lineSurfaceMul *
    handednessMod *
    dosageDistanceMod *
    fatigueMod *
    bouncePenalty;
  const topSpeed = clamp(rawTopSpeed, 5, TOP_SPEED_CEILING);
  const accel = 1.5 + (h.stats.acceleration / 100) * 3.5;
  const strideMod =
    h.strideType === "long"
      ? raceDistance >= 1800
        ? 1.02
        : 0.98
      : h.strideType === "short"
        ? raceDistance < 1400
          ? 1.02
          : 0.99
        : 1;
  const baseStamina = (0.4 + (h.stats.stamina / 100) * 0.6) * fiberMods.staminaMul;
  const rawTemperamentMod = 1 + (TRAIT_VALUES[h.temperament || "fair"] - 2) * -0.1;
  const temperamentMod = Math.max(1.0, rawTemperamentMod + groomBonus);
  const conformationMod = 1 + (TRAIT_VALUES[h.conformation || "fair"] - 2) * -0.03;

  const conditionStamina = clamp(
    1 - (1 - baseStamina) * conditions.staminaDrainMul * conformationMod,
    0.2,
    1,
  );

  let runningStyle: RunningStyleT = h.runningStyle ?? "P";

  // Use tactics from race entry if available (for both player and NPC)
  const entry = race?.entries.find((e) => e.horseId === h.id);
  if (entry?.tactics && entry.tactics !== "default") {
    const tacticsMap: Record<string, RunningStyleT> = {
      lead: "E",
      rail: "EP",
      outside: "P",
      save: "P",
      late_kick: "S",
    };
    runningStyle = tacticsMap[entry.tactics] || runningStyle;
  } else if (npcAIManager && currentDay && stable && jockey && race && !owned) {
    const aiState = npcAIManager.stableStates[stable.id];
    if (aiState?.jockeyStrategyAI) {
      const optimalStyle = calculateOptimalRunningStyle(
        aiState.jockeyStrategyAI,
        h,
        race,
        jockey,
        stable,
      );
      if (optimalStyle) {
        runningStyle = optimalStyle;
      }
    }
  }
  const staminaFactor = styleStaminaFactor(runningStyle, conditionStamina);

  let genderSpeedMul = 1.0;
  let genderNoiseMul = 1.0;

  switch (h.gender) {
    case "colt":
    case "horse":
      genderSpeedMul = 1.015;
      genderNoiseMul = 1.25;
      break;
    case "gelding":
      genderSpeedMul = 1.0;
      genderNoiseMul = 0.6;
      break;
    case "filly":
    case "mare":
      genderSpeedMul = 0.99;
      genderNoiseMul = 1.0;
      break;
  }

  const assignedWeight = weight ?? 126;
  const sizeCapacity = (h.weight - 500) / 10;
  const standardWeightThreshold = 126 + sizeCapacity;

  const weightPenalty = Math.max(0, (assignedWeight - standardWeightThreshold) * 0.0015);
  const weightMod = clamp(1 - weightPenalty, 0.8, 1.05);

  const noise = ((110 - h.stats.consistency) / 100) * genderNoiseMul * temperamentMod;

  // Imperial Expansion: Apply "The Hand" affinity bonus
  const affinityBonus = jockey ? calculateTheHandBonus(jockey, h.id) : 0;
  const reducedNoise = noise * (1 - affinityBonus);

  const LANE_WIDTH = 1.2;
  return {
    horseId: h.id,
    name: h.name,
    silk: h.silk,
    coatColor: h.coatColor,
    owned,
    position: 0,
    velocity: 0,
    finishTime: null,
    lane: (barrier - 1) * LANE_WIDTH,
    targetLane: 0,
    laneVelocity: 0,
    barrier,
    topSpeed: topSpeed * genderSpeedMul * weightMod * strideMod,
    accel: accel * weightMod,
    staminaFactor: clamp(staminaFactor + ((h.heartScore ?? 1.0) - 1.0) * 0.5, 0.2, 1),
    noise: reducedNoise,
    affinityBonus,
    runningStyle,
    draftingHorseId: null,
    horse: h,
    jockey,
    weight: assignedWeight,
    tactics: entry?.tactics || "default",
  };
}
