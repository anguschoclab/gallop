/**
 * simulation.ts - Race simulation engine (orchestrator)
 *
 * This file orchestrates the race simulation by composing extracted modules:
 * paceContext, lateralMovement, trackGeometry, trackGeometryModifiers,
 * staminaFade, styleEffects, jockeyEffects, windEffects.
 * Contains stepRunner and runRaceToCompletion.
 *
 * Dependencies: @/game/types, @/data/tracks, @/core/common/types, @/core/common/math, ./raceSnapshotTypes, ./tacticalAI, ./runnerBuilder, ./runningStyleProfiles, ./draftingAI, ./paceContext, ./lateralMovement, ./trackGeometry, ./trackGeometryModifiers, ./staminaFade, ./styleEffects, ./jockeyEffects, ./windEffects
 * Related files: runnerBuilder.ts, tacticalAI.ts, draftingAI.ts
 */

import type { CourseSpecification } from "@/data/tracks";
import type { Rng } from "@/core/common/types";
import { clamp } from "@/core/common/math";
import { compareFinishOrder } from "./compareFinishOrder";
import type { RaceSnapshot, PaceSnapshot } from "./raceSnapshotTypes";
import { calculateTacticalAdjustment } from "./tacticalAI";
import { calculateCoverModifier } from "./draftingAI";
import { type Runner, type PaceContext } from "./runnerBuilder";
import {
  getDynamicProfile,
  getRunningStyleProfile,
  POSITION_SEEK_PROGRESS,
  SPURT_BUILDUP_START_M,
  SPURT_BUILDUP_END_M,
  SPURT_BUILDUP_PEAK,
} from "./runningStyleProfiles";
import { DECEL_FACTOR } from "@/constants/raceEngineConstants";
import { computePaceContext } from "./paceContext";
import { calculateTargetLane, updateLanePosition } from "./lateralMovement";
import { getSectionAndProgress } from "./trackGeometry";
import { calculateTrackGeometryModifiers } from "./trackGeometryModifiers";
import { calculateStaminaMultiplier } from "./staminaFade";
import { calculateStyleMultiplier } from "./styleEffects";
import {
  calculateDraftMultiplier,
  applyJockeyEffects,
  applyBlockingEffect,
  getDraftingHorseId,
} from "./jockeyEffects";
import { calculateWindEffect } from "./windEffects";

export { computePaceContext } from "./paceContext";
export { calculateWindEffect } from "./windEffects";

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
 * @param {number} [fieldSize] - Total number of runners in the race (for big_match_temperament).
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
  fieldSize?: number,
) {
  if (r.finishTime !== null) return;
  const progress = r.position / distance;

  // Optimize drafting lookup using sortedField
  r.draftingHorseId = sortedField ? getDraftingHorseId(r, sortedField) : null;

  // Calculate and update lane position
  const targetLane = calculateTargetLane(r, progress, sortedField, pace);
  updateLanePosition(r, targetLane, dt);

  // Calculate track geometry modifiers
  const { turnSpeedMul, gradientSpeedMul, gradientStaminaMul, arcFactor, radius, traitSurfaceMul } =
    calculateTrackGeometryModifiers(r, r.position, distance, course);

  // Calculate stamina multiplier
  let staminaMul = calculateStaminaMultiplier(r, progress, distance, pace, rng, dt);

  // Calculate style multiplier
  const styleMul = calculateStyleMultiplier(r, progress, pace, course, distance);

  // Calculate draft multiplier
  const draftMul = calculateDraftMultiplier(r, progress);

  // Calculate cover modifier (conserve energy with cover, improve without)
  const coverMul = sortedField ? calculateCoverModifier(r, sortedField) : 1.0;

  // Apply gradient stamina modifier
  staminaMul *= gradientStaminaMul;

  // Early-race position seeking: in the first ~15% of the race, nudge each
  // runner toward the field slot that matches their running style instead of
  // letting front-runners dash far ahead when the rest of the field starts slow.
  let seekMul = 1;
  const profile = getDynamicProfile(
    r.runningStyle,
    pace?.paceRating ?? 1.0,
    sortedField ? sortedField.length : 1,
    progress,
    r.horse,
    r.jockey,
  );
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
    coverMul *
    turnSpeedMul *
    gradientSpeedMul *
    traitSurfaceMul *
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
    fieldSize,
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
  paceSnapshots: PaceSnapshot[];
} {
  let t = 0;
  const snapshots: RaceSnapshot[] = [];
  const paceSnapshots: PaceSnapshot[] = [];
  const paceMilestones = [0.25, 0.5, 0.75];
  let nextMilestoneIdx = 0;
  const numRunners = runners.length;
  let finishedCount = 0;

  // Initialize finishedCount in case some runners start finished (unlikely but safe)
  for (const r of runners) {
    if (r.finishTime !== null) finishedCount++;
  }

  const laneDensity = new Array(12).fill(0);

  while (finishedCount < numRunners && t < maxTime) {
    const pace = computePaceContext(runners, distance, laneDensity);

    // Capture pace snapshot at 25/50/75% progress milestones
    if (
      nextMilestoneIdx < paceMilestones.length &&
      pace.progress >= paceMilestones[nextMilestoneIdx]
    ) {
      const leader = runners.reduce(
        (best, r) => {
          if (r.finishTime !== null) return best;
          if (best === null || r.position > best.position) return r;
          return best;
        },
        null as Runner | null,
      );
      paceSnapshots.push({
        progress: paceMilestones[nextMilestoneIdx],
        paceRating: pace.paceRating,
        leaderVelocity: pace.leaderVelocity,
        leadGroupCount: pace.leadGroupCount,
        pacePressure: pace.pacePressure,
        leaderHorseId: leader?.horseId ?? null,
      });
      nextMilestoneIdx++;
    }

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
        numRunners,
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
    .map((r) => ({ horseId: r.horseId, time: r.finishTime ?? Infinity, gate: r.gate }))
    .sort(compareFinishOrder);

  const result = ranked.map((r, idx) => ({
    horseId: r.horseId,
    position: idx + 1,
    time: r.time,
  }));

  return { result, snapshots, paceSnapshots };
}
