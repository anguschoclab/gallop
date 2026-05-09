/**
 * simulation.ts - Race simulation engine
 *
 * This file provides the core race simulation engine, including pace context calculation,
 * runner stepping logic, drafting, track geometry effects, stamina fade, and tactical AI
 * integration. Generates race results and optional replay snapshots.
 *
 * Dependencies: @/game/types (Horse, Race, Stable, Jockey), @/game/tracks (CourseSpecification, TrackSection), @/core/common/types (Rng), @/game/math (clamp), ./raceSnapshotTypes (RaceSnapshot), ./tacticalAI (calculateTacticalAdjustment), ./runnerBuilder (Runner, PaceContext, paceShapeMul)
 * Related files: runnerBuilder.ts (provides runner objects), tacticalAI.ts (provides tactical adjustments)
 */

import type {
  Horse,
  Race,
  Stable,
  Jockey,
} from "@/game/types";
import type { CourseSpecification, TrackSection } from "@/game/tracks";
import type { Rng } from "@/core/common/types";
import { clamp } from "@/game/math";
import type { RaceSnapshot } from "./raceSnapshotTypes";
import { calculateTacticalAdjustment } from "./tacticalAI";
import { 
  type Runner, 
  type PaceContext, 
  paceShapeMul 
} from "./runnerBuilder";

// Standardizing imports for relocated file
import type {
  Race as RaceT,
} from "@/game/types";

/**
 * Compute pace context from current runner positions.
 *
 * Calculates leader position, velocity, lead group count, pace pressure,
 * race progress, lane density, and pace rating for tactical decisions.
 *
 * @param runners - All runners in the race
 * @param distance - Race distance in meters
 * @returns Pace context object
 *
 * @example
 * const pace = computePaceContext(runners, 1600);
 */
export function computePaceContext(runners: Runner[], distance: number): PaceContext {
  let leaderPos = 0;
  let leaderVelocity = 0;
  let totalProgress = 0;
  let alive = 0;
  const laneDensity = new Array(12).fill(0);

  // Find leader first (needed for lead group calculation)
  for (const r of runners) {
    if (r.position > leaderPos) {
      leaderPos = r.position;
      leaderVelocity = r.velocity;
    }
  }

  let leadGroupCount = 0;
  let frontRunnersInLeadGroup = 0;

  for (const r of runners) {
    if (r.finishTime === null) {
      totalProgress += r.position / distance;
      alive++;
      const laneIdx = Math.floor(r.lane / 1.2);
      if (laneIdx >= 0 && laneIdx < 12) laneDensity[laneIdx]++;

      // Pace pressure and lead group check
      if (leaderPos - r.position <= 4) {
        leadGroupCount++;
        if (r.runningStyle === "E") frontRunnersInLeadGroup++;
      }
    } else {
      totalProgress += 1;
    }
  }

  // Calculate Pace Rating
  const expectedVel = 18.5 - (distance / 3000) * 2.5; 
  const paceRating = leaderVelocity / expectedVel;
  const pacePressure = clamp((frontRunnersInLeadGroup - 1) / 2, 0, 1);
  const progress = alive > 0 ? totalProgress / runners.length : 1;

  return {
    leaderPos,
    leaderVelocity,
    leadGroupCount,
    pacePressure,
    progress,
    laneDensity,
    paceRating,
  };
}

const DRAFT_DISTANCE = 3;
const DRAFT_SPEED_BONUS = 1.015;
const DRAFT_STAMINA_PRESERVE = 0.5;

function getDraftingHorseId(r: Runner, sortedField: Runner[]): string | null {
  for (const other of sortedField) {
    if (other.horseId === r.horseId) continue;
    const gap = other.position - r.position;
    if (gap <= 0) break; // Optimization: stop early
    if (gap > DRAFT_DISTANCE) continue;
    
    const laneGap = Math.abs(other.lane - r.lane);
    if (laneGap < 0.8) return other.horseId;
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

/**
 * Step a single runner forward in time by dt.
 *
 * Updates runner position, velocity, lane, and energy based on physics,
 * drafting, track geometry, and tactical AI. Returns early if runner has finished.
 *
 * @param r - Runner to step
 * @param dt - Time delta in seconds
 * @param t - Current simulation time
 * @param distance - Race distance in meters
 * @param rng - Random number generator
 * @param sortedField - Runners in the race sorted by position descending (for spatial lookups)
 * @param pace - Current pace context (for tactical decisions)
 * @param course - Track course specification (for geometry effects)
 */
export function stepRunner(
  r: Runner,
  dt: number,
  t: number,
  distance: number,
  rng: { next: () => number } | Rng,
  sortedField?: Runner[],
  pace?: PaceContext,
  course?: CourseSpecification,
) {
  if (r.finishTime !== null) return;
  const progress = r.position / distance;

  // Optimize drafting lookup using sortedField
  r.draftingHorseId = sortedField ? getDraftingHorseId(r, sortedField) : null;

  const LANE_WIDTH = 1.2;
  const MAX_LATERAL_SPEED = 2.0;

  let targetLane = 0;
  if (r.runningStyle === "S" && progress < 0.4) targetLane = 1;

  // Tactics-based lane bias
  if (r.tactics === "rail") targetLane = 0;
  if (r.tactics === "outside" && progress < 0.8) targetLane = 2;
  if (r.tactics === "lead" && progress < 0.2) targetLane = 0;

  if (sortedField && pace) {
    const laneIdx = Math.floor(r.lane / LANE_WIDTH);
    if (laneIdx === 0 && pace.laneDensity[0] > 4 && progress < 0.7) {
      if (r.position < pace.leaderPos - 2) targetLane = 1;
    }

    // Faster blocking lookup using sortedField
    for (const other of sortedField) {
      if (other.horseId === r.horseId) continue;
      const gap = other.position - r.position;
      if (gap <= 0) break; // Optimization: stop early
      if (gap >= 2.5) continue;
      
      const laneGap = Math.abs(other.lane - r.lane);
      if (laneGap < 0.8) {
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

  // Optimize track lookups by calling getTrackSection once
  const section = getTrackSection(r.position, distance, course);
  const radius = section?.type === "turn" ? (section.radius ?? Infinity) : Infinity;
  const gradient = section?.gradient ?? 0;
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
      let vigorBoost = (stats.vigor / 100) * 0.03;
      // "Late Kick" tactic bonus
      if (r.tactics === "late_kick" && progress > 0.92) {
        vigorBoost *= 1.5;
      }
      r.velocity += vigorBoost * dt;
    }
  } else {
    finalDs = ds / arcFactor;
  }

  // --- Tactical AI Integration (Throttle to ~1Hz) ---
  if (Math.floor(t / 1.0) !== Math.floor((t - dt) / 1.0) && pace) {
    const tactical = calculateTacticalAdjustment(r, pace, sortedField || []);
    r.velocity *= (1 + (tactical.velocityMod - 1) * dt);
    r.lane += (tactical.targetLane - r.lane) * 0.1 * dt;
  }

  // Faster blocking lookup using sortedField
  const blockingHorse = (sortedField || []).find(other => 
    other.horseId !== r.horseId &&
    other.finishTime === null &&
    other.position > r.position &&
    other.position - r.position < 1.5 &&
    Math.abs(other.lane - r.lane) < 0.4
  );
  if (blockingHorse) {
    r.velocity = Math.min(r.velocity, blockingHorse.velocity * 0.98);
  }

  r.position += finalDs;

  if (r.position >= distance) {
    const overshoot = r.position - distance;
    const tFinish = r.velocity > 0 ? t - (overshoot * arcFactor) / r.velocity : t;
    r.position = distance;
    r.finishTime = tFinish;
  }
}

/**
 * Run race to completion.
 *
 * Simulates a full race from start to finish, stepping all runners forward
 * until all finish or max time is reached. Returns final results and optional
 * replay snapshots.
 *
 * @param runners - All runners in the race
 * @param distance - Race distance in meters
 * @param rng - Random number generator
 * @param dt - Time delta per step in seconds
 * @param maxTime - Maximum simulation time in seconds
 * @param course - Optional track course specification
 * @param recordSnapshots - Whether to record replay snapshots
 * @returns Race result and optional snapshots
 *
 * @example
 * const { result, snapshots } = runRaceToCompletion(runners, 1600, rng, 0.1, 600, course, true);
 */
/**
 * Run a race to completion and return results.
 *
 * Simulates all runners stepping forward until all finish or maxTime is reached.
 * Optionally records snapshots for replay visualization.
 *
 * @param runners - All runners in the race
 * @param distance - Race distance in meters
 * @param rng - Random number generator
 * @param dt - Time step in seconds (default 0.1)
 * @param maxTime - Maximum simulation time in seconds (default 600)
 * @param course - Track course specification for geometry effects
 * @param recordSnapshots - Whether to record snapshots for replay (default false)
 * @returns Race result with positions, times, and optional snapshots
 */
export function runRaceToCompletion(
  runners: Runner[],
  distance: number,
  rng: Rng,
  dt: number = 0.1,
  maxTime: number = 600,
  course?: CourseSpecification,
  recordSnapshots: boolean = false,
): {
  result: { horseId: string; position: number; time: number }[];
  snapshots: RaceSnapshot[];
} {
  let t = 0;
  const snapshots: RaceSnapshot[] = [];
  const numRunners = runners.length;
  let finishedCount = 0;

  // Initialize finishedCount in case some runners start finished (unlikely but safe)
  for (const r of runners) {
    if (r.finishTime !== null) finishedCount++;
  }

  while (finishedCount < numRunners && t < maxTime) {
    const pace = computePaceContext(runners, distance);
    
    // Sort runners by position for faster spatial lookups in stepRunner
    const sortedField = [...runners].sort((a, b) => b.position - a.position);

    for (const r of runners) {
      if (r.finishTime !== null) continue;
      
      stepRunner(r, dt, t, distance, rng, sortedField, pace, course);
      
      if (r.finishTime !== null) {
        finishedCount++;
      }
    }

    if (recordSnapshots) {
      snapshots.push({
        t,
        horses: runners.map((r) => ({
          horseId: r.horseId,
          position: r.position,
          lane: r.lane,
          velocity: r.velocity,
        })),
      });
    }

    t += dt;
  }

  const ranked = [...runners]
    .map((r) => ({ horseId: r.horseId, time: r.finishTime ?? Infinity }))
    .sort((a, b) => a.time - b.time);

  const result = ranked.map((r, idx) => ({
    horseId: r.horseId,
    position: idx + 1,
    time: r.time,
  }));

  return { result, snapshots };
}
