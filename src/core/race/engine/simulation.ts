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
import { clamp } from "@/core/common/math";
import type { RaceSnapshot } from "./raceSnapshotTypes";
import { calculateTacticalAdjustment } from "./tacticalAI";
import { type Runner, type PaceContext, paceShapeMul } from "./runnerBuilder";
import {
  getRunningStyleProfile,
  POSITION_SEEK_PROGRESS,
  SPURT_BUILDUP_START_M,
  SPURT_BUILDUP_END_M,
  SPURT_BUILDUP_PEAK,
} from "./runningStyleProfiles";
import {
  BLEEDER_RISK_PER_SEC,
  ROANER_RISK_PER_SEC,
  BLEEDER_DISTANCE_THRESHOLD,
  BLEEDER_PROGRESS_THRESHOLD,
  BLEEDER_STAMINA_PENALTY,
  ROANER_SPEED_THRESHOLD,
  ROANER_STAMINA_PENALTY,
  SAVE_TACTICS_PROGRESS_THRESHOLD,
  SAVE_TACTICS_STAMINA_BONUS,
  EARLY_SPEED_PENALTY_THRESHOLD,
  EARLY_SPEED_LANE_THRESHOLD,
  EARLY_SPEED_STAMINA_PENALTY,
  PACE_PRESSURE_STAMINA_PENALTY,
  STAMINA_FADE_START,
  STAMINA_FADE_DURATION,
  DRAFT_STAMINA_PRESERVE,
  DRAFT_DISTANCE,
  DRAFT_SPEED_BONUS,
  LANE_WIDTH,
  MAX_LATERAL_SPEED,
  LANE_GAP_THRESHOLD,
  POSITION_GAP_THRESHOLD,
  LATERAL_DIFF_THRESHOLD,
  STALKER_PROGRESS_THRESHOLD,
  OUTSIDE_PROGRESS_THRESHOLD,
  LEAD_PROGRESS_THRESHOLD,
  CONGESTED_LANE_PROGRESS_THRESHOLD,
  CONGESTED_LANE_DENSITY_THRESHOLD,
  LANE_POSITION_GAP_THRESHOLD,
  AGILITY_MITIGATION_FACTOR,
  POSITIONING_SKILL_FACTOR,
  BULLRING_TRAIT_BONUS,
  MAX_TURN_PENALTY,
  SHORT_STRAIGHT_THRESHOLD,
  LONG_STRAIGHT_THRESHOLD,
  FRONT_RUNNER_PROGRESS_THRESHOLD,
  CLOSER_PROGRESS_THRESHOLD,
  LATE_KICK_PROGRESS_THRESHOLD,
  LATE_KICK_BOOST_THRESHOLD,
  FRONT_RUNNER_BONUS,
  CLOSER_BONUS,
  FRONT_RUNNER_STYLE_MULTIPLIER,
  CLOSER_STYLE_MULTIPLIER,
  LATE_KICK_MULTIPLIER,
  POSITIONING_BONUS_FACTOR,
  PACING_BONUS_FACTOR,
  VIGOR_BONUS_FACTOR,
  LONG_STRAIGHT_VIGOR_THRESHOLD,
  LONG_STRAIGHT_VIGOR_FACTOR,
  PACE_PRESSURE_STYLE_BONUS,
  STALKER_PACE_PRESSURE_THRESHOLD,
  FRONT_RUNNER_PACE_THRESHOLD,
  FRONT_RUNNER_STYLE_PENALTY,
  POSITIONING_BONUS_TURN,
  MATCHED_ARCHETYPE_PROGRESS_THRESHOLD,
  PACING_STAMINA_BONUS_FACTOR,
  FRONT_RUNNER_STALKER_MISMATCH_VELOCITY_BONUS,
  FRONT_RUNNER_STALKER_MISMATCH_STAMINA_PENALTY,
  VIGOR_BOOST_FACTOR,
  VIGOR_PROGRESS_THRESHOLD,
  LATE_KICK_VIGOR_MULTIPLIER,
  GATE_SKILL_VELOCITY_BONUS,
  GATE_SKILL_PROGRESS_THRESHOLD,
  DECEL_FACTOR,
  LATE_KICK_TOP_SPEED_MULTIPLIER,
  MIN_BLOCK_GAP,
  INSIDE_OVERTAKE_DENSITY_ADVANTAGE,
  WIND_EFFECT_SCALE,
  SPRINTER_WIND_MULTIPLIER,
  MAX_WIND_SPEED_MOD,
  MIN_WIND_SPEED_MOD,
  HEADWIND_STAMINA_PENALTY,
  TAILWIND_STAMINA_RELIEF,
} from "./constants";

// Standardizing imports for relocated file
import type { Race as RaceT } from "@/game/types";

/**
 * Computes the pace context for the race based on the current positions and velocities of all runners.
 * Identifies the leader, lead group size, pace pressure, and overall race progress.
 *
 * @param {Runner[]} runners - All runners currently in the race.
 * @param {number} distance - Total race distance in meters.
 * @param laneDensityBuffer
 * @returns {PaceContext} The computed pace context.
 */
export function computePaceContext(
  runners: Runner[],
  distance: number,
  laneDensityBuffer?: number[],
): PaceContext {
  let leaderPos = 0;
  let leaderVelocity = 0;
  let totalProgress = 0;
  let alive = 0;
  const laneDensity = laneDensityBuffer ?? new Array(12).fill(0);
  if (laneDensityBuffer) {
    laneDensityBuffer.fill(0);
  }

  // Find leader first (needed for lead group calculation)
  for (const r of runners) {
    if (r.finishTime === null && r.position > leaderPos) {
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

  // Jockey instructions-based lane bias
  if (r.jockeyInstructions?.ridingStyle === "front_runner") targetLane = 0;
  if (r.jockeyInstructions?.ridingStyle === "closer" && progress < OUTSIDE_PROGRESS_THRESHOLD)
    targetLane = 2;
  if (r.jockeyInstructions?.earlyPosition === "lead" && progress < LEAD_PROGRESS_THRESHOLD)
    targetLane = 0;

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
      // dt-invariant per-second hazard: pTick = 1 - (1 - perSecRate)^dt
      const bleederRatePerSec = bleederRisk * BLEEDER_RISK_PER_SEC;
      const pTickBleeder = Math.min(1, 1 - Math.pow(1 - bleederRatePerSec, dt));
      if (rng.next() < pTickBleeder) {
        effectiveStamina = clamp(effectiveStamina - BLEEDER_STAMINA_PENALTY, 0.1, 1);
      }
    }
    const roanerRisk = r.horse.roarerRisk ?? 0;
    if (roanerRisk > 0 && r.velocity > r.topSpeed * ROANER_SPEED_THRESHOLD && rng && dt) {
      // dt-invariant per-second hazard
      const roanerRatePerSec = roanerRisk * ROANER_RISK_PER_SEC;
      const pTickRoaner = Math.min(1, 1 - Math.pow(1 - roanerRatePerSec, dt));
      if (rng.next() < pTickRoaner) {
        effectiveStamina = clamp(effectiveStamina - ROANER_STAMINA_PENALTY, 0.1, 1);
      }
    }

    // "Save" tactics preservation (closer with late move timing)
    if (
      r.jockeyInstructions?.ridingStyle === "closer" &&
      r.jockeyInstructions?.moveTiming === "late" &&
      progress < SAVE_TACTICS_PROGRESS_THRESHOLD
    ) {
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
  if (r.jockeyInstructions?.moveTiming === "late" && progress > LATE_KICK_PROGRESS_THRESHOLD) {
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
    // "Rail" tactics bonus for drafting (front runners hug rail)
    if (r.jockeyInstructions?.ridingStyle === "front_runner") draftMul *= 1.005;
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
      updatedStaminaMul *= 1 + (stats.pacing / 100) * PACING_STAMINA_BONUS_FACTOR;
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
      let vigorBoost = (stats.vigor / 100) * VIGOR_BOOST_FACTOR;
      // "Late Kick" tactic bonus
      if (r.jockeyInstructions?.moveTiming === "late" && progress > LATE_KICK_BOOST_THRESHOLD) {
        vigorBoost *= LATE_KICK_VIGOR_MULTIPLIER;
      }
      const speedCap =
        r.jockeyInstructions?.moveTiming === "late"
          ? r.topSpeed * LATE_KICK_TOP_SPEED_MULTIPLIER
          : r.topSpeed;
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
 * Retrieves the track section and progress within it for a given position.
 *
 * @param pos - Current position along the track in metres.
 * @param distance - Total race distance in metres.
 * @param course - Optional track geometry specification.
 */
function getSectionAndProgress(
  pos: number,
  distance: number,
  course?: CourseSpecification,
): { section: TrackSection | null; posWithinSection: number } {
  if (!course || !course.sections || course.sections.length === 0) {
    return { section: null, posWithinSection: 0 };
  }
  const circ = course.circumference;
  const startOffset = (circ - (distance % circ)) % circ;
  const trackPos = (startOffset + pos) % circ;
  let currentPos = 0;
  for (const section of course.sections) {
    if (trackPos >= currentPos && trackPos < currentPos + section.length) {
      return { section, posWithinSection: (trackPos - currentPos) / section.length };
    }
    currentPos += section.length;
  }
  return { section: course.sections[0], posWithinSection: 0 };
}

/**
 * Get the interpolated orientation of a section at a given progress through it.
 *
 * @param section - The track section (null if unknown).
 * @param posWithinSection - Progress through the section (0-1).
 */
function getSectionOrientation(
  section: TrackSection | null,
  posWithinSection: number,
): number | null {
  if (!section) return null;
  if (section.type === "straight" && section.orientationDeg !== undefined) {
    return section.orientationDeg;
  }
  if (
    section.type === "turn" &&
    section.entryOrientationDeg !== undefined &&
    section.exitOrientationDeg !== undefined
  ) {
    let diff = section.exitOrientationDeg - section.entryOrientationDeg;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return section.entryOrientationDeg + diff * posWithinSection;
  }
  return null;
}

/**
 * Calculate wind effect on a runner based on section orientation and wind direction.
 * Exported for unit testing.
 *
 * @param r - The runner to calculate wind effect for.
 * @param course - Track geometry specification (optional).
 * @param windKph - Wind speed in kilometres per hour (optional).
 * @param windDirectionDeg - Wind direction in degrees (optional).
 * @param section - Current track section (null if unknown).
 * @param posWithinSection - Progress through the section (0-1).
 */
export function calculateWindEffect(
  r: Runner,
  course: CourseSpecification | undefined,
  windKph: number | undefined,
  windDirectionDeg: number | undefined,
  section: TrackSection | null,
  posWithinSection: number,
): { speedMod: number; staminaMod: number } {
  if (typeof windKph !== "number" || typeof windDirectionDeg !== "number" || !section) {
    return { speedMod: 1, staminaMod: 1 };
  }

  const sectionOrientation = getSectionOrientation(section, posWithinSection);
  if (sectionOrientation === null) {
    return { speedMod: 1, staminaMod: 1 };
  }

  // Meteorological convention: windDirectionDeg is where the wind is COMING FROM.
  // cos(section - windDirection) → 1 = full headwind, -1 = full tailwind
  const windComponent = Math.cos(((sectionOrientation - windDirectionDeg) * Math.PI) / 180);

  const baseEffect = windKph / WIND_EFFECT_SCALE;

  const isSprinter = r.topSpeed > 18;
  const isLongStraight =
    section.type === "straight" && (course?.straightLength ?? 0) > LONG_STRAIGHT_THRESHOLD;
  const sprinterMul = isSprinter && isLongStraight ? SPRINTER_WIND_MULTIPLIER : 1.0;

  let speedMod = 1 - baseEffect * windComponent * sprinterMul;
  speedMod = Math.max(MIN_WIND_SPEED_MOD, Math.min(MAX_WIND_SPEED_MOD, speedMod));

  let staminaMod = 1;
  if (windComponent > 0.3) {
    staminaMod = HEADWIND_STAMINA_PENALTY;
  } else if (windComponent < -0.3) {
    staminaMod = TAILWIND_STAMINA_RELIEF;
  }

  return { speedMod, staminaMod };
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
 * @param {number} [rankFromFront] - Pre-computed rank from front (avoids O(n) per runner).
 * @param {number} [aliveCount] - Pre-computed alive count (avoids O(n) per runner).
 * @param {number} [windKph] - Wind speed in km/h for drag calculation.
 * @param {number} [windDirectionDeg] - Wind direction in degrees (meteorological).
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
  rankFromFront?: number,
  aliveCount?: number,
  windKph?: number,
  windDirectionDeg?: number,
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

  // Early-race position seeking: in the first ~15% of the race, nudge each
  // runner toward the field slot that matches their running style instead of
  // letting front-runners dash far ahead when the rest of the field starts slow.
  let seekMul = 1;
  const profile = getRunningStyleProfile(r.runningStyle);
  if (progress < POSITION_SEEK_PROGRESS && sortedField && sortedField.length > 1) {
    // Use pre-computed rank if provided (avoids O(n) filter+findIndex per runner)
    let rank = rankFromFront ?? -1;
    let runnerAliveCount = aliveCount ?? sortedField.filter((o) => o.finishTime === null).length;
    if (rank < 0) {
      const aliveField = sortedField.filter((o) => o.finishTime === null);
      runnerAliveCount = aliveField.length;
      rank = aliveField.findIndex((o) => o.horseId === r.horseId);
    }
    if (rank >= 0 && runnerAliveCount > 1) {
      const fieldFraction = rank / (runnerAliveCount - 1);
      const preferred = profile.preferredFieldFraction;
      // Positive delta = horse is further forward than its preferred slot.
      const delta = preferred - fieldFraction;
      // Fade the effect linearly as we leave the opening.
      const phase = 1 - progress / POSITION_SEEK_PROGRESS;
      if (delta < 0) {
        // ahead of preferred slot -> ease off
        seekMul = 1 - Math.min(profile.seekMaxDampen, -delta * profile.seekDampenSlope) * phase;
      } else if (delta > 0) {
        // behind preferred slot -> small push to claim position
        seekMul = 1 + Math.min(profile.seekMaxBoost, delta * profile.seekBoostSlope) * phase;
      }
    }
  }
  r.lastSeekContribution = seekMul - 1;

  // Final-spurt buildup: gradually ramp velocity between 600m and 400m to go,
  // so the closing kick isn't a hard switch at one progress threshold. Closers
  // and stalkers get a slightly stronger ramp.
  let spurtMul = 1;
  const distanceRemaining = distance - r.position;
  if (distanceRemaining <= SPURT_BUILDUP_START_M && distanceRemaining > 0) {
    const ramp = clamp(
      (SPURT_BUILDUP_START_M - distanceRemaining) / (SPURT_BUILDUP_START_M - SPURT_BUILDUP_END_M),
      0,
      1,
    );
    spurtMul = 1 + (SPURT_BUILDUP_PEAK + profile.spurtBuildupExtra) * ramp;
  }
  r.lastSpurtContribution = spurtMul - 1;

  // Orientation-aware wind effect: headwind slows, tailwind speeds, crosswind is neutral.
  const { section, posWithinSection } = getSectionAndProgress(r.position, distance, course);
  const { speedMod: windSpeedMod, staminaMod: windStaminaMod } = calculateWindEffect(
    r,
    course,
    windKph,
    windDirectionDeg,
    section,
    posWithinSection,
  );
  staminaMul *= windStaminaMod;

  // Calculate target speed
  const targetSpeed =
    r.topSpeed *
    staminaMul *
    styleMul *
    draftMul *
    turnSpeedMul *
    gradientSpeedMul *
    seekMul *
    spurtMul *
    windSpeedMod *
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
    r.velocity *= tactical.velocityMod;
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
 * @param windKph
 * @param windDirectionDeg
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
  windKph?: number,
  windDirectionDeg?: number,
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

  const laneDensity = new Array(12).fill(0);

  while (finishedCount < numRunners && t < maxTime) {
    const pace = computePaceContext(runners, distance, laneDensity);

    // Sort runners by position for faster spatial lookups in stepRunner
    const sortedField = [...runners].sort((a, b) => b.position - a.position);

    // Compute rank-from-front once per tick to avoid O(n²) filter+findIndex
    const rankMap = new Map<string, number>();
    let aliveRank = 0;
    for (const o of sortedField) {
      if (o.finishTime === null) {
        rankMap.set(o.horseId, aliveRank);
        aliveRank++;
      }
    }

    for (const r of runners) {
      if (r.finishTime !== null) continue;

      stepRunner(
        r,
        dt,
        t,
        distance,
        rng,
        sortedField,
        pace,
        course,
        rankMap.get(r.horseId),
        aliveRank,
        windKph,
        windDirectionDeg,
      );

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
          seekContribution: r.lastSeekContribution ?? 0,
          spurtContribution: r.lastSpurtContribution ?? 0,
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
