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

import type { Horse, Race, Stable, Jockey } from "@/game/types";
import type { CourseSpecification, TrackSection } from "@/game/tracks";
import type { Rng } from "@/core/common/types";
import { clamp } from "@/game/math";
import type { RaceSnapshot } from "./raceSnapshotTypes";
import { calculateTacticalAdjustment } from "./tacticalAI";
import { type Runner, type PaceContext, paceShapeMul } from "./runnerBuilder";

// Standardizing imports for relocated file
import type { Race as RaceT } from "@/game/types";

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

// Drafting constants
const DRAFT_DISTANCE = 3;
const DRAFT_SPEED_BONUS = 1.015;
const DRAFT_STAMINA_PRESERVE = 0.5;

// Track geometry constants
const LANE_WIDTH = 1.2;
const MAX_LATERAL_SPEED = 2.0;

// Lane change thresholds
const LANE_GAP_THRESHOLD = 0.8;
const POSITION_GAP_THRESHOLD = 2.5;
const LATERAL_DIFF_THRESHOLD = 0.01;

// Progress thresholds for running styles
const STALKER_PROGRESS_THRESHOLD = 0.4;
const OUTSIDE_PROGRESS_THRESHOLD = 0.8;
const LEAD_PROGRESS_THRESHOLD = 0.2;
const CONGESTED_LANE_PROGRESS_THRESHOLD = 0.7;
const CONGESTED_LANE_DENSITY_THRESHOLD = 4;
const LANE_POSITION_GAP_THRESHOLD = 2;

// Turn physics constants
const AGILITY_MITIGATION_FACTOR = 0.6;
const POSITIONING_SKILL_FACTOR = 0.5; // 1/200 of positioning stat
const BULLRING_TRAIT_BONUS = 0.2;
const MAX_TURN_PENALTY = 0.4;

// Stamina constants
const STAMINA_FADE_START = 0.6;
const STAMINA_FADE_DURATION = 0.4;
const PACE_PRESSURE_STAMINA_PENALTY = 0.08;
const BLEEDER_DISTANCE_THRESHOLD = 1600;
const BLEEDER_PROGRESS_THRESHOLD = 0.7;
const BLEEDER_RISK_MULTIPLIER = 0.5;
const BLEEDER_STAMINA_PENALTY = 0.2;
const ROANER_SPEED_THRESHOLD = 0.95;
const ROANER_RISK_MULTIPLIER = 0.3;
const ROANER_STAMINA_PENALTY = 0.15;
const SAVE_TACTICS_PROGRESS_THRESHOLD = 0.7;
const SAVE_TACTICS_STAMINA_BONUS = 0.1;
const EARLY_SPEED_PENALTY_THRESHOLD = 0.2;
const EARLY_SPEED_LANE_THRESHOLD = 2.4;
const EARLY_SPEED_STAMINA_PENALTY = 0.98;

// Style and jockey constants
const SHORT_STRAIGHT_THRESHOLD = 350;
const LONG_STRAIGHT_THRESHOLD = 500;
const FRONT_RUNNER_PROGRESS_THRESHOLD = 0.8;
const CLOSER_PROGRESS_THRESHOLD = 0.7;
const LATE_KICK_PROGRESS_THRESHOLD = 0.85;
const LATE_KICK_BOOST_THRESHOLD = 0.92;
const FRONT_RUNNER_BONUS = 0.02;
const CLOSER_BONUS = 0.02;
const FRONT_RUNNER_STYLE_MULTIPLIER = 1.03;
const CLOSER_STYLE_MULTIPLIER = 1.02;
const LATE_KICK_MULTIPLIER = 1.08;
const POSITIONING_BONUS_FACTOR = 0.001;
const PACING_BONUS_FACTOR = 0.001;
const VIGOR_BONUS_FACTOR = 0.001;
const LONG_STRAIGHT_VIGOR_THRESHOLD = 0.85;
const LONG_STRAIGHT_VIGOR_FACTOR = 0.0025; // 1/400
const PACE_PRESSURE_STYLE_BONUS = 0.05;
const STALKER_PACE_PRESSURE_THRESHOLD = 0.6;
const FRONT_RUNNER_PACE_THRESHOLD = 3;
const FRONT_RUNNER_STYLE_PENALTY = 0.98;
const POSITIONING_BONUS_TURN = 0.4;
const MATCHED_ARCHETYPE_PROGRESS_THRESHOLD = 0.4;
const PACING_STAMINA_BONUS_FACTOR = 0.0002; // 0.02/100
const FRONT_RUNNER_STALKER_MISMATCH_VELOCITY_BONUS = 0.2;
const FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY = 0.97;
const VIGOR_BOOST_FACTOR = 0.0003; // 0.03/100
const VIGOR_PROGRESS_THRESHOLD = 0.8;
const LATE_KICK_VIGOR_MULTIPLIER = 1.5;
const GATE_SKILL_VELOCITY_BONUS = 0.005; // 0.5/100
const GATE_SKILL_PROGRESS_THRESHOLD = 0.05;

/**
 * Calculate target lane based on running style, tactics, and race conditions.
 * @param r
 * @param progress
 * @param sortedField
 * @param pace
 * @returns The target lane position for the runner.
 */
function calculateTargetLane(
  r: Runner,
  progress: number,
  sortedField?: Runner[],
  pace?: PaceContext,
): number {
  let targetLane = 0;
  if (r.runningStyle === "S" && progress < STALKER_PROGRESS_THRESHOLD) targetLane = 1;

  // Tactics-based lane bias
  if (r.tactics === "rail") targetLane = 0;
  if (r.tactics === "outside" && progress < OUTSIDE_PROGRESS_THRESHOLD) targetLane = 2;
  if (r.tactics === "lead" && progress < LEAD_PROGRESS_THRESHOLD) targetLane = 0;

  if (sortedField && pace) {
    const laneIdx = Math.floor(r.lane / LANE_WIDTH);
    if (
      laneIdx === 0 &&
      pace.laneDensity[0] > CONGESTED_LANE_DENSITY_THRESHOLD &&
      progress < CONGESTED_LANE_PROGRESS_THRESHOLD
    ) {
      if (r.position < pace.leaderPos - LANE_POSITION_GAP_THRESHOLD) targetLane = 1;
    }

    // Faster blocking lookup using sortedField
    for (const other of sortedField) {
      if (other.horseId === r.horseId) continue;
      const gap = other.position - r.position;
      if (gap <= 0) break; // Optimization: stop early
      if (gap >= POSITION_GAP_THRESHOLD) continue;

      const laneGap = Math.abs(other.lane - r.lane);
      if (laneGap < LANE_GAP_THRESHOLD) {
        targetLane = Math.min(10, laneIdx + 1);
        break;
      }
    }
  }
  return targetLane;
}

/**
 * Update lane position towards target lane.
 * @param r
 * @param targetLane
 * @param dt
 * @returns void
 */
function updateLanePosition(r: Runner, targetLane: number, dt: number): void {
  const targetPos = targetLane * LANE_WIDTH;
  const lateralDiff = targetPos - r.lane;
  if (Math.abs(lateralDiff) > LATERAL_DIFF_THRESHOLD) {
    const step = Math.sign(lateralDiff) * Math.min(Math.abs(lateralDiff), MAX_LATERAL_SPEED * dt);
    r.lane += step;
  }
  r.targetLane = targetLane;
}

/**
 * Calculate track geometry modifiers (gradient and turn effects).
 * @param r
 * @param position
 * @param distance
 * @param course
 * @returns Track geometry modifiers including speed multipliers, stamina multiplier, arc factor, and turn radius.
 */
function calculateTrackGeometryModifiers(
  r: Runner,
  position: number,
  distance: number,
  course?: CourseSpecification,
): {
  turnSpeedMul: number;
  gradientSpeedMul: number;
  gradientStaminaMul: number;
  arcFactor: number;
  radius: number;
} {
  const section = getTrackSection(position, distance, course);
  const radius = section?.type === "turn" ? (section.radius ?? Infinity) : Infinity;
  const gradient = section?.gradient ?? 0;
  const arcFactor = radius === Infinity ? 1 : 1 + r.lane / radius;

  const gradientSpeedMul = 1 - gradient / 100;
  const isHillSpecialist = r.jockey?.traits.includes("hill_specialist");
  const climbingApt = (r.horse as any)?.climbingAptitude ?? 1.0;

  let gradientStaminaMul = gradient > 0 ? 1 - gradient / (200 * climbingApt) : 1;
  if (gradient > 0 && isHillSpecialist) {
    gradientStaminaMul = 1 - gradient / (400 * climbingApt);
  }

  let turnSpeedMul = 1.0;
  if (radius !== Infinity) {
    const centrifugalPressure = (r.velocity * r.velocity) / (radius * 10);
    const agilityMitigation = (r.horse.stats.acceleration / 100) * AGILITY_MITIGATION_FACTOR;
    const corneringApt = (r.horse as any)?.corneringAptitude ?? 1.0;
    const isBullringExpert = r.jockey?.traits.includes("bullring_expert");
    const positioningSkill = (r.jockey?.stats.positioning ?? 50) * POSITIONING_SKILL_FACTOR;
    const traitBonus = isBullringExpert ? BULLRING_TRAIT_BONUS : 0;

    const totalPenalty = Math.min(
      MAX_TURN_PENALTY,
      Math.max(
        0,
        centrifugalPressure - agilityMitigation * corneringApt - positioningSkill - traitBonus,
      ),
    );
    turnSpeedMul = 1 - totalPenalty;
  }

  return { turnSpeedMul, gradientSpeedMul, gradientStaminaMul, arcFactor, radius };
}

/**
 * Calculate stamina multiplier based on progress, drafting, pace pressure, and health risks.
 * @param r
 * @param progress
 * @param distance
 * @param pace
 * @param rng
 * @param dt
 * @returns The stamina multiplier to apply to the runner.
 */
function calculateStaminaMultiplier(
  r: Runner,
  progress: number,
  distance: number,
  pace?: PaceContext,
  rng?: { next: () => number } | Rng,
  dt?: number,
): number {
  let staminaMul = 1;
  if (progress > STAMINA_FADE_START) {
    const fade = (progress - STAMINA_FADE_START) / STAMINA_FADE_DURATION;
    let effectiveStamina = r.staminaFactor;
    if (r.draftingHorseId) {
      effectiveStamina = effectiveStamina + (1 - effectiveStamina) * DRAFT_STAMINA_PRESERVE;
    }
    if (pace && pace.pacePressure > 0 && r.runningStyle === "E") {
      effectiveStamina = clamp(
        effectiveStamina - PACE_PRESSURE_STAMINA_PENALTY * pace.pacePressure,
        0.2,
        1,
      );
    }
    const bleederRisk = r.horse.bleederRisk ?? 0;
    if (
      bleederRisk > 0 &&
      distance >= BLEEDER_DISTANCE_THRESHOLD &&
      progress > BLEEDER_PROGRESS_THRESHOLD &&
      rng &&
      dt
    ) {
      if (rng.next() < bleederRisk * dt * BLEEDER_RISK_MULTIPLIER) {
        effectiveStamina = clamp(effectiveStamina - BLEEDER_STAMINA_PENALTY, 0.1, 1);
      }
    }
    const roanerRisk = r.horse.roarerRisk ?? 0;
    if (roanerRisk > 0 && r.velocity > r.topSpeed * ROANER_SPEED_THRESHOLD && rng && dt) {
      if (rng.next() < roanerRisk * dt * ROANER_RISK_MULTIPLIER) {
        effectiveStamina = clamp(effectiveStamina - ROANER_STAMINA_PENALTY, 0.1, 1);
      }
    }

    // "Save" tactics preservation
    if (r.tactics === "save" && progress < SAVE_TACTICS_PROGRESS_THRESHOLD) {
      effectiveStamina = clamp(effectiveStamina + SAVE_TACTICS_STAMINA_BONUS, 0, 1.1);
    }

    staminaMul = 1 - (1 - effectiveStamina) * fade;
  }

  // Early speed penalty from wide lane
  if (
    r.runningStyle === "E" &&
    progress < EARLY_SPEED_PENALTY_THRESHOLD &&
    r.lane > EARLY_SPEED_LANE_THRESHOLD
  ) {
    staminaMul *= EARLY_SPEED_STAMINA_PENALTY;
  }

  return staminaMul;
}

/**
 * Calculate style multiplier based on running style, progress, track straight, and jockey bonuses.
 * @param r
 * @param progress
 * @param pace
 * @param course
 * @returns The style multiplier to apply to the runner.
 */
function calculateStyleMultiplier(
  r: Runner,
  progress: number,
  pace?: PaceContext,
  course?: CourseSpecification,
): number {
  let styleMul = paceShapeMul(r.runningStyle, progress);

  const straight = course?.straightLength ?? 400;
  if (straight < SHORT_STRAIGHT_THRESHOLD) {
    if (r.runningStyle === "E" && progress > FRONT_RUNNER_PROGRESS_THRESHOLD) {
      const isFrontRunnerJockey = r.jockey?.archetype === "front_runner";
      const jockeyBonus =
        (r.jockey?.stats.positioning ?? 50) * POSITIONING_BONUS_FACTOR +
        (isFrontRunnerJockey ? FRONT_RUNNER_BONUS : 0);
      styleMul *= FRONT_RUNNER_STYLE_MULTIPLIER + jockeyBonus;
    }
  } else if (straight > LONG_STRAIGHT_THRESHOLD) {
    if (
      (r.runningStyle === "S" || r.runningStyle === "P") &&
      progress > CLOSER_PROGRESS_THRESHOLD
    ) {
      const isCloserJockey = r.jockey?.archetype === "closer";
      const isLongStraightPro = r.jockey?.traits.includes("long_straight_pro");
      const jockeyBonus =
        (r.jockey?.stats.pacing ?? 50) * PACING_BONUS_FACTOR + (isCloserJockey ? CLOSER_BONUS : 0);
      const traitBonus =
        progress > LONG_STRAIGHT_VIGOR_THRESHOLD && isLongStraightPro
          ? (r.jockey?.stats.vigor ?? 50) * LONG_STRAIGHT_VIGOR_FACTOR
          : 0;
      styleMul *= CLOSER_STYLE_MULTIPLIER + jockeyBonus + traitBonus;
    }
  }

  // "Late Kick" velocity boost
  if (r.tactics === "late_kick" && progress > LATE_KICK_PROGRESS_THRESHOLD) {
    styleMul *= LATE_KICK_MULTIPLIER + (r.jockey?.stats.vigor ?? 50) * VIGOR_BONUS_FACTOR;
  }

  if (r.runningStyle === "E" && pace && pace.leaderPos - r.position > FRONT_RUNNER_PACE_THRESHOLD) {
    styleMul *= FRONT_RUNNER_STYLE_PENALTY;
  }

  if (
    pace &&
    pace.pacePressure > 0 &&
    r.runningStyle === "S" &&
    progress > STALKER_PACE_PRESSURE_THRESHOLD
  ) {
    styleMul *= 1 + PACE_PRESSURE_STYLE_BONUS * pace.pacePressure;
  }

  return styleMul;
}

/**
 * Calculate draft multiplier based on drafting status and tactics.
 * @param r
 * @param progress
 * @returns The draft multiplier to apply to the runner.
 */
function calculateDraftMultiplier(r: Runner, progress: number): number {
  let draftMul = 1;
  if (r.draftingHorseId && progress < LATE_KICK_PROGRESS_THRESHOLD) {
    draftMul = DRAFT_SPEED_BONUS;
    // "Rail" tactics bonus for drafting
    if (r.tactics === "rail") draftMul *= 1.005;
  }
  return draftMul;
}

/**
 * Apply jockey-specific effects to velocity and stamina.
 * @param r
 * @param progress
 * @param radius
 * @param arcFactor
 * @param dt
 * @param staminaMul
 * @returns The final distance step and updated stamina multiplier.
 */
function applyJockeyEffects(
  r: Runner,
  progress: number,
  radius: number,
  arcFactor: number,
  dt: number,
  staminaMul: number,
): { finalDs: number; staminaMul: number } {
  let finalDs = r.velocity * dt;
  let updatedStaminaMul = staminaMul;

  if (r.jockey) {
    const stats = r.jockey.stats;
    const arch = r.jockey.archetype;

    if (progress < GATE_SKILL_PROGRESS_THRESHOLD) {
      r.velocity += (stats.gateSkill / 100) * GATE_SKILL_VELOCITY_BONUS * dt;
    }

    if (radius !== Infinity) {
      const positioningBonus = (stats.positioning / 100) * POSITIONING_BONUS_TURN;
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

    if (isMatched && progress > MATCHED_ARCHETYPE_PROGRESS_THRESHOLD) {
      updatedStaminaMul *= 1 + (stats.pacing / 100) * PACING_STAMINA_BONUS_FACTOR * 100;
    }

    if (
      arch === "front_runner" &&
      r.runningStyle === "S" &&
      progress < MATCHED_ARCHETYPE_PROGRESS_THRESHOLD
    ) {
      r.velocity += FRONT_RUNNER_STALKER_MISMATCH_VELOCITY_BONUS * dt;
      updatedStaminaMul *= FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY;
    }

    if (progress > VIGOR_PROGRESS_THRESHOLD) {
      let vigorBoost = (stats.vigor / 100) * VIGOR_BOOST_FACTOR * 100;
      // "Late Kick" tactic bonus
      if (r.tactics === "late_kick" && progress > LATE_KICK_BOOST_THRESHOLD) {
        vigorBoost *= LATE_KICK_VIGOR_MULTIPLIER;
      }
      r.velocity += vigorBoost * dt;
    }
  } else {
    finalDs = (r.velocity * dt) / arcFactor;
  }

  return { finalDs, staminaMul: updatedStaminaMul };
}

/**
 * Find blocking horse and apply velocity penalty if blocked.
 * @param r
 * @param sortedField
 * @returns void
 */
function applyBlockingEffect(r: Runner, sortedField?: Runner[]): void {
  const blockingHorse = (sortedField || []).find(
    (other) =>
      other.horseId !== r.horseId &&
      other.finishTime === null &&
      other.position > r.position &&
      other.position - r.position < 1.5 &&
      Math.abs(other.lane - r.lane) < 0.4,
  );
  if (blockingHorse) {
    r.velocity = Math.min(r.velocity, blockingHorse.velocity * 0.98);
  }
}

/**
 * Find the horse that this runner is drafting behind.
 * @param r
 * @param sortedField
 * @returns The ID of the horse being drafted, or null if not drafting.
 */
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

/**
 * Get the track section at a specific position.
 * @param pos
 * @param distance
 * @param course
 * @returns The track section at the given position, or null if not found.
 */
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

  // Calculate and update lane position
  const targetLane = calculateTargetLane(r, progress, sortedField, pace);
  updateLanePosition(r, targetLane, dt);

  // Calculate track geometry modifiers
  const { turnSpeedMul, gradientSpeedMul, gradientStaminaMul, arcFactor, radius } =
    calculateTrackGeometryModifiers(r, r.position, distance, course);

  // Calculate stamina multiplier
  let staminaMul = calculateStaminaMultiplier(r, progress, distance, pace, rng, dt);

  // Calculate style multiplier
  const styleMul = calculateStyleMultiplier(r, progress, pace, course);

  // Calculate draft multiplier
  const draftMul = calculateDraftMultiplier(r, progress);

  // Apply gradient stamina modifier
  staminaMul *= gradientStaminaMul;

  // Calculate target speed
  const targetSpeed =
    r.topSpeed *
    staminaMul *
    styleMul *
    draftMul *
    turnSpeedMul *
    gradientSpeedMul *
    (1 + (rng.next() - 0.5) * 0.08 * r.noise);

  // Update velocity towards target
  const diff = targetSpeed - r.velocity;
  r.velocity += Math.sign(diff) * Math.min(Math.abs(diff), r.accel * dt);

  // Apply jockey effects and get final distance step
  const { finalDs, staminaMul: updatedStaminaMul } = applyJockeyEffects(
    r,
    progress,
    radius,
    arcFactor,
    dt,
    staminaMul,
  );
  staminaMul = updatedStaminaMul;

  // Tactical AI Integration (Throttle to ~1Hz)
  if (Math.floor(t / 1.0) !== Math.floor((t - dt) / 1.0) && pace) {
    const tactical = calculateTacticalAdjustment(r, pace, sortedField || []);
    r.velocity *= 1 + (tactical.velocityMod - 1) * dt;
    r.lane += (tactical.targetLane - r.lane) * 0.1 * dt;
  }

  // Apply blocking effect
  applyBlockingEffect(r, sortedField);

  // Update position
  r.position += finalDs;

  // Check for finish
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
