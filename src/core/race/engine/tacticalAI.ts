import { clamp } from "@/core/common/math";
import type { Runner, PaceContext } from "./runnerBuilder";

/**
 * tacticalAI.ts - NPC Jockey tactical adjustments
 *
 * This file provides tactical AI for NPC jockeys during races, including
 * pace sensing, lane management, traffic avoidance, and tactic-specific behavior.
 *
 * Dependencies: @/game/math (clamp), ./runnerBuilder (Runner, PaceContext)
 * Related files: simulation.ts (uses tactical adjustments during race steps)
 */

/**
 * Calculate tactical adjustment for a runner.
 *
 * NPC jockeys adjust velocity and target lane based on pace, traffic, and
 * assigned tactics. Higher-skilled jockeys make better tactical decisions.
 *
 * @param runner - The runner to calculate adjustments for
 * @param pace - Current pace context
 * @param runners - All runners in the race
 * @returns Velocity modifier and target lane adjustment
 *
 * @example
 * const tactical = calculateTacticalAdjustment(runner, pace, runners);
 */
export function calculateTacticalAdjustment(
  runner: Runner,
  pace: PaceContext,
  runners: Runner[],
): { velocityMod: number; targetLane: number } {
  const jockey = runner.jockey;
  // If no jockey, just follow basic physics
  if (!jockey) return { velocityMod: 1.0, targetLane: runner.lane };

  const skill = (jockey.stats.pacing + jockey.stats.positioning) / 200; // 0 to 1
  const progress = runner.position / (pace.leaderPos || 1);

  let velocityMod = 1.0;
  let targetLane = runner.lane;

  // 1. Pace Sensing
  // If pace is too hot, closers/pressers should save energy
  if (pace.paceRating > 1.05 && (runner.runningStyle === "S" || runner.runningStyle === "P")) {
    if (progress < 0.6) {
      velocityMod -= 0.02 * skill * (pace.paceRating - 1);
    }
  }

  // If pace is too slow, front runners might try to "steal" it
  // Enhanced: stamina-aware — don't steal if staminaFactor < 0.7
  if (pace.paceRating < 0.92 && (runner.runningStyle === "E" || runner.runningStyle === "EP")) {
    if (progress < 0.7) {
      const staminaFactor = runner.staminaFactor ?? 1;
      const staminaScale = staminaFactor < 0.7 ? staminaFactor / 0.7 : 1;
      velocityMod += 0.015 * skill * (1 - pace.paceRating) * staminaScale;
    }
  }

  // Enhanced: closers detecting very slow pace should not drop further back
  // — switch targetLane to midpack instead of rail
  if (pace.paceRating < 0.88 && runner.runningStyle === "S" && progress < 0.6) {
    targetLane = 1.2; // Midpack lane
  }

  // 2. Weather-aware tactics
  // Horses with low mud aptitude (< 0.5) in heavy/soft/yielding conditions save energy early
  const trackCondition = runner.trackCondition;
  if (
    trackCondition &&
    (trackCondition === "heavy" || trackCondition === "soft" || trackCondition === "yielding")
  ) {
    const mudAptitude = runner.horse?.mudAptitude ?? 1.0;
    if (mudAptitude < 0.5 && progress < 0.6) {
      velocityMod -= (0.5 - mudAptitude) * 0.04 * skill;
    }
  }

  // 3. Stamina-state awareness
  // If staminaFactor < 0.6, reduce velocity to preserve energy for late kick
  const staminaFactor = runner.staminaFactor ?? 1;
  if (staminaFactor < 0.6 && progress < 0.7) {
    velocityMod -= (0.6 - staminaFactor) * 0.05 * skill;
  }

  // 4. Competitive intelligence (rival awareness)
  // When a rival horse is within 2 lengths (~6m), apply aggressiveness boost
  // scaled by jockey pacing skill
  const rivalHorseIds = runner.rivalHorseIds;
  if (rivalHorseIds && rivalHorseIds.length > 0) {
    let nearbyRivalFound = false;
    // runners is sorted descending by position
    for (let i = 0; i < runners.length; i++) {
      const r = runners[i];
      if (r.position < runner.position - 6) break; // Optimization: runners too far behind

      if (
        r.horseId !== runner.horseId &&
        rivalHorseIds.includes(r.horseId) &&
        r.finishTime === null &&
        Math.abs(r.position - runner.position) < 6
      ) {
        nearbyRivalFound = true;
        break;
      }
    }

    if (nearbyRivalFound) {
      const pacingSkill = jockey.stats.pacing / 100;
      velocityMod += 0.02 * pacingSkill;
    }
  }

  // 5. Lane Management & Traffic
  // Check for traffic directly in front and clustered ahead
  let horsesInFrontCount = 0;
  let clusteredAheadCount = 0;

  // runners is sorted descending by position
  for (let i = 0; i < runners.length; i++) {
    const r = runners[i];

    // Break early if we've reached runners at or behind our position
    // We only care about horses in front of us
    if (r.position <= runner.position) break;

    if (r.horseId !== runner.horseId && r.finishTime === null) {
      const posDiff = r.position - runner.position;
      const laneDiff = Math.abs(r.lane - runner.lane);

      // We only care about runners within 6m and in the same lane roughly
      if (posDiff < 6 && laneDiff < 0.5) {
        if (posDiff < 3) {
          horsesInFrontCount++;
        } else {
          clusteredAheadCount++;
        }
      }
    }
  }

  if (horsesInFrontCount > 0) {
    // Boxed in! Try to switch lanes if skilled
    if (skill > 0.4) {
      targetLane = findBestLane(runner, pace.laneDensity);
    }
  } else if (jockey.stats.positioning >= 40 && clusteredAheadCount >= 2) {
    // Enhanced: Traffic prediction — scan for 2-3 horses ahead within 6m in same lane
    // If ≥2 horses clustered ahead, preemptively switch to findBestLane
    // Low-skill jockeys (positioning < 40) don't predict
    targetLane = findBestLane(runner, pace.laneDensity);
  }

  // 6. Jockey Instruction Specifics
  if (
    runner.jockeyInstructions?.ridingStyle === "closer" &&
    runner.jockeyInstructions?.moveTiming === "late"
  ) {
    // Prioritize drafting and staying on rail (save energy)
    velocityMod *= 0.995;
    // Don't override if we already set midpack for slow pace
    if (!(pace.paceRating < 0.88 && runner.runningStyle === "S" && progress < 0.6)) {
      targetLane = 0;
    }
  }

  if (runner.jockeyInstructions?.earlyPosition === "lead" && pace.leaderPos - runner.position < 1) {
    // Fight for the lead
    velocityMod += 0.01 * skill;
  }

  return { velocityMod, targetLane };
}

function findBestLane(runner: Runner, density: number[]): number {
  const currentIdx = Math.floor(runner.lane / 1.2);
  let bestIdx = currentIdx;
  let minDensity = density[currentIdx] || 0;

  // Check adjacent lanes
  for (let i = -1; i <= 1; i++) {
    const idx = currentIdx + i;
    if (idx >= 0 && idx < density.length) {
      if (density[idx] < minDensity) {
        minDensity = density[idx];
        bestIdx = idx;
      }
    }
  }

  return bestIdx * 1.2;
}
