import type {
  Horse,
  Race,
  RunningStyle,
  TrackCondition,
  Weather,
  Jockey,
  Stable,
} from "@/game/types";
import { TRAIT_VALUES, fiberDistanceModifier } from "@/core/genetics/phenotype";
import type { CourseSpecification, TrackSection } from "@/game/tracks";
import type { Rng } from "@/core/common/types";
import { clamp } from "@/game/math";
import { REGIONAL_LINE_BIAS, type Bloodline } from "@/core/breeding/populationGenetics";
import { calculateDosageMetrics } from "@/game/dosage";
import { calculateOptimalRunningStyle } from "@/core/ai/jockeyStrategyAI";
import type { NpcAIManager } from "@/core/ai/npcCycleAI";

// Standardizing imports for relocated file
import type {
  Horse as HorseT,
  Race as RaceT,
  Stable as StableT,
  Jockey as JockeyT,
  RunningStyle as RunningStyleT,
} from "@/game/types";

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
  runningStyle: RunningStyleT;
  draftingHorseId: string | null;
  horse: HorseT;
  jockey?: JockeyT;
  weight: number;
  tactics: string;
};

function paceShapeMul(style: RunningStyleT, progress: number): number {
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

function styleStaminaFactor(style: RunningStyleT, baseStaminaFactor: number): number {
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

export type ConditionsModifier = {
  speedMul: number;
  staminaDrainMul: number;
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
): Runner {
  const formMod = 1 + h.form / 100;
  const energyMod = 0.8 + (h.energy / 100) * 0.2;
  const formEnergy = clamp(formMod * energyMod, 0.5, MAX_FORM_ENERGY_MUL);

  const distDiff = Math.abs(h.distanceAptitude - raceDistance);
  const distanceMod = 1 - Math.min(0.1, Math.max(0, distDiff - 400) / 8000);
  const surfaceMod = surface ? (h.surfaceAptitude[surface] ?? 0.95) : 1.0;

  const fiberMods = h.fiberBias
    ? fiberDistanceModifier(h.fiberBias, raceDistance)
    : { speedMul: 1, staminaMul: 1 };

  const conditionsHarsh = conditions.speedMul < 0.97;
  const mudMod = conditionsHarsh ? (h.mudAptitude ?? 1.0) : 1.0;

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
    dosageDistanceMod;
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
  const temperamentMod = 1 + (TRAIT_VALUES[h.temperament || "fair"] - 2) * -0.1;
  const conformationMod = 1 + (TRAIT_VALUES[h.conformation || "fair"] - 2) * -0.03;

  const conditionStamina = clamp(
    1 - (1 - baseStamina) * conditions.staminaDrainMul * conformationMod,
    0.2,
    1,
  );

  let runningStyle: RunningStyleT = h.runningStyle ?? "P";
  
  // Use tactics from race entry if available (for both player and NPC)
  const entry = race?.entries.find(e => e.horseId === h.id);
  if (entry?.tactics && entry.tactics !== "default") {
    const tacticsMap: Record<string, RunningStyleT> = {
      "lead": "E",
      "rail": "EP",
      "outside": "P",
      "save": "P",
      "late_kick": "S"
    };
    runningStyle = tacticsMap[entry.tactics] || runningStyle;
  } else if (npcAIManager && currentDay && stable && jockey && race && !owned) {
    const aiState = npcAIManager.stableStates.get(stable.id);
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
    noise,
    runningStyle,
    draftingHorseId: null,
    horse: h,
    jockey,
    weight: assignedWeight,
    tactics: entry?.tactics || "default",
  };
}

export type PaceContext = {
  leaderPos: number;
  leadGroupCount: number;
  pacePressure: number;
  progress: number;
  laneDensity: number[];
};

export function computePaceContext(runners: Runner[], distance: number): PaceContext {
  let leaderPos = 0;
  let totalProgress = 0;
  let alive = 0;
  const laneDensity = new Array(12).fill(0);

  for (const r of runners) {
    if (r.position > leaderPos) leaderPos = r.position;
    if (r.finishTime === null) {
      totalProgress += r.position / distance;
      alive++;
      const laneIdx = Math.floor(r.lane / 1.2);
      if (laneIdx >= 0 && laneIdx < 12) laneDensity[laneIdx]++;
    } else {
      totalProgress += 1;
    }
  }
  let leadGroupCount = 0;
  let frontRunnersInLeadGroup = 0;
  for (const r of runners) {
    if (r.finishTime !== null) continue;
    if (leaderPos - r.position <= 4) {
      leadGroupCount++;
      if (r.runningStyle === "E") frontRunnersInLeadGroup++;
    }
  }
  const pacePressure = clamp((frontRunnersInLeadGroup - 1) / 2, 0, 1);
  const progress = alive > 0 ? totalProgress / runners.length : 1;
  return { leaderPos, leadGroupCount, pacePressure, progress, laneDensity };
}

const DRAFT_DISTANCE = 3;
const DRAFT_SPEED_BONUS = 1.015;
const DRAFT_STAMINA_PRESERVE = 0.5;

function getDraftingHorseId(r: Runner, runners: Runner[]): string | null {
  for (const other of runners) {
    if (other.horseId === r.horseId) continue;
    const gap = other.position - r.position;
    const laneGap = Math.abs(other.lane - r.lane);
    if (gap > 0 && gap <= DRAFT_DISTANCE && laneGap < 0.8) return other.horseId;
  }
  return null;
}

function getTrackSection(
  pos: number,
  distance: number,
  course?: CourseSpecification,
): TrackSection | null {
  if (!course || !course.sections || course.sections.length === 0) return null;

  const circ = course.circumference;
  const startOffset = (circ - (distance % circ)) % circ;
  const trackPos = (startOffset + pos) % circ;

  let currentPos = 0;
  for (const section of course.sections) {
    if (trackPos >= currentPos && trackPos < currentPos + section.length) {
      return section;
    }
    currentPos += section.length;
  }
  return course.sections[0];
}

function getTrackRadius(pos: number, distance: number, course?: CourseSpecification): number {
  const section = getTrackSection(pos, distance, course);
  return section?.type === "turn" ? (section.radius ?? Infinity) : Infinity;
}

function getTrackGradient(pos: number, distance: number, course?: CourseSpecification): number {
  const section = getTrackSection(pos, distance, course);
  return section?.gradient ?? 0;
}

export function stepRunner(
  r: Runner,
  dt: number,
  t: number,
  distance: number,
  rng: { next: () => number } | Rng,
  field?: Runner[],
  pace?: PaceContext,
  course?: CourseSpecification,
) {
  if (r.finishTime !== null) return;
  const progress = r.position / distance;

  r.draftingHorseId = field ? getDraftingHorseId(r, field) : null;

  const LANE_WIDTH = 1.2;
  const MAX_LATERAL_SPEED = 2.0;

  let targetLane = 0;
  if (r.runningStyle === "S" && progress < 0.4) targetLane = 1;

  // Tactics-based lane bias
  if (r.tactics === "rail") targetLane = 0;
  if (r.tactics === "outside" && progress < 0.8) targetLane = 2;
  if (r.tactics === "lead" && progress < 0.2) targetLane = 0;

  if (field && pace) {
    const laneIdx = Math.floor(r.lane / LANE_WIDTH);
    if (laneIdx === 0 && pace.laneDensity[0] > 4 && progress < 0.7) {
      if (r.position < pace.leaderPos - 2) targetLane = 1;
    }

    for (const other of field) {
      if (other.horseId === r.horseId) continue;
      const gap = other.position - r.position;
      const laneGap = Math.abs(other.lane - r.lane);
      if (gap > 0 && gap < 2.5 && laneGap < 0.8) {
        targetLane = Math.min(10, laneIdx + 1);
        break;
      }
    }
  }
  r.targetLane = targetLane;

  const targetPos = r.targetLane * LANE_WIDTH;
  const lateralDiff = targetPos - r.lane;
  if (Math.abs(lateralDiff) > 0.01) {
    const step = Math.sign(lateralDiff) * Math.min(Math.abs(lateralDiff), MAX_LATERAL_SPEED * dt);
    r.lane += step;
  }

  const radius = getTrackRadius(r.position, distance, course);
  const gradient = getTrackGradient(r.position, distance, course);
  const arcFactor = radius === Infinity ? 1 : 1 + r.lane / radius;

  const gradientSpeedMul = 1 - gradient / 100;
  const isHillSpecialist = r.jockey?.traits.includes("hill_specialist");
  const climbingApt = r.horse?.climbingAptitude ?? 1.0;

  let gradientStaminaMul = gradient > 0 ? 1 - gradient / (200 * climbingApt) : 1;
  if (gradient > 0 && isHillSpecialist) {
    gradientStaminaMul = 1 - gradient / (400 * climbingApt);
  }

  let turnSpeedMul = 1.0;
  if (radius !== Infinity) {
    const centrifugalPressure = (r.velocity * r.velocity) / (radius * 10);
    const agilityMitigation = (r.horse.stats.acceleration / 100) * 0.6;
    const corneringApt = r.horse?.corneringAptitude ?? 1.0;
    const isBullringExpert = r.jockey?.traits.includes("bullring_expert");
    const positioningSkill = (r.jockey?.stats.positioning ?? 50) / 200;
    const traitBonus = isBullringExpert ? 0.2 : 0;

    const totalPenalty = Math.min(
      0.4,
      Math.max(
        0,
        centrifugalPressure - agilityMitigation * corneringApt - positioningSkill - traitBonus,
      ),
    );
    turnSpeedMul = 1 - totalPenalty;
  }

  let staminaMul = 1;
  if (progress > 0.6) {
    const fade = (progress - 0.6) / 0.4;
    let effectiveStamina = r.staminaFactor;
    if (r.draftingHorseId) {
      effectiveStamina = effectiveStamina + (1 - effectiveStamina) * DRAFT_STAMINA_PRESERVE;
    }
    if (pace && pace.pacePressure > 0 && r.runningStyle === "E") {
      effectiveStamina = clamp(effectiveStamina - 0.08 * pace.pacePressure, 0.2, 1);
    }
    const bleederRisk = r.horse.bleederRisk ?? 0;
    if (bleederRisk > 0 && distance >= 1600 && progress > 0.7) {
      if (rng.next() < bleederRisk * dt * 0.5) {
        effectiveStamina = clamp(effectiveStamina - 0.2, 0.1, 1);
      }
    }
    const roarerRisk = r.horse.roarerRisk ?? 0;
    if (roarerRisk > 0 && r.velocity > r.topSpeed * 0.95) {
      if (rng.next() < roarerRisk * dt * 0.3) {
        effectiveStamina = clamp(effectiveStamina - 0.15, 0.1, 1);
      }
    }

    // "Save" tactics preservation
    if (r.tactics === "save" && progress < 0.7) {
      effectiveStamina = clamp(effectiveStamina + 0.1, 0, 1.1);
    }

    staminaMul = 1 - (1 - effectiveStamina) * fade;
  }

  let styleMul = paceShapeMul(r.runningStyle, progress);

  const straight = course?.straightLength ?? 400;
  if (straight < 350) {
    if (r.runningStyle === "E" && progress > 0.8) {
      const isFrontRunnerJockey = r.jockey?.archetype === "front_runner";
      const jockeyBonus =
        (r.jockey?.stats.positioning ?? 50) / 1000 + (isFrontRunnerJockey ? 0.02 : 0);
      styleMul *= 1.03 + jockeyBonus;
    }
  } else if (straight > 500) {
    if ((r.runningStyle === "S" || r.runningStyle === "P") && progress > 0.7) {
      const isCloserJockey = r.jockey?.archetype === "closer";
      const isLongStraightPro = r.jockey?.traits.includes("long_straight_pro");
      const jockeyBonus = (r.jockey?.stats.pacing ?? 50) / 1000 + (isCloserJockey ? 0.02 : 0);
      const traitBonus =
        progress > 0.85 && isLongStraightPro ? (r.jockey?.stats.vigor ?? 50) / 400 : 0;
      styleMul *= 1.02 + jockeyBonus + traitBonus;
    }
  }

  // "Late Kick" velocity boost
  if (r.tactics === "late_kick" && progress > 0.85) {
    styleMul *= 1.08 + (r.jockey?.stats.vigor ?? 50) / 1000;
  }

  if (r.runningStyle === "E" && pace && pace.leaderPos - r.position > 3) {
    styleMul *= 0.98;
  }

  if (pace && pace.pacePressure > 0 && r.runningStyle === "S" && progress > 0.6) {
    styleMul *= 1 + 0.05 * pace.pacePressure;
  }

  if (r.runningStyle === "E" && progress < 0.2 && r.lane > 2.4) {
    staminaMul *= 0.98;
  }

  let draftMul = 1;
  if (r.draftingHorseId && progress < 0.95) {
    draftMul = DRAFT_SPEED_BONUS;
    // "Rail" tactics bonus for drafting
    if (r.tactics === "rail") draftMul *= 1.005;
  }

  const targetSpeed =
    r.topSpeed *
    staminaMul *
    styleMul *
    draftMul *
    turnSpeedMul *
    gradientSpeedMul *
    (1 + (rng.next() - 0.5) * 0.08 * r.noise);

  const diff = targetSpeed - r.velocity;
  r.velocity += Math.sign(diff) * Math.min(Math.abs(diff), r.accel * dt);

  const ds = r.velocity * dt;

  let finalDs = ds;
  if (r.jockey) {
    const stats = r.jockey.stats;
    const arch = r.jockey.archetype;

    if (progress < 0.05) {
      r.velocity += (stats.gateSkill / 100) * 0.5 * dt;
    }

    if (radius !== Infinity) {
      const positioningBonus = (stats.positioning / 100) * 0.4;
      const effectiveLane = Math.max(0, r.lane * (1 - positioningBonus));
      const adjustedArcFactor = 1 + effectiveLane / radius;
      finalDs = (r.velocity * dt) / adjustedArcFactor;
    } else {
      finalDs = (r.velocity * dt) / arcFactor;
    }

    const isMatched =
      (arch === "front_runner" && r.runningStyle === "E") ||
      (arch === "closer" && r.runningStyle === "S") ||
      (arch === "clinical" && r.runningStyle === "EP") ||
      (arch === "finisher" && r.runningStyle === "P");

    if (isMatched && progress > 0.4) {
      staminaMul *= 1 + (stats.pacing / 100) * 0.02;
    }

    if (arch === "front_runner" && r.runningStyle === "S" && progress < 0.4) {
      r.velocity += 0.2 * dt;
      staminaMul *= 0.97;
    }

    if (progress > 0.8) {
      const vigorBoost = (stats.vigor / 100) * 0.03;
      r.velocity += vigorBoost * dt;
    }
  } else {
    finalDs = ds / arcFactor;
  }

  r.position += finalDs;

  if (r.position >= distance) {
    const overshoot = r.position - distance;
    const tFinish = r.velocity > 0 ? t - (overshoot * arcFactor) / r.velocity : t;
    r.position = distance;
    r.finishTime = tFinish;
  }
}

export function runRaceToCompletion(
  runners: Runner[],
  distance: number,
  rng: Rng,
  dt: number = 0.1,
  maxTime: number = 600,
  course?: CourseSpecification,
): { horseId: string; position: number; time: number }[] {
  let t = 0;
  while (runners.some((r) => r.finishTime === null) && t < maxTime) {
    const pace = computePaceContext(runners, distance);
    for (const r of runners) stepRunner(r, dt, t, distance, rng, runners, pace, course);
    t += dt;
  }
  const ranked = [...runners]
    .map((r) => ({ horseId: r.horseId, time: r.finishTime ?? Infinity }))
    .sort((a, b) => a.time - b.time);
  return ranked.map((r, idx) => ({ horseId: r.horseId, position: idx + 1, time: r.time }));
}
