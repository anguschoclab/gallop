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
import type { CourseSpecification, TrackSection } from "@/data/tracks";
import type { Rng } from "@/core/common/types";
import { clamp } from "@/lib/math";
import type { RaceSnapshot } from "./raceSnapshotTypes";
import { calculateTacticalAdjustment } from "./tacticalAI";
import { type Runner, type PaceContext, paceShapeMul } from "./runnerBuilder";

// Standardizing imports for relocated file
import type { Race as RaceT } from "@/game/types";

/**
 * Computes the pace context for the race based on the current positions and velocities of all runners.
 * Identifies the leader, lead group size, pace pressure, and overall race progress.
 *
 * @param {Runner[]} runners - All runners currently in the race.
 * @param {number} distance - Total race distance in meters.
 * @returns {PaceContext} The computed pace context.
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

// Deceleration / stamina constants
const DECEL_FACTOR = 0.35; // deceleration is 35% as fast as acceleration
const LATE_KICK_TOP_SPEED_MULTIPLIER = 1.04; // late kick can briefly exceed base topSpeed
const MIN_BLOCK_GAP = 0.8; // min position gap (m) before blocking penalty applies
const INSIDE_OVERTAKE_DENSITY_ADVANTAGE = 1; // prefer inside lane when it has this many fewer runners

/**
 * Calculates the target lane for a runner based on their running style, chosen tactics, and current race congestion.
 *
 * @param {Runner} r - The runner to calculate the target lane for.
 * @param {number} progress - The current progress of the race (0 to 1).
 * @param {Runner[]} [sortedField] - The list of all runners sorted by position (for spatial awareness).
 * @param {PaceContext} [pace] - The current pace context of the race.
 * @returns {number} The calculated target lane index.
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
      if (laneGap < LANE_GAP_THRESHOLD && gap >= MIN_BLOCK_GAP) {
        // Prefer inside line when it is less congested (A1)
        const insideDensity = laneIdx > 0 ? (pace.laneDensity[laneIdx - 1] ?? 0) : Infinity;
        const outsideDensity = pace.laneDensity[laneIdx + 1] ?? 0;
        if (laneIdx > 0 && insideDensity + INSIDE_OVERTAKE_DENSITY_ADVANTAGE <= outsideDensity) {
          targetLane = laneIdx - 1;
        } else {
          targetLane = Math.min(10, laneIdx + 1);
        }
        break;
      }
    }
  }
  return targetLane;
}

/**
 * Updates the runner's lane position incrementally towards their target lane.
 * Respects maximum lateral speed and time delta for smooth transitions.
 *
 * @param {Runner} r - The runner whose lane position is being updated.
 * @param {number} targetLane - The target lane index.
 * @param {number} dt - The time delta in seconds.
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
 * Calculates track geometry modifiers including gradient effects and turn physics.
 * Turn effects consider centrifugal pressure, horse agility, and jockey skill.
 *
 * @param {Runner} r - The runner to calculate modifiers for.
 * @param {number} position - The current position of the runner on the track.
 * @param {number} distance - The total race distance.
 * @param {CourseSpecification} [course] - The track course specification.
 * @returns {Object} Modifiers for speed, stamina, and track arc factors.
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
 * Calculates the stamina multiplier based on race progress, drafting benefits, pace pressure, and horse-specific health risks (bleeder/roarer).
 *
 * @param {Runner} r - The runner to calculate the stamina multiplier for.
 * @param {number} progress - The current race progress (0 to 1).
 * @param {number} distance - The total race distance.
 * @param {PaceContext} [pace] - The current pace context.
 * @param {{ next: () => number } | Rng} [rng] - Random number generator for risk checks.
 * @param {number} [dt] - Time delta in seconds.
 * @returns {number} The calculated stamina multiplier.
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
    const linearFade = (progress - STAMINA_FADE_START) / STAMINA_FADE_DURATION;
    const fade = linearFade * linearFade * (3 - 2 * linearFade);
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
 * Calculates the running style multiplier based on the runner's preferred style and the track's layout (e.g., straight length).
 * Jockeys may provide additional style-specific bonuses or penalties.
 *
 * @param {Runner} r - The runner to calculate the style multiplier for.
 * @param {number} progress - The current race progress (0 to 1).
 * @param {PaceContext} [pace] - The current pace context.
 * @param {CourseSpecification} [course] - The track course specification.
 * @returns {number} The calculated style multiplier.
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
 * Calculates the draft multiplier for a runner if they are currently drafting behind another horse.
 *
 * @param {Runner} r - The runner to calculate the draft multiplier for.
 * @param {number} progress - The current race progress (0 to 1).
 * @returns {number} The draft multiplier.
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
 * Applies jockey-specific effects to a runner's velocity and stamina.
 * Considers archetype matching, specific traits, and physical performance bonuses (e.g., gate skill, vigor).
 *
 * @param {Runner} r - The runner to apply jockey effects to.
 * @param {number} progress - The current race progress (0 to 1).
 * @param {number} radius - The turn radius at the current position.
 * @param {number} arcFactor - The track arc factor.
 * @param {number} dt - The time delta in seconds.
 * @param {number} staminaMul - The current stamina multiplier.
 * @returns {Object} Final distance step and updated stamina multiplier.
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
      const speedCap =
        r.tactics === "late_kick" ? r.topSpeed * LATE_KICK_TOP_SPEED_MULTIPLIER : r.topSpeed;
      r.velocity = Math.min(r.velocity + vigorBoost * dt, speedCap);
    }
  } else {
    finalDs = (r.velocity * dt) / arcFactor;
  }

  return { finalDs, staminaMul: updatedStaminaMul };
}

/**
 * Applies a velocity penalty if the runner is currently being blocked by another horse directly in front of them.
 *
 * @param {Runner} r - The runner being checked for blocking.
 * @param {Runner[]} [sortedField] - The list of runners sorted by position.
 */
function applyBlockingEffect(r: Runner, sortedField?: Runner[]): void {
  const blockingHorse = (sortedField || []).find(
    (other) =>
      other.horseId !== r.horseId &&
      other.finishTime === null &&
      other.position - r.position >= MIN_BLOCK_GAP &&
      other.position - r.position < 1.5 &&
      Math.abs(other.lane - r.lane) < 0.4,
  );
  if (blockingHorse) {
    r.velocity = Math.min(r.velocity, blockingHorse.velocity * 0.98);
  }
}

/**
 * Identifies the horse that the current runner is drafting behind, if any.
 *
 * @param {Runner} r - The runner checking for drafting opportunities.
 * @param {Runner[]} sortedField - The list of runners sorted by position.
 * @returns {string | null} The ID of the drafted horse, or null if not drafting.
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
 * Retrieves the track section data for a given position on the course.
 *
 * @param {number} pos - The position on the track.
 * @param {number} distance - The total race distance.
 * @param {CourseSpecification} [course] - The track course specification.
 * @returns {TrackSection | null} The track section at the given position.
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
 * Simulates a single time step for a runner, updating their physical and tactical state.
 * Handles position updates, velocity adjustments towards target speed, lane changes, and finish line detection.
 *
 * @param {Runner} r - The runner to update.
 * @param {number} dt - The time step in seconds.
 * @param {number} t - The current simulation time in seconds.
 * @param {number} distance - The total race distance.
 * @param {{ next: () => number } | Rng} rng - Random number generator for variance.
 * @param {Runner[]} [sortedField] - The list of all runners sorted by position.
 * @param {PaceContext} [pace] - The current pace context.
 * @param {CourseSpecification} [course] - The track course specification.
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

  // Update velocity towards target (deceleration is slower than acceleration)
  const diff = targetSpeed - r.velocity;
  const rateLimit = diff < 0 ? r.accel * DECEL_FACTOR * dt : r.accel * dt;
  r.velocity += Math.sign(diff) * Math.min(Math.abs(diff), rateLimit);

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
 * Runs a full race simulation until all runners have finished or the maximum time is reached.
 * Returns final rankings, finish times, and optional replay snapshots.
 *
 * @param {Runner[]} runners - All runners participating in the race.
 * @param {number} distance - Total race distance in meters.
 * @param {Rng} rng - Seeded random number generator for simulation variance.
 * @param {number} [dt=0.1] - Time step per simulation tick in seconds.
 * @param {number} [maxTime=600] - Maximum simulation duration in seconds.
 * @param {CourseSpecification} [course] - Track geometry and surface specifications.
 * @param {boolean} [recordSnapshots=false] - Whether to record per-tick snapshots for replay visualization.
 * @returns {Object} Final race results and optional snapshots.
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
