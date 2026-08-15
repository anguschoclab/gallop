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
import type { TrackCondition, Weather } from "@/core/race/types";
import { TRAIT_VALUES, fiberDistanceModifier } from "@/core/genetics/phenotype";
import { clamp } from "@/core/common/math";
import { ensurePhenotypeResolved } from "@/core/horse/horseFactory";
import { REGIONAL_LINE_BIAS, type Bloodline } from "@/core/breeding/populationGenetics";
import { calculateDosageMetrics } from "@/core/race/dosage";
import { calculateOptimalRunningStyle } from "@/core/ai/jockeyStrategyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";
import { calculateTheHandBonus } from "@/core/jockey/affinity";
import type { JockeyInstructions } from "@/core/tactics/tacticsTypes";
import { getClaimAllowance } from "@/core/apprentice/apprenticeTypes";
import { getCourseMultiplier } from "@/core/race/sectionalAnalysis";
import {
  HARSH_CONDITION_SPEED_THRESHOLD,
  MAX_FORM_ENERGY_MUL,
  TOP_SPEED_CEILING,
  LANE_WIDTH,
  MUD_MASTER_SPEED_BONUS,
} from "@/constants/raceEngineConstants";
import { DEFAULT_GATE } from "@/constants/gateConstants";
import type { SimWeatherPattern } from "@/core/weather/weatherTypes";
import type { RunnerMood } from "@/core/race/runnerConditions";

export type RunnerBonuses = {
  farrier?: number;
  groom?: number;
  trainer?: number;
  veterinarian?: number;
};

/**
 * Derive default jockey instructions from a horse's genetic running style.
 * Used for filler horses that have an ephemeral jockey but no entry instructions.
 *
 * @param runningStyle - The horse's genetic running style.
 * @param horseId - Unique horse identifier.
 * @param raceId - Unique race identifier.
 */
function deriveDefaultInstructions(
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
  gate: number;
  topSpeed: number;
  accel: number;
  staminaFactor: number;
  noise: number;
  affinityBonus: number; // Imperial Expansion: The Hand
  runningStyle: RunningStyleT;
  draftingHorseId: string | null;
  horse: HorseT;
  jockey?: JockeyT;
  jockeyName?: string; // Computed from jockey?.name for convenience
  weight: number;
  jockeyInstructions?: JockeyInstructions;
  courseFamiliarityMultiplier?: number; // Multiplier based on course visits (1.0 = no bonus)
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
  // Tamer early-race differential so front-runners seek the lead
  // rather than dashing far ahead when the rest of the field starts slowly.
  // Closers (S) still settle off the pace and build through the race.
  switch (style) {
    case "E":
      // Quick first-stride bias to claim the lead, then settle.
      if (progress < 0.1) return 1.02 + 0.1 * progress; // 1.02 -> 1.03
      return 1.04 - 0.06 * progress;
    case "EP":
      if (progress < 0.1) return 1.0 + 0.1 * progress; // 1.00 -> 1.01
      return 1.01 - 0.02 * progress;
    case "P":
      return 0.98 + 0.04 * Math.sin(Math.PI * progress);
    case "S":
      if (progress < 0.1) return 0.95; // settle back early without lunging
      if (progress < 0.6) return 0.94 + 0.04 * progress;
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
 * @param gate - The horse's gate position
 * @param jockey - Optional jockey
 * @param weight - Optional assigned weight
 * @param handedness - Track handedness
 * @param npcAIManager - Optional NPC AI manager
 * @param currentDay - Current game day
 * @param stable - The horse's stable
 * @param race - The race
 * @param bonuses - Optional runner bonuses
 * @param weatherPattern
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
  gate: number = DEFAULT_GATE,
  jockey?: JockeyT,
  weight?: number,
  handedness?: "left" | "right" | "balanced",
  npcAIManager?: NpcAIManager,
  currentDay?: number,
  stable?: StableT,
  race?: RaceT,
  bonuses?: RunnerBonuses,
  weatherPattern?: SimWeatherPattern,
): Runner {
  h = ensurePhenotypeResolved(h);
  let claim = 0;
  let finalAssignedWeight = weight ?? 126;
  if (jockey?.isApprentice) {
    const apprenticeWins = jockey.apprenticeProgression?.apprenticeWins ?? 0;
    claim = getClaimAllowance(apprenticeWins);
    if (claim > 0) {
      finalAssignedWeight = Math.max(100, finalAssignedWeight - claim);
    }
  }

  let jockeyName = jockey?.name;
  if (jockey && jockey.isApprentice && claim > 0) {
    jockeyName = `${jockey.name} (a${claim})`;
  }

  let acclimatizationPenalty = 1.0;
  if (stable && stable.outposts && h.outpostId) {
    const outpost = stable.outposts.find((o) => o.id === h.outpostId);
    if (outpost) {
      const daysLeft = outpost.acclimatizationDays?.[h.id] || 0;
      if (daysLeft > 0) {
        acclimatizationPenalty = 1 - (daysLeft / 7) * 0.05; // Up to 5% penalty
      }
    }
  }

  const farrierBonus = bonuses?.farrier ?? 0;
  const groomBonus = bonuses?.groom ?? 0;

  const formMod = 1 + h.form / 100;
  const energyMod = 0.8 + (h.energy / 100) * 0.2;
  const formEnergy = clamp(formMod * energyMod, 0.5, MAX_FORM_ENERGY_MUL);

  // Distance-vs-aptitude scaling: max pace falls off symmetrically as the
  // race distance drifts from the horse's preferred distance, and stamina
  // burn accelerates when the race is longer than preferred.
  const { preferredDistance, distanceRatio, distanceDeviation, distanceMod, distanceStaminaMul } =
    computeDistanceScaling(h.distanceAptitude, raceDistance);
  const surfaceMod = surface ? (h.surfaceAptitude[surface] ?? 0.95) * (1 + farrierBonus) : 1.0;

  const fiberMods = h.fiberBias
    ? fiberDistanceModifier(h.fiberBias as "balanced" | "sprinter" | "stayer", raceDistance)
    : { speedMul: 1, staminaMul: 1 };

  const conditionsHarsh = conditions.speedMul < HARSH_CONDITION_SPEED_THRESHOLD;
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

  let courseFamiliarityMultiplier = 1.0;
  if (race) {
    const trackId = race.trackId || race.graded?.trackId;
    const visits = trackId && h.courseVisits ? h.courseVisits[trackId] || 0 : 0;
    courseFamiliarityMultiplier = getCourseMultiplier(visits);
  }

  // Weather preference vs current race weather. Mismatch unsettles the horse
  // (worsens temperament multiplier); match steadies them slightly.
  let weatherSpeedMod = 1.0;
  let weatherStaminaMod = 1.0;
  let weatherPrefMod = 1;
  if (h.weatherPreference && h.weatherPreference !== "all") {
    // Prefer granular SimWeatherPattern when available; fall back to coarse legacy enum.
    const isWet = weatherPattern
      ? ["shower", "rain", "snow", "storm"].includes(weatherPattern)
      : race?.weather === "rainy";
    const matches = (h.weatherPreference === "wet") === isWet;
    if (matches) {
      weatherPrefMod = 0.97; // steadier (lower noise)
      weatherSpeedMod = 1.02; // direct speed bonus
      weatherStaminaMod = 1.02; // direct stamina bonus
    } else {
      weatherPrefMod = 1.05; // more erratic (higher noise)
      weatherSpeedMod = 0.98; // direct speed penalty
      weatherStaminaMod = 0.98; // direct stamina penalty
    }
  }

  // Mud master trait: negate harsh weather speed penalty and add small bonus
  if (jockey?.traits.includes("mud_master")) {
    const isWetConditions = weatherPattern
      ? ["shower", "rain", "snow", "storm"].includes(weatherPattern)
      : race?.weather === "rainy";
    const isHarshTrack = conditions.speedMul < HARSH_CONDITION_SPEED_THRESHOLD;
    if (isWetConditions || isHarshTrack) {
      // Negate the conditions speed penalty by boosting weatherSpeedMod
      weatherSpeedMod = Math.max(weatherSpeedMod, 1.0) + MUD_MASTER_SPEED_BONUS;
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
    bouncePenalty *
    courseFamiliarityMultiplier *
    acclimatizationPenalty *
    weatherSpeedMod;
  const topSpeed = clamp(rawTopSpeed, 5, TOP_SPEED_CEILING);
  const accel = (1.5 + (h.stats.acceleration / 100) * 3.5) * acclimatizationPenalty;
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
  const tempVal =
    typeof h.temperament === "number"
      ? Math.round(h.temperament / 25)
      : TRAIT_VALUES[h.temperament || "fair"];
  const rawTemperamentMod = 1 + (tempVal - 2) * -0.1;
  // Removed Math.max(1.0, ...) floor so a matching preference actually reduces noise.
  const temperamentMod = rawTemperamentMod * weatherPrefMod + groomBonus;
  const confVal =
    typeof h.conformation === "number"
      ? Math.round(h.conformation / 25)
      : TRAIT_VALUES[h.conformation || "fair"];
  const conformationMod = 1 + (confVal - 2) * -0.03;

  const conditionStamina = clamp(
    1 -
      ((1 - baseStamina) * conditions.staminaDrainMul * conformationMod * distanceStaminaMul) /
        weatherStaminaMod,
    0.2,
    1,
  );

  let runningStyle: RunningStyleT = h.runningStyle ?? "P";

  // Use jockey instructions from race entry if available (for both player and NPC)
  const entry = race?.entries.find((e) => e.horseId === h.id);
  if (entry?.jockeyInstructions) {
    const styleMap: Record<string, RunningStyleT> = {
      front_runner: "E",
      stalker: "S",
      closer: "S",
      tactical: "P",
    };
    runningStyle = styleMap[entry.jockeyInstructions.ridingStyle] || runningStyle;
  } else if (npcAIManager && currentDay && stable && jockey && race && !owned) {
    // This path is for real NPC entries that lack pre-set jockeyInstructions.
    // Fillers (no stable) get their instructions from deriveDefaultInstructions instead.
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

  const assignedWeight = finalAssignedWeight;
  const sizeCapacity = ((h.weight ?? 500) - 500) / 10;
  const standardWeightThreshold = 126 + sizeCapacity;

  const weightPenalty = Math.max(0, (assignedWeight - standardWeightThreshold) * 0.0015);
  const weightMod = clamp(1 - weightPenalty, 0.8, 1.05);

  const noise = ((110 - h.stats.consistency) / 100) * genderNoiseMul * temperamentMod;

  // Imperial Expansion: Apply "The Hand" affinity bonus
  const affinityBonus = jockey ? calculateTheHandBonus(jockey, h.id) : 0;
  const reducedNoise = noise * (1 - affinityBonus);

  // Affinity speed bonus: bonded pairs get up to ~4.5% speed bonus at Soulmates
  const affinitySpeedMul = 1 + affinityBonus * 0.3;

  return {
    horseId: h.id,
    name: h.name,
    silk: h.silk,
    coatColor: h.coatColor,
    owned,
    position: 0,
    velocity: 0,
    finishTime: null,
    lane: (gate - 1) * LANE_WIDTH,
    targetLane: 0,
    laneVelocity: 0,
    gate,
    topSpeed: clamp(
      topSpeed * genderSpeedMul * weightMod * strideMod * affinitySpeedMul,
      5,
      TOP_SPEED_CEILING,
    ),
    accel: accel * weightMod,
    staminaFactor: clamp(staminaFactor + ((h.heartScore ?? 1.0) - 1.0) * 0.5, 0.2, 1),
    noise: reducedNoise,
    affinityBonus,
    runningStyle,
    draftingHorseId: null,
    horse: h,
    jockey,
    jockeyName,
    weight: assignedWeight,
    jockeyInstructions:
      entry?.jockeyInstructions ??
      (jockey && !stable
        ? deriveDefaultInstructions(runningStyle, h.id, race?.id ?? "")
        : undefined),
    courseFamiliarityMultiplier,
    lastSeekContribution: 0,
    lastSpurtContribution: 0,
    preferredDistance,
    distanceRatio,
    distanceDeviation,
    distanceMod,
    distanceStaminaMul,
    trackCondition: race?.trackCondition,
    weather: race?.weather,
    railPreference:
      runningStyle === "S" || runningStyle === "P"
        ? jockey && jockey.stats.positioning > 70
          ? 0
          : 0.5
        : 0.5,
  };
}

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
